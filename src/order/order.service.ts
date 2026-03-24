import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { WalletService } from '../wallet';
import { randomUUID } from 'crypto';
import {
  OrderStatus,
  PaymentType,
  ShipmentStatus,
  Prisma,
  TransactionStatus,
} from '../generated/prisma/client';
import { ShipmentService } from '../shipment';
import { PaymentService } from '../payment';

type CalculatedOrder = {
  cartItems: any[];
  address: any;
  totalItemsAmount: number;
  shippingCharge: number;
  codFee: number;
  grandTotal: number;
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly shipmentService: ShipmentService,
    private readonly paymentService: PaymentService,
  ) {}

  // Order number generate
  private generateOrderNumber(): string {
    return `ORD-${randomUUID()}`;
  }

  // Validate + Calculate
  private async validateAndCalculate(
    userId: string,
    addressId: string,
    paymentType: PaymentType,
  ): Promise<CalculatedOrder> {
    let totalShippingCharge = 0;
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true, variant: true },
    });

    if (cartItems.length === 0) throw new Error('Cart is empty');

    // Group items by seller
    // const groupedBySeller = cartItems.reduce(
    //   (acc, item) => {
    //     const sellerId = item.product.sellerId;

    //     if (!acc[sellerId]) acc[sellerId] = [];
    //     acc[sellerId].push(item);

    //     return acc;
    //   },
    //   {} as Record<string, typeof cartItems>,
    // );

    const address = await this.prisma.address.findUniqueOrThrow({
      where: { id: addressId, userId },
    });

    for (const item of cartItems) {
      if (item.variant.stockQuantity < item.quantity) {
        throw new UnprocessableEntityException(
          `Insufficient stock for ${item.product.internalName}`,
        );
      }
      if (paymentType === PaymentType.COD) {
        if (!item.product.isPayOnDelivery) {
          throw new UnprocessableEntityException(
            `${item.product.internalName} is not available for COD`,
          );
        }
      }

      if (item.product.isFreeDelivery) {
        totalShippingCharge += 0;
      } else {
        // const charges = Object.keys(groupedBySeller).map(() => 50);
        // totalShippingCharge = charges.reduce((sum, val) => sum + val, 0);
        if (totalShippingCharge < 80) {
          totalShippingCharge += 50;
        }
      }
    }

    // const shippingPromises = Object.keys(groupedBySeller).map(
    //   async (sellerId) => {
    //     const items = groupedBySeller[sellerId];

    //     const seller = await this.prisma.seller.findUnique({
    //       where: { id: sellerId },
    //     });

    //     if (!seller) return 0;

    // const totalWeight = items.reduce(
    //   (sum, item) =>
    //     sum + Number(item.variant?.weight || 0.5) * item.quantity,
    //   0,
    // );
    // const response = await this.shipmentService.getShippingRate({
    //   pickupPincode: seller.postalCode,
    //   deliveryPincode: address.postalCode,
    //   weight: totalWeight,
    //   cod: paymentType === PaymentType.COD,
    // });
    //     return 50;
    //   },
    // );

    const totalItemsAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.variant.sellingPrice) * item.quantity,
      0,
    );

    const codFee = paymentType === PaymentType.COD ? 25 : 0;
    const grandTotal = totalItemsAmount + totalShippingCharge + codFee;

    if (paymentType === PaymentType.WALLET) {
      const wallet = await this.walletService.getWalletByUserId(userId);
      if (Number(wallet.currentBalance) < grandTotal) {
        throw new Error('Insufficient wallet balance');
      }
    }
    return {
      cartItems,
      address,
      grandTotal,
      totalItemsAmount,
      shippingCharge: totalShippingCharge,
      codFee,
    };
  }

  // COD handler
  private async handleCodOrder(
    userId: string,
    addressId: string,
    data: CalculatedOrder,
  ) {
    const order = await this.prisma.$transaction(async (tx) => {
      const order = await this.createOrderInDb(tx, userId, addressId, {
        ...data,
        orderStatus: OrderStatus.PENDING,
        paidAt: null,
      });
      await this.reduceStockAndClearCart(tx, userId, data.cartItems);
      return order;
    });

    await this.createShipmentForOrder(
      order,
      false,
      data.address,
      data.cartItems,
    );

    return {
      order,
      payment: { required: false, type: PaymentType.COD },
    };
  }

  // Wallet handler
  private async handleWalletOrder(
    userId: string,
    addressId: string,
    data: CalculatedOrder,
  ) {
    const order = await this.prisma.$transaction(async (tx) => {
      const order = await this.createOrderInDb(tx, userId, addressId, {
        ...data,
        orderStatus: OrderStatus.PENDING,
        paidAt: new Date(),
      });

      await this.walletService.deductForOrder(
        userId,
        data.grandTotal,
        order.id,
        tx,
      );

      await this.reduceStockAndClearCart(tx, userId, data.cartItems);
      return order;
    });

    await this.createShipmentForOrder(
      order,
      true,
      data.address,
      data.cartItems,
    );

    return {
      order,
      payment: { required: false, type: PaymentType.WALLET },
    };
  }

  // Card/UPI handler
  private async handlePrepaidOrder(
    userId: string,
    addressId: string,
    paymentType: PaymentType,
    data: CalculatedOrder,
  ) {
    const order = await this.prisma.$transaction(async (tx) => {
      const order = await this.createOrderInDb(tx, userId, addressId, {
        ...data,
        orderStatus: OrderStatus.AWAITING_PAYMENT,
        paidAt: null,
      });
      return order;
    });

    return {
      order,
      payment: {
        required: true,
        message: 'Proceed to payment',
      },
    };
  }

  // Place order (main entry)
  async placeOrder(
    userId: string,
    data: { addressId: string; paymentType: PaymentType },
  ) {
    const calculated = await this.validateAndCalculate(
      userId,
      data.addressId,
      data.paymentType,
    );

    switch (data.paymentType) {
      case PaymentType.COD:
        return await this.handleCodOrder(userId, data.addressId, calculated);

      case PaymentType.WALLET:
        return await this.handleWalletOrder(userId, data.addressId, calculated);

      case PaymentType.CARD:
      case PaymentType.UPI:
        return await this.handlePrepaidOrder(
          userId,
          data.addressId,
          data.paymentType,
          calculated,
        );

      default:
        throw new Error('Invalid payment type');
    }
  }

  async checkPaymentSuccess(orderId: string, paymentIntentId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException();

    if (!order.paidAt && order.orderStatus === OrderStatus.AWAITING_PAYMENT) {
      return { success: false, message: 'payment not successed yet' };
    }
    const transactionDetails = await this.prisma.transactionDetail.findFirst({
      where: {
        orderId,
        stripePaymentIntentId: paymentIntentId,
        stripePaymentStatus: 'succeeded',
        transactionStatus: TransactionStatus.SUCCESS,
      },
    });

    if (!transactionDetails) {
      return { success: false, message: 'payment failed' };
    }
    return { success: true, message: 'payment success' };
  }

  // Retry Payment for Order
  async retryPaymentForOrder(
    orderId: string,
    userId: string,
    paymentType: 'card' | 'upi',
  ) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId, userId },
    });

    // Sirf AWAITING_PAYMENT order retry ho sakta hai
    if (order.orderStatus !== OrderStatus.AWAITING_PAYMENT) {
      throw new Error('Order is not awaiting payment');
    }

    // create new payment intent for order
    const stripeIntent = await this.paymentService.createOrderPaymentIntent(
      userId,
      orderId,
      paymentType,
    );

    return {
      order,
      payment: {
        required: true,
        ...stripeIntent,
      },
    };
  }

  // Cancel order
  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (
      order.orderStatus !== OrderStatus.PENDING &&
      order.orderStatus !== OrderStatus.PACKED
    ) {
      throw new Error('Order cannot be cancelled after dispatch');
    }

    // DB transaction — status + stock
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: OrderStatus.CANCELLED },
      });

      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId! },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    });

    // Transaction ke baad refund karo
    // PaymentService decide karega — COD = wallet, Card/UPI = Stripe
    if (order.paidAt) {
      await this.paymentService.initiateRefund(
        orderId,
        userId,
        Number(order.grandTotal),
      );
    }

    return { message: 'Order cancelled successfully' };
  }

  // User orders
  async getUserOrders(
    userId: string,
    options: { skip?: number; take?: number; status?: OrderStatus },
  ) {
    const pagination = { skip: options.skip ?? 0, take: options.take ?? 10 };
    const where: Prisma.OrderWhereInput = { userId };

    if (options.status) {
      where.orderStatus = options.status;
    }

    const [count, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
              variant: true,
            },
          },
          shipments: {
            include: { trackingEvents: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return { count, skip: pagination.skip, take: pagination.take, data };
  }

  // Single order detail
  async getOrderById(orderId: string, userId: string) {
    return await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            variant: true,
          },
        },
        shipments: {
          include: { trackingEvents: true },
        },
        payments: {
          include: {
            paymentMethod: true,
            transactionDetail: true,
          },
        },
        address: true,
      },
    });
  }

  // =====================
  // Admin — all orders
  // =====================
  async getAllOrders(options: {
    skip?: number;
    take?: number;
    status?: OrderStatus;
    userId?: string;
  }) {
    const pagination = { skip: options.skip ?? 0, take: options.take ?? 10 };
    const where: Prisma.OrderWhereInput = {};

    if (options.status) where.orderStatus = options.status;
    if (options.userId) where.userId = options.userId;

    const [count, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          shipments: true,
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return { count, skip: pagination.skip, take: pagination.take, data };
  }

  // Admin — order status update
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return await this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });
  }

  // Admin — shipment update
  async updateShipment(
    orderId: string,
    data: {
      status: ShipmentStatus;
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: string;
    },
  ) {
    const shipment = await this.prisma.shipment.findFirstOrThrow({
      where: { orderId },
    });

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: data.status,
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
          estimatedDelivery: data.estimatedDelivery
            ? new Date(data.estimatedDelivery)
            : undefined,
          shippedAt:
            data.status === ShipmentStatus.SHIPPED ? new Date() : undefined,
          deliveredAt:
            data.status === ShipmentStatus.DELIVERED ? new Date() : undefined,
        },
      });

      const orderStatus = {
        [ShipmentStatus.PROCESSING]: OrderStatus.PENDING,
        [ShipmentStatus.SHIPPED]: OrderStatus.SHIPPED,
        [ShipmentStatus.OUT_FOR_DELIVERY]: OrderStatus.SHIPPED,
        [ShipmentStatus.DELIVERED]: OrderStatus.DELIVERED,
        [ShipmentStatus.FAILED]: OrderStatus.CANCELLED,
      }[data.status];

      await tx.order.update({
        where: { id: orderId },
        data: { orderStatus },
      });

      return updated;
    });
  }

  // Admin — tracking event
  async addTrackingEvent(
    orderId: string,
    data: {
      eventStatus: string;
      location: string;
      eventTime: string;
    },
  ) {
    const shipment = await this.prisma.shipment.findFirstOrThrow({
      where: { orderId },
    });

    return await this.prisma.shipmentTrackingEvent.create({
      data: {
        shipmentId: shipment.id,
        eventStatus: data.eventStatus,
        location: data.location,
        eventTime: new Date(data.eventTime),
      },
    });
  }

  // Private: Order DB mein create
  private async createOrderInDb(
    tx: Prisma.TransactionClient,
    userId: string,
    addressId: string,
    data: {
      orderStatus: OrderStatus;
      paidAt: Date | null;
      totalItemsAmount: number;
      shippingCharge: number;
      codFee: number;
      grandTotal: number;
      cartItems: any[];
    },
  ) {
    return await tx.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        userId,
        addressId,
        orderStatus: data.orderStatus,
        totalItemsAmount: data.totalItemsAmount,
        shippingCharge: Number(data.shippingCharge),
        codFee: data.codFee,
        grandTotal: Number(data.grandTotal),
        placedAt: new Date(),
        paidAt: data.paidAt,
        items: {
          create: data.cartItems.map((item) => ({
            productId: item.productId,
            sellerId: item.product.sellerId,
            variantId: item.variantId,
            productNameSnapshot: item.product.internalName,
            productSkuSnapshot: item.variant.sku,
            quantity: item.quantity,
            unitPriceAtPurchase: item.variant.sellingPrice,
            totalPrice: Number(item.variant.sellingPrice) * item.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  // Private: Stock reduce + Cart clear
  private async reduceStockAndClearCart(
    tx: Prisma.TransactionClient,
    userId: string,
    cartItems: any[],
  ) {
    for (const item of cartItems) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }
    await tx.cartItem.deleteMany({ where: { userId } });
  }

  // Private: Shipment create
  private async createShipmentForOrder(
    order: any,
    isPaid: boolean,
    address: any,
    items: any[],
  ) {
    // ✅ group by seller
    const groupedBySeller = items.reduce(
      (acc, item) => {
        const sellerId = item.product.sellerId;

        if (!acc[sellerId]) acc[sellerId] = [];
        acc[sellerId].push(item);

        return acc;
      },
      {} as Record<string, any[]>,
    );

    // ✅ loop per seller
    for (const sellerId in groupedBySeller) {
      const sellerItems = groupedBySeller[sellerId];

      const seller = await this.prisma.seller.findUnique({
        where: { id: sellerId },
      });

      if (!seller) continue;

      // ✅ check existing shipment per seller
      const existingShipment = await this.prisma.shipment.findFirst({
        where: {
          orderId: order.id,
          sellerId: sellerId,
        },
      });

      if (existingShipment) continue;

      // ✅ create shipment per seller
      const shipmentResponse = await this.shipmentService.createShipment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        isPaid,
        address: {
          name: address.name,
          phone: address.phoneNumber,
          addressLine1: address.addressLine1,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        },
        sellerAddress: {
          addressLine1: seller.businessAddressLine1,
          city: seller.city,
          state: seller.state,
          postalCode: seller.postalCode,
          country: seller.country,
        },
        items: sellerItems.map((item: any) => ({
          name: item.product?.internalName ?? item.productNameSnapshot,
          sku: item.variant?.sku ?? item.productSkuSnapshot,
          quantity: item.quantity,
          price: Number(item.variant?.sellingPrice ?? item.unitPriceAtPurchase),
        })),

        grandTotal: sellerItems.reduce(
          (sum: number, item: any) =>
            sum +
            Number(item.variant?.sellingPrice ?? item.unitPriceAtPurchase) *
              item.quantity,
          0,
        ),
      });

      // ✅ save shipment
      await this.prisma.shipment.create({
        data: {
          orderId: order.id,
          sellerId: sellerId,
          trackingNumber:
            shipmentResponse.awb_code ?? `TRK-${order.orderNumber}`,
          carrier: shipmentResponse.courier_company_id
            ? String(shipmentResponse.courier_company_id)
            : 'Pending',
          status: ShipmentStatus.PROCESSING,
        },
      });
    }
  }
}
