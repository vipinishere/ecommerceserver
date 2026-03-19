import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { WalletService } from '../wallet';
import {
  OrderStatus,
  PaymentType,
  ShipmentStatus,
  Prisma,
} from '../generated/prisma/client';
import { ShipmentService } from 'src/shipment';
import { PaymentService } from 'src/payment';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly shipmentService: ShipmentService,
    private readonly paymentService: PaymentService,
  ) {}

  // =====================
  // Order number generate
  // =====================
  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `ORD-${dateStr}-${random}`;
  }

  // =====================
  // Order place karo (cart se)
  // =====================
  async placeOrder(
    userId: string,
    data: {
      addressId: string;
      paymentType: PaymentType;
    },
  ) {
    // Step 1: Cart items fetch
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true, variant: true },
    });
    if (cartItems.length === 0) throw new Error('Cart is empty');

    // Step 2: Address validate
    const address = await this.prisma.address.findUniqueOrThrow({
      where: { id: data.addressId, userId },
    });

    // Step 3: Stock check
    for (const item of cartItems) {
      if (item.variant.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product.internalName}`);
      }
    }

    // Step 4: Amounts calculate
    const totalItemsAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.variant.sellingPrice) * item.quantity,
      0,
    );
    const shippingCharge = totalItemsAmount > 500 ? 0 : 50;
    const codFee = data.paymentType === PaymentType.COD ? 25 : 0;
    const grandTotal = totalItemsAmount + shippingCharge + codFee;

    // Step 5: Wallet balance check
    if (data.paymentType === PaymentType.WALLET) {
      const wallet = await this.walletService.getWalletByUserId(userId);
      if (Number(wallet.currentBalance) < grandTotal) {
        throw new Error('Insufficient wallet balance');
      }
    }

    // Step 6: DB transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Order create karo
      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId,
          orderStatus: OrderStatus.PENDING,
          totalItemsAmount,
          shippingCharge,
          codFee,
          grandTotal,
          placedAt: new Date(),
          paidAt: data.paymentType === PaymentType.WALLET ? new Date() : null,
          items: {
            create: cartItems.map((item) => ({
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

      // Payment type handle karo
      switch (data.paymentType) {
        case PaymentType.WALLET:
          // Wallet se deduct karo
          await this.walletService.deductForOrder(
            userId,
            grandTotal,
            order.id,
            tx,
          );
          break;

        case PaymentType.COD:
        case PaymentType.CARD:
        case PaymentType.UPI:
          // COD — delivery pe payment
          // CARD/UPI — Razorpay verify ke baad PaymentService handle karega
          break;
      }

      // Stock reduce karo
      for (const item of cartItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      // Cart clear karo
      await tx.cartItem.deleteMany({ where: { userId } });

      return order;
    });

    // Step 7: Shipment create karo (transaction ke bahar)
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
      items: cartItems.map((item) => ({
        name: item.product.internalName,
        sku: item.variant.sku,
        quantity: item.quantity,
        price: Number(item.variant.sellingPrice),
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

    // Step 8: CARD/UPI — Razorpay order create
    if (
      data.paymentType === PaymentType.CARD ||
      data.paymentType === PaymentType.UPI
    ) {
      const razorpayOrder = await this.paymentService.createPaymentOrder(
        userId,
        order.id,
        data.paymentType === PaymentType.CARD ? 'CARD' : 'UPI',
      );

      return {
        order,
        payment: {
          required: true,
          ...razorpayOrder,
        },
      };
    }

    return {
      order,
      payment: {
        required: false,
        type: data.paymentType,
      },
    };
  }

  // =====================
  // User orders
  // =====================
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

  // =====================
  // Single order detail
  // =====================
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
      },
    });
  }

  // =====================
  // Order cancel karo (dispatch se pehle)
  // =====================
  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId, userId },
      include: { items: true, shipments: true },
    });

    // Sirf PENDING ya PACKED cancel ho sakta hai
    if (
      order.orderStatus !== OrderStatus.PENDING &&
      order.orderStatus !== OrderStatus.PACKED
    ) {
      throw new Error('Order cannot be cancelled after dispatch');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Order status update karo
      await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: OrderStatus.CANCELLED },
      });

      // Stock wapis karo
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId! },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      // Wallet refund karo (COD nahi hoga)
      const payment = await tx.orderPayment.findFirst({
        where: { orderId },
      });

      if (payment) {
        await this.walletService.refund(
          userId,
          Number(order.grandTotal),
          orderId,
          tx,
        );
      }

      return { message: 'Order cancelled successfully' };
    });
  }

  // =====================
  // Admin — sare orders
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

  // =====================
  // Admin — order status update
  // =====================
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return await this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });
  }

  // =====================
  // Admin — shipment update (courier API)
  // =====================
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
      // Shipment update karo
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

      // Order status bhi update karo
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

  // =====================
  // Admin — tracking event add karo
  // =====================
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
}
