import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigType } from '@nestjs/config';
import { shipmentConfigFactory } from '@Config';
import { UtilsService } from '@Common';
import { PrismaService } from 'src/prisma';
import axios from 'axios';

const SHIPMENT_TOKEN_CACHE_KEY = 'shiprocket_token';

export type ShiprocketShipmentResponse = {
  order_id: string;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now: number;
  awb_code: string | null;
  courier_company_id: number | null;
};

@Injectable()
export class ShipmentService {
  constructor(
    @Inject(shipmentConfigFactory.KEY)
    private readonly config: ConfigType<typeof shipmentConfigFactory>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
  ) {}
  // =====================
  // Get token (cache → DB → API)
  // =====================
  private async getToken(): Promise<string> {
    // 1. check in cache
    const cachedToken = await this.cacheManager.get<string>(
      SHIPMENT_TOKEN_CACHE_KEY,
    );

    if (cachedToken) return cachedToken;

    // 2. check in db
    const dbToken = await this.prisma.shipmentToken.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (dbToken && new Date() < dbToken.expiresAt) {
      // token is valid, now store in db
      const ttl = dbToken.expiresAt.getTime() - Date.now();
      await this.cacheManager.set(SHIPMENT_TOKEN_CACHE_KEY, dbToken.token, ttl);
      return dbToken.token;
    }

    // 3. generate a new token
    return await this.generateNewToken();
  }

  // =====================
  // Generate new from Shiprocket
  // =====================
  private async generateNewToken(): Promise<string> {
    const response = await fetch(`${this.config.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'appication/json' },
      body: JSON.stringify({
        email: this.config.email,
        password: this.config.password,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to generated shipment token');
    }

    const data = await response.json();
    const token = data.token;

    // token expired usually at 10 days but considering 9 days are safe
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 9);

    // store in cache
    const ttl = expiresAt.getTime() - Date.now();
    await this.cacheManager.set(SHIPMENT_TOKEN_CACHE_KEY, token, ttl);

    // remove previous tokens and store in db
    await this.prisma.$transaction(async (tx) => {
      await tx.shipmentToken.deleteMany();
      await tx.shipmentToken.create({
        data: { token, expiresAt },
      });
    });

    return token;
  }

  // =====================
  // Validate token — if expired/invalid, retry
  // =====================
  async makeApiCall<T>(
    url: string,
    options: RequestInit,
    retry = true,
  ): Promise<T> {
    const token = await this.getToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // if token is expired or invalid, retry once
    if (response.status === 401 && retry) {
      // remove old token from db and cache
      await this.cacheManager.del(SHIPMENT_TOKEN_CACHE_KEY);
      await this.prisma.shipmentToken.deleteMany();

      // now retry, it will get new token
      return await this.makeApiCall<T>(url, options, false);
    }

    if (!response.ok) {
      throw new Error(`Shiprocket API error: ${response.statusText}`);
    }
    return await response.json();
  }

  // =====================
  // Create Shipment
  // =====================
  async createShipment(data: {
    orderId: string;
    orderNumber: string;
    isPaid: boolean;
    address: {
      name: string;
      phone: string;
      addressLine1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    sellerAddress: {
      addressLine1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    items: {
      name: string;
      sku: string;
      quantity: number;
      price: number;
    }[];
    grandTotal: number;
  }): Promise<ShiprocketShipmentResponse> {
    // Development
    // send mock data on development
    // if (!this.utilsService.isProduction()) {
    //   return this.getMockShipmentResponse(data.orderNumber);
    // }

    // Production
    // call shiprocket API
    return await this.makeApiCall<ShiprocketShipmentResponse>(
      `${this.config.apiUrl}/create/adhoc`,
      {
        method: 'POST',
        body: JSON.stringify({
          order_id: data.orderNumber,
          order_date: new Date().toISOString(),
          pickup_location: data.sellerAddress.state,
          billing_customer_name: data.address.name,
          billing_address: data.address.addressLine1,
          billing_city: data.address.city,
          billing_pincode: data.address.postalCode,
          billing_state: data.address.state,
          billing_country: data.address.country,
          billing_phone: data.address.phone,
          shipping_is_billing: true,
          order_items: data.items.map((item) => ({
            name: item.name,
            sku: item.sku,
            units: item.quantity,
            selling_price: item.price,
          })),
          payment_method: data.isPaid ? 'Prepaid' : 'cod',
          sub_total: data.grandTotal,
          length: 10,
          breadth: 10,
          height: 10,
          weight: 0.5,
        }),
      },
    );
  }

  async getShippingRate(dto: {
    pickupPincode: string;
    deliveryPincode: string;
    weight: number;
    length?: number;
    breadth?: number;
    height?: number;
    cod: boolean;
  }) {
    try {
      const response = await axios.get(
        'https://apiv2.shiprocket.in/v1/external/courier/serviceability/',
        {
          params: {
            pickup_postcode: dto.pickupPincode,
            delivery_postcode: dto.deliveryPincode,
            cod: dto.cod ? 1 : 0,
            weight: dto.weight,
            length: dto.length ? dto.length : '',
            breadth: dto.breadth ? dto.breadth : '',
            height: dto.height ? dto.height : '',
          },
          headers: {
            Authorization: `Bearer ${this.getToken()}`,
          },
        },
      );
      return response;
    } catch (error) {
      if (error) {
        // console.log(error);
      }
    }
  }

  // =====================
  // Mock response — for development.
  // =====================
  private getMockShipmentResponse(
    orderNumber: string,
  ): ShiprocketShipmentResponse {
    return {
      order_id: orderNumber,
      shipment_id: Math.floor(Math.random() * 1000000),
      status: 'NEW',
      status_code: 1,
      onboarding_completed_now: 0,
      awb_code: null,
      courier_company_id: null,
    };
  }
}
