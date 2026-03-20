import * as crypto from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { razorpayConfigFactory } from '@Config';
import { UtilsService } from '@Common';
import { PrismaService } from '../prisma';
import { WalletService } from '../wallet';
import {
  OrderStatus,
  PaymentType,
  TransactionStatus,
} from '../generated/prisma/client';
import Razorpay from 'razorpay';

@Injectable()
export class PaymentService {
  private razorpay: Razorpay;

  constructor(
    @Inject(razorpayConfigFactory.KEY)
    private readonly config: ConfigType<typeof razorpayConfigFactory>,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly utilsService: UtilsService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.config.keyId!,
      key_secret: this.config.keySecret!,
    });
  }

  // =====================
  // Razorpay order create
  // =====================
  async createPaymentOrder(
    userId: string,
    orderId: string,
    paymentType: 'CARD' | 'UPI',
  ) {
    // Order fetch karo
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId, userId },
    });

    // Already paid?
    if (order.paidAt) {
      throw new Error('Order already paid');
    }

    // in Development mock response
    if (!this.utilsService.isProductionApp()) {
      return {
        razorpayOrderId: `order_mock_${Date.now()}`,
        amount: Number(order.grandTotal) * 100,
        currency: 'INR',
        orderId: order.id,
        keyId: 'rzp_test_mock',
      };
    }

    // Create Razorpay order
    const razorpayOrder = await this.razorpay.orders.create({
      amount: Number(order.grandTotal) * 100, // paise mein
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        orderId: order.id,
        userId,
        paymentType,
      },
    });

    // Create TransactionDetail (pending)
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        userId,
        paymentType: paymentType as PaymentType,
      },
    });

    if (paymentMethod) {
      await this.prisma.transactionDetail.create({
        data: {
          userId,
          paymentMethodId: paymentMethod.id,
          transactionId: razorpayOrder.id,
          razorpayOrderId: razorpayOrder.id,
          transactionStatus: TransactionStatus.PENDING,
        },
      });
    }

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: order.id,
      keyId: this.config.keyId,
    };
  }

  // =====================
  // Payment verification (frontend se signature aayega)
  // =====================
  async verifyPayment(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    orderId: string;
    userId: string;
  }) {
    // Development => mock verify
    if (!this.utilsService.isProductionApp()) {
      await this.markOrderPaid(data.orderId, data.userId, {
        razorpayOrderId: data.razorpayOrderId,
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: 'mock_signature',
      });
      return { success: true, message: 'Payment verified (mock)' };
    }

    // Signature verify
    const generatedSignature = crypto
      .createHmac('sha256', this.config.keySecret!)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== data.razorpaySignature) {
      throw new Error('Invalid payment signature');
    }

    // Order paid mark karo
    await this.markOrderPaid(data.orderId, data.userId, {
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
    });

    return { success: true, message: 'Payment verified successfully' };
  }

  // =====================
  // Order paid mark karo
  // =====================
  private async markOrderPaid(
    orderId: string,
    userId: string,
    razorpayData: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Order update karo
      await tx.order.update({
        where: { id: orderId },
        data: {
          paidAt: new Date(),
          orderStatus: OrderStatus.PENDING,
        },
      });

      // TransactionDetail update
      await tx.transactionDetail.updateMany({
        where: { razorpayOrderId: razorpayData.razorpayOrderId },
        data: {
          razorpayPaymentId: razorpayData.razorpayPaymentId,
          razorpaySignature: razorpayData.razorpaySignature,
          transactionStatus: TransactionStatus.SUCCESS,
        },
      });
    });
  }

  // =====================
  // Handle Webhook  (Razorpay se auto update)
  // =====================
  async handleWebhook(payload: string, signature: string) {
    // in Development
    if (!this.utilsService.isProductionApp()) {
      const event = JSON.parse(payload);
      await this.processWebhookEvent(event);
      return { success: true };
    }
    // Webhook signature verify
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret!)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid webhook signature');
    }

    const event = JSON.parse(payload);

    await this.processWebhookEvent(event);

    return { success: true };
  }

  private async processWebhookEvent(event: any) {
    switch (event.event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'refund.processed':
        await this.handleRefundProcessed(event.payload.refund.entity);
        break;
    }
  }
  // =====================
  // Payment captured webhook
  // =====================
  private async handlePaymentCaptured(payment: any) {
    const orderId = payment.notes?.orderId;
    const userId = payment.notes?.userId;

    if (!orderId || !userId) return;

    await this.markOrderPaid(orderId, userId, {
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      razorpaySignature: '',
    });
  }

  // =====================
  // Payment failed webhook
  // =====================
  private async handlePaymentFailed(payment: any) {
    const orderId = payment.notes?.orderId;
    await this.prisma.$transaction(async (tx) => {
      await this.prisma.transactionDetail.updateMany({
        where: { razorpayOrderId: payment.order_id },
        data: { transactionStatus: TransactionStatus.FAILED },
      });

      if (orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: { orderStatus: OrderStatus.AWAITING_PAYMENT },
        });
      }
    });
  }

  // =====================
  // Refund processed webhook → wallet mein credit
  // =====================
  private async handleRefundProcessed(refund: any) {
    const orderId = refund.notes?.orderId;
    const userId = refund.notes?.userId;
    const amount = refund.amount / 100; // paise to rupees

    if (!orderId || !userId) return;

    // Credit into Wallet
    await this.walletService.refund(userId, amount, orderId);
  }

  // =====================
  // Refund initiate (in case order cancel)
  // =====================
  async initiateRefund(
    orderId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    // In Development directly credit to wallet
    if (!this.utilsService.isProductionApp()) {
      await this.walletService.refund(userId, amount, orderId);
      return;
    }

    // Find Transaction
    const transaction = await this.prisma.transactionDetail.findFirst({
      where: {
        orderPayments: { some: { orderId } },
        transactionStatus: TransactionStatus.SUCCESS,
      },
    });

    if (!transaction?.razorpayPaymentId) {
      // in case of COD order — directly credit in wallet
      await this.walletService.refund(userId, amount, orderId);
      return;
    }

    // Razorpay refund initiate
    // Webhook se automatically
    await this.razorpay.payments.refund(transaction.razorpayPaymentId, {
      amount: amount * 100, // paise mein
      notes: { orderId, userId },
    });
  }
}
