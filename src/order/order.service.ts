import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { WalletService } from '../wallet';
import {
  OrderStatus,
  PaymentType,
  ShipmentStatus,
  Prisma,
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
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `ORD-${dateStr}-${random}`;
  }

  // Validate + Calculate
  private async validateAndCalculate(
    userId: string,
    addressId: string,
    paymentType: PaymentType,
  ): Promise<CalculatedOrder> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true, variant: true },
    });
    if (cartItems.length === 0) throw new Error('Cart is empty');

    const address = await this.prisma.address.findUniqueOrThrow({
      where: { id: addressId, userId },
    });

    for (const item of cartItems) {
      if (item.variant.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product.internalName}`);
      }
    }

    const totalItemsAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.variant.sellingPrice) * item.quantity,
      0,
    );
    const shippingCharge = totalItemsAmount > 500 ? 0 : 50;
    const codFee = paymentType === PaymentType.COD ? 25 : 0;
    const grandTotal = totalItemsAmount + shippingCharge + codFee;

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
      shippingCharge,
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
      data.address,
      data.cartItems,
      data.grandTotal,
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
      data.address,
      data.cartItems,
      data.grandTotal,
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
      await this.reduceStockAndClearCart(tx, userId, data.cartItems);
      return order;
    });

    const stripeIntent = await this.paymentService.createOrderPaymentIntent(
      userId,
      order.id,
      paymentType === PaymentType.CARD ? 'card' : 'upi',
    );

    return {
      order,
      payment: {
        required: true,
        ...stripeIntent,
      },
    };
  }

  // Complete payment (Card/UPI verify + shipment)
  async completePayment(data: {
    paymentIntentId: string;
    orderId: string;
    userId: string;
  }) {
    // Step 1: PaymentService se verify + markOrderPaid()
    await this.paymentService.verifyPayment(data);

    // Step 2: Order + address + items fetch
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: data.orderId, userId: data.userId },
      include: {
        items: {
          include: { product: true, variant: true },
        },
        address: true,
      },
    });

    // Step 3: Shipment create karo
    await this.createShipmentForOrder(
      order,
      order.address,
      order.items,
      Number(order.grandTotal),
    );

    return { success: true, message: 'Payment verified successfully' };
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

    // Naya Razorpay order create karo
    const razorpayOrder = await this.paymentService.createOrderPaymentIntent(
      userId,
      orderId,
      paymentType,
    );

    return {
      order,
      payment: {
        required: true,
        ...razorpayOrder,
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
    // PaymentService decide karega — COD = wallet, Card/UPI = Razorpay
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
        shippingCharge: data.shippingCharge,
        codFee: data.codFee,
        grandTotal: data.grandTotal,
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
    address: any,
    items: any[],
    grandTotal: number,
  ) {
    const shipmentResponse = await this.shipmentService.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      address: {
        name: address.name,
        phone: address.phoneNumber,
        addressLine1: address.addressLine1,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      items: items.map((item) => ({
        name: item.product?.internalName ?? item.productNameSnapshot,
        sku: item.variant?.sku ?? item.productSkuSnapshot,
        quantity: item.quantity,
        price: Number(item.variant?.sellingPrice ?? item.unitPriceAtPurchase),
      })),
      grandTotal,
    });

    await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        trackingNumber: shipmentResponse.awb_code ?? `TRK-${order.orderNumber}`,
        carrier: shipmentResponse.courier_company_id
          ? String(shipmentResponse.courier_company_id)
          : 'Pending',
        status: ShipmentStatus.PROCESSING,
      },
    });
  }
}
