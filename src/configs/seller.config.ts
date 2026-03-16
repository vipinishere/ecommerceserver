import { registerAs } from '@nestjs/config';

export const sellerConfigFactory = registerAs('seller', () => ({
  passwordSaltLength: 16,
  passwordHashLength: 32,
  profileImagePath: 'seller/profile',
}));
