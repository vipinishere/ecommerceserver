import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Address } from '../generated/prisma/client';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  private async removeExistingDefault(
    userId: string,
    tx: any,
    excludeAddressId?: string,
  ): Promise<void> {
    await tx.address.updateMany({
      where: {
        userId,
        isDefault: true,
        NOT: { id: excludeAddressId },
      },
      data: { isDefault: false },
    });
  }

  // get all address
  async getAll(userId: string): Promise<Address[]> {
    return await this.prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc', createdAt: 'desc' },
    });
  }

  // get single address
  async getById(addressId: string, userId: string): Promise<Address> {
    return await this.prisma.address.findUniqueOrThrow({
      where: { id: addressId, userId },
    });
  }

  // create a address
  async create(
    userId: string,
    data: {
      name: string;
      dialCode: string;
      phoneNumber: string;
      alternativePhoneNumber?: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault?: boolean;
    },
  ): Promise<Address> {
    return await this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await this.removeExistingDefault(userId, tx);
      }

      const addressCounts = await tx.address.count({ where: { userId } });
      const isDefault = addressCounts === 0 ? true : (data.isDefault ?? false);

      return await tx.address.create({
        data: {
          userId,
          name: data.name,
          dialCode: data.dialCode,
          phoneNumber: data.phoneNumber,
          alternativePhoneNumber: data?.alternativePhoneNumber,
          addressLine1: data.addressLine1,
          addressLine2: data?.addressLine2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
          isDefault,
        },
      });
    });
  }

  // update a address => default = true, then find previous default address and set default = false, and set default = true for current address
  async update(
    userId: string,
    addressId: string,
    data: Partial<{
      name: string;
      dialCode: string;
      phoneNumber: string;
      alternativePhoneNumber: string;
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault: boolean;
    }>,
  ): Promise<Address> {
    await this.getById(addressId, userId);
    return await this.prisma.$transaction(async (tx) => {
      // isDefault true karna hai toh purana default hatao
      if (data.isDefault) {
        await this.removeExistingDefault(userId, tx, addressId);
      }

      return await tx.address.update({
        where: { id: addressId },
        data,
      });
    });
  }

  // remove address(if address is default then find the latest address make that default)
  async remove(addressId: string, userId: string): Promise<void> {
    const address = await this.getById(addressId, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });

      // Default address delete hua toh latest ko default banao
      if (address.isDefault) {
        const latest = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (latest) {
          await tx.address.update({
            where: { id: latest.id },
            data: { isDefault: true },
          });
        }
      }
    });
  }

  // only set default a address
  async setDefault(addressId: string, userId: string): Promise<Address> {
    await this.getById(addressId, userId);

    return await this.prisma.$transaction(async (tx) => {
      await this.removeExistingDefault(userId, tx, addressId);

      return await tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }
}
