import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { WalletService } from '../wallet';
import {
  OrderStatus,
  PaymentType,
  ShipmentStatus,
  Prisma,
} from '../generated/prisma/client';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
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
      paymentMethodId?: string;
      transactionId?: string;
    },
  ) {
    // Step 1: Cart items fetch karo
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: true,
        variant: true,
      },
    });

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Step 2: Address validate karo
    await this.prisma.address.findUniqueOrThrow({
      where: { id: data.addressId, userId },
    });

    // Step 3: Stock check karo
    for (const item of cartItems) {
      if (item.variant.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product.internalName}`);
      }
    }

    // Step 4: Amounts calculate karo
    const totalItemsAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.variant.sellingPrice) * item.quantity,
      0,
    );
    const shippingCharge = totalItemsAmount > 500 ? 0 : 50;
    const codFee = data.paymentType === PaymentType.COD ? 25 : 0;
    const grandTotal = totalItemsAmount + shippingCharge + codFee;

    return await this.prisma.$transaction(async (tx) => {
      // Step 5: Wallet payment check
      if (data.paymentType === PaymentType.WALLET) {
        await this.walletService.deductForOrder(
          userId,
          grandTotal,
          'temp', // order id baad mein update hoga
          tx,
        );
      }

      // Step 6: Order create karo
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
          paidAt: data.paymentType !== PaymentType.COD ? new Date() : null,
          // Order items
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
        include: {
          items: true,
        },
      });

      // Step 7: Wallet transaction mein order id update karo
      if (data.paymentType === PaymentType.WALLET) {
        await tx.walletTransaction.updateMany({
          where: {
            wallet: { userId },
            referenceId: 'temp',
          },
          data: { referenceId: order.id },
        });
      }

      // Step 8: Payment record banao
      if (
        data.paymentType !== PaymentType.COD &&
        data.paymentMethodId &&
        data.transactionId
      ) {
        const transactionDetail = await tx.transactionDetail.create({
          data: {
            userId,
            paymentMethodId: data.paymentMethodId,
            transactionId: data.transactionId,
            transactionStatus: 'SUCCESS',
          },
        });

        await tx.orderPayment.create({
          data: {
            orderId: order.id,
            paymentMethodId: data.paymentMethodId,
            transactionDetailId: transactionDetail.id,
            amount: grandTotal,
            paidAt: new Date(),
          },
        });
      }

      // Step 9: Stock reduce karo
      for (const item of cartItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });
      }

      // Step 10: Shipment create karo
      await tx.shipment.create({
        data: {
          orderId: order.id,
          trackingNumber: `TRK-${order.orderNumber}`,
          carrier: 'Pending',
          status: ShipmentStatus.PROCESSING,
        },
      });

      // Step 11: Cart clear karo
      await tx.cartItem.deleteMany({ where: { userId } });

      return order;
    });
  }

  // =====================
  // User ke orders
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
