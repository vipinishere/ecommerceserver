import { registerAs } from '@nestjs/config';

export const shipmentConfigFactory = registerAs('shipment', () => ({
  email: process.env.SHIPROCKET_EMAIL,
  password: process.env.SHIPROCKET_PASSWORD,
  apiUrl:
    process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external',
}));
