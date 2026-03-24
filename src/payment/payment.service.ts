import Stripe from 'stripe';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { stripeConfigFactory } from '@Config';
import { UtilsService } from '@Common';
import { PrismaService } from '../prisma';
import { WalletService } from '../wallet';
import {
  OrderStatus,
  PaymentTypeForWallet,
  TransactionStatus,
} from '../generated/prisma/enums';
import { PaymentType } from '../generated/prisma/client';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    @Inject(stripeConfigFactory.KEY)
    private readonly config: ConfigType<typeof stripeConfigFactory>,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly utilsService: UtilsService,
  ) {
    this.stripe = new Stripe(this.config.secretKey!, {
      apiVersion: '2026-02-25.clover',
    });
  }

  // Create Stripe Payment Intent for Order
  async createOrderPaymentIntent(
    userId: string,
    orderId: string,
    paymentMethod: 'card' | 'upi',
  ) {
    // Order fetch karo
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId, userId },
    });

    // Already paid?
    if (order.paidAt) throw new Error('Order already paid');

    // ✅ Check existing pending transaction for this order
    const existingTransaction = await this.prisma.transactionDetail.findFirst({
      where: {
        orderId,
        transactionStatus: TransactionStatus.PENDING,
        stripePaymentIntentId: { not: null },
      },
    });

    if (existingTransaction?.stripePaymentIntentId) {
      const existingIntent = await this.stripe.paymentIntents.retrieve(
        existingTransaction.stripePaymentIntentId,
      );

      return {
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id,
        amount: existingIntent.amount,
        currency: existingIntent.currency,
        orderId,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      };
    }

    // Create Stripe payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Number(order.grandTotal) * 100,
      currency: this.config.currency!,
      payment_method_types: paymentMethod === 'upi' ? ['upi'] : ['card'],
      metadata: {
        type: 'order',
        userId,
        orderId: order.id,
        paymentMethod,
      },
    });

    // create transaction details with pending status update after payment success
    await this.createTransactionDetail(
      userId,
      paymentMethod,
      paymentIntent.id,
      orderId,
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      orderId: order.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    };
  }

  // Create Stripe Payment Intent for wallet
  async createWalletPaymentIntent(
    userId: string,
    amount: number,
    paymentMethod: 'card' | 'upi',
  ) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amount * 100,
      currency: this.config.currency!,
      payment_method_types: paymentMethod === 'upi' ? ['upi'] : ['card'],
      metadata: {
        type: 'wallet',
        userId,
        paymentMethod,
      },
    });

    await this.createTransactionDetail(userId, paymentMethod, paymentIntent.id);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    };
  }

  // Function to create transaction details in db with transaction status pending, => update further
  private async createTransactionDetail(
    userId: string,
    PaymentMethod: 'card' | 'upi',
    paymentIntentId: string,
    orderId?: string,
  ) {
    let method = await this.prisma.paymentMethod.findFirst({
      where: {
        userId,
        paymentType:
          PaymentMethod === 'card' ? PaymentType.CARD : PaymentType.UPI,
      },
    });

    if (!method) {
      method = await this.prisma.paymentMethod.create({
        data: {
          userId,
          paymentType:
            PaymentMethod === 'card' ? PaymentType.CARD : PaymentType.UPI,
        },
      });
    }

    if (method) {
      await this.prisma.transactionDetail.create({
        data: {
          userId,
          orderId,
          paymentMethodId: method.id,
          transactionId: paymentIntentId,
          stripePaymentIntentId: paymentIntentId,
          transactionStatus: TransactionStatus.PENDING,
        },
      });
    }
  }

  async handleWebhook(payload: string, signature: string) {
    let event: Stripe.Event;
    // if (!this.utilsService.isProductionApp()) {
    //   try {
    //     event = JSON.parse(payload) as Stripe.Event;
    //   } catch {
    //     throw new Error('Invalid webhook payload');
    //   }
    // } else {}
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret!,
      );
    } catch {
      throw new Error('Invalid webhook signature');
    }

    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId: event.id },
    });

    if (existingEvent) {
      return { success: true, message: 'event already processed' };
    }
    // process webhook event
    await this.processWebhookEvent(event);

    // update in db about webhook is processed before or not
    await this.prisma.webhookEvent.create({
      data: { eventId: event.id, type: event.type },
    });

    return { success: true };
  }

  private async processWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.processing':
        await this.handlePaymentProcessing(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentCanceled(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'charge.refunded':
        await this.handleRefundProcessed(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
        break;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const { type, userId, orderId, paymentMethod } = paymentIntent.metadata;

    if (!userId) return;

    switch (type) {
      // order payment
      case 'order':
        if (!orderId) return;
        await this.markOrderPaid(orderId, userId, {
          stripePaymentIntentId: paymentIntent.id,
          stripePaymentStatus: paymentIntent.status,
        });

        // ✅ NEW: Fulfillment after payment
        await this.handlePostPaymentSuccess(orderId, userId);
        break;
      // wallet deposit
      case 'wallet':
        const amount = paymentIntent.amount / 100;
        await this.walletService.deposit(
          userId,
          amount,
          paymentMethod === 'card'
            ? PaymentTypeForWallet.CARD
            : PaymentTypeForWallet.UPI,
          paymentIntent.id,
        );
        break;

      default:
        console.log(`Unknown payment type in metadata: ${type}`);
        break;
    }
  }

  private async handlePostPaymentSuccess(orderId: string, userId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      // ✅ 1. Reduce stock
      for (const item of order.items) {
        const updated = await tx.productVariant.update({
          where: { id: item.variantId!, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });

        if (updated.stockQuantity === 0) {
          throw new Error(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      // ✅ 2. Clear cart
      await tx.cartItem.deleteMany({
        where: { userId },
      });
    });

    // ✅ 3. Create shipment
    await this.createShipmentAfterPayment(order);
  }

  private async createShipmentAfterPayment(order: any) {
    const existingShipment = await this.prisma.shipment.findFirst({
      where: { orderId: order.id },
    });

    if (existingShipment) return;

    await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        trackingNumber: `TRK-${order.orderNumber}`,
        carrier: 'Pending',
        status: 'PROCESSING',
      },
    });
  }

  private async markOrderPaid(
    orderId: string,
    userId: string,
    stripeData: {
      stripePaymentIntentId: string;
      stripePaymentStatus: string;
    },
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
      });
      // update order
      if (order.paidAt) {
        return { alreadyPaid: true };
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          paidAt: new Date(),
          orderStatus: OrderStatus.PENDING,
        },
      });

      // Update transaction details
      await tx.transactionDetail.updateMany({
        where: { stripePaymentIntentId: stripeData.stripePaymentIntentId },
        data: {
          stripePaymentStatus: stripeData.stripePaymentStatus,
          transactionStatus: TransactionStatus.SUCCESS,
        },
      });
    });
    return { alreadyPaid: false };
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { type, orderId } = paymentIntent.metadata;

    await this.prisma.$transaction(async (tx) => {
      await tx.transactionDetail.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          stripePaymentStatus: paymentIntent.status,
          transactionStatus: TransactionStatus.FAILED,
        },
      });

      if (type === 'order' && orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: { orderStatus: OrderStatus.AWAITING_PAYMENT },
        });
      }
    });
  }

  private async handlePaymentProcessing(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.transactionDetail.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        stripePaymentStatus: 'processing',
        transactionStatus: TransactionStatus.PENDING,
      },
    });
  }

  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    const { type, orderId } = paymentIntent.metadata;
    await this.prisma.$transaction(async (tx) => {
      await tx.transactionDetail.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          stripePaymentStatus: 'canceled',
          transactionStatus: TransactionStatus.FAILED,
        },
      });
      if (type === 'order' && orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: { orderStatus: OrderStatus.AWAITING_PAYMENT },
        });
      }
    });
  }

  private async handleRefundProcessed(charge: Stripe.Charge) {
    const { orderId, userId } = charge.metadata;
    const amount = (charge.amount_refunded ?? 0) / 100;
    if (!orderId || !userId || amount <= 0) return;

    await this.walletService.refund(userId, amount, orderId);
  }

  async initiateRefund(
    orderId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    const transaction = await this.prisma.transactionDetail.findFirst({
      where: {
        orderId,
        transactionStatus: TransactionStatus.SUCCESS,
      },
    });
    // cod order refund in wallet
    if (!transaction?.stripePaymentIntentId) {
      await this.walletService.refund(userId, amount, orderId);
      return;
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(
      transaction.stripePaymentIntentId,
    );

    if (!paymentIntent.latest_charge) {
      throw new Error('No charge found for this payment');
    }

    await this.stripe.refunds.create({
      charge: paymentIntent.latest_charge as string,
      amount: amount * 100, // paise mein
      metadata: {
        orderId,
        userId,
      },
    });
  }
}
