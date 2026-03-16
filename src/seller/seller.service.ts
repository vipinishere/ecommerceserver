import { Cache } from 'cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigType } from '@nestjs/config';
import { sellerConfigFactory } from '@Config';
import {
  UserType,
  UtilsService,
  ValidatedUser,
  getAccessGuardCacheKey,
} from '@Common';
import { PrismaService } from '../prisma';
import { StorageService } from '../common/providers/storage.service';
import {
  OtpContext,
  OtpService,
  SendCodeResponse,
  VerifyCodeResponse,
} from '../otp';
import {
  OtpTransport,
  Prisma,
  Seller,
  SellerMeta,
  SellerStatus,
  User,
} from '../generated/prisma/client';
import { join } from 'path';

@Injectable()
export class SellerService {
  constructor(
    @Inject(sellerConfigFactory.KEY)
    private readonly config: ConfigType<typeof sellerConfigFactory>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly storageService: StorageService,
    private readonly otpService: OtpService,
  ) {}

  private getProfileImageUrl(profileImage: string): string {
    return this.storageService.getFileUrl(
      profileImage,
      this.config.profileImagePath,
    );
  }

  async updateProfileDetails(
    data: {
      sellerId: string;
      businessName?: string;
      contactEmail?: string;
      dialCode?: string;
      contactPhone?: string;
    },
    options?: { tx?: Prisma.TransactionClient },
  ): Promise<Seller> {
    const prismaClient = options?.tx ?? this.prisma;

    // Email already exist toh nahi?
    if (
      data.contactEmail &&
      (await this.isEmailExist(data.contactEmail, data.sellerId))
    ) {
      throw new Error('Email already exists');
    }

    // Phone already exist toh nahi?
    if (
      data.contactPhone &&
      (await this.isContactPhoneExist(data.contactPhone, data.sellerId))
    ) {
      throw new Error('Phone number already exists');
    }

    return await prismaClient.seller.update({
      data: {
        businessName: data.businessName,
        contactEmail: data.contactEmail?.toLowerCase(),
        dialCode: data.dialCode,
        contactPhone: data.contactPhone,
      },
      where: { id: data.sellerId },
    });
  }

  async updateProfileImage(
    sellerId: string,
    profileImage: string,
  ): Promise<{ profileImage: string | null }> {
    const seller = await this.prisma.seller.findUniqueOrThrow({
      where: { id: sellerId },
    });

    return await this.prisma.$transaction(async (tx) => {
      // Step 1: DB mein naya image update karo
      await tx.seller.update({
        where: { id: sellerId },
        data: { profileImage },
      });

      // Step 2: Purana image storage se delete karo
      if (seller.profileImage) {
        await this.storageService.removeFile(
          join(this.config.profileImagePath, seller.profileImage),
        );
      }

      // Step 3: Naya image move karo temp se actual path pe
      await this.storageService.move(
        profileImage,
        this.config.profileImagePath,
      );

      return {
        profileImage: this.storageService.getFileUrl(
          profileImage,
          this.config.profileImagePath,
        ),
      };
    });
  }

  private hashPassword(password: string): { salt: string; hash: string } {
    const salt = this.utilsService.generateSalt(this.config.passwordSaltLength);
    const hash = this.utilsService.hashPassword(
      password,
      salt,
      this.config.passwordHashLength,
    );
    return { salt, hash };
  }

  async isEmailExist(
    email: string,
    excludeSellerId?: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.seller.count({
        where: {
          contactEmail: email.toLowerCase(),
          NOT: { id: excludeSellerId },
        },
      })) !== 0
    );
  }

  async isContactPhoneExist(
    contactPhone: string,
    excludeSellerId?: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.seller.count({
        where: {
          contactPhone,
          NOT: { id: excludeSellerId },
        },
      })) !== 0
    );
  }

  async getByEmail(email: string): Promise<Seller | null> {
    return await this.prisma.seller.findUnique({
      where: { contactEmail: email.toLowerCase() },
    });
  }

  async getMetaById(sellerId: string): Promise<SellerMeta> {
    return await this.prisma.sellerMeta.findUniqueOrThrow({
      where: { sellerId },
    });
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidatedUser | false | null> {
    const seller = await this.getByEmail(email);
    if (!seller) return null;

    if (seller.status !== SellerStatus.ACTIVE) {
      throw new Error(
        'Your seller account has been suspended. Please contact support.',
      );
    }

    const sellerMeta = await this.getMetaById(seller.id);
    const passwordHash = this.utilsService.hashPassword(
      password,
      sellerMeta.passwordSalt || '',
      sellerMeta.passwordHash
        ? sellerMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (sellerMeta.passwordHash === passwordHash) {
      return {
        id: seller.id,
        type: UserType.Seller,
      };
    }

    return false;
  }

  async create(data: {
    businessName: string;
    contactEmail: string;
    dialCode: string;
    contactPhone: string;
    password: string;
  }): Promise<Seller> {
    if (await this.isEmailExist(data.contactEmail)) {
      throw new Error('Email already exists');
    }
    if (await this.isContactPhoneExist(data.contactPhone)) {
      throw new Error('Phone number already exists');
    }

    const { salt, hash } = this.hashPassword(data.password);

    return await this.prisma.seller.create({
      data: {
        businessName: data.businessName,
        contactEmail: data.contactEmail.toLowerCase(),
        dialCode: data.dialCode,
        contactPhone: data.contactPhone,
        meta: {
          create: {
            passwordSalt: salt,
            passwordHash: hash,
          },
        },
      },
    });
  }

  async sendResetPasswordVerificationCode(
    email: string,
  ): Promise<{ email: SendCodeResponse }> {
    const seller = await this.getByEmail(email);
    if (!seller) throw new Error('Seller does not exist');

    const response = await this.otpService.send({
      context: OtpContext.ResetPassword,
      target: email,
      transport: OtpTransport.Email,
      transportParams: {
        username: seller.businessName,
      },
    });

    return { email: response };
  }

  async changePassword(
    sellerId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<Seller> {
    // Step 1: Seller aur meta fetch karo
    const seller = await this.prisma.seller.findUniqueOrThrow({
      where: { id: sellerId },
    });
    const sellerMeta = await this.getMetaById(sellerId);

    // Step 2: Old password verify karo
    const hashedOldPassword = this.utilsService.hashPassword(
      oldPassword,
      sellerMeta.passwordSalt || '',
      sellerMeta.passwordHash
        ? sellerMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (hashedOldPassword !== sellerMeta.passwordHash) {
      throw new Error('Password does not match');
    }

    // Step 3: New password hash karo aur save karo
    const { salt: passwordSalt, hash: passwordHash } =
      this.hashPassword(newPassword);

    await this.prisma.sellerMeta.update({
      data: {
        passwordSalt,
        passwordHash,
      },
      where: { sellerId },
    });

    return seller;
  }

  async resetPassword(
    code: string,
    newPassword: string,
    email: string,
  ): Promise<Seller> {
    const seller = await this.getByEmail(email);
    if (!seller) throw new Error('Seller not found');

    const response: VerifyCodeResponse = await this.otpService.verify(
      code,
      email,
      OtpTransport.Email,
    );
    if (!response.status) throw new Error('Incorrect verification code');

    const { salt: passwordSalt, hash: passwordHash } =
      this.hashPassword(newPassword);

    await this.prisma.sellerMeta.update({
      data: { passwordSalt, passwordHash },
      where: { sellerId: seller.id },
    });

    return seller;
  }

  async setStatus(sellerId: string, status: SellerStatus): Promise<Seller> {
    await this.cacheManager.del(
      getAccessGuardCacheKey({ id: sellerId, type: UserType.Seller }),
    );
    return await this.prisma.seller.update({
      data: { status },
      where: { id: sellerId },
    });
  }

  async getAll(options?: {
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{
    count: number;
    skip: number;
    take: number;
    data: User[];
  }> {
    const search = options?.search?.trim();
    const pagination = { skip: options?.skip || 0, take: options?.take || 10 };
    const where: Prisma.UserWhereInput = {};
    if (search) {
      const buildSearchFilter = (search: string): Prisma.UserWhereInput[] => [
        {
          firstname: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastname: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          primaryNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
      const parts = search.split(' ');
      if (parts.length !== 0) {
        where.AND = [];
        for (const part of parts) {
          if (part.trim()) {
            where.AND.push({
              OR: buildSearchFilter(part.trim()),
            });
          }
        }
      }
    }

    const totalUsers = await this.prisma.user.count({
      where,
    });
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: Prisma.SortOrder.asc },
      skip: pagination.skip,
      take: pagination.take,
    });
    const response = await this.utilsService.batchable(users, async (user) => {
      return {
        ...user,
        profileImage: user.profileImage
          ? this.getProfileImageUrl(user.profileImage)
          : null,
      };
    });

    return {
      count: totalUsers,
      skip: pagination.skip,
      take: pagination.take,
      data: response,
    };
  }

  async getProfile(sellerId: string): Promise<Seller> {
    const seller = await this.prisma.seller.findUniqueOrThrow({
      where: { id: sellerId },
    });

    if (seller.profileImage) {
      seller.profileImage = this.storageService.getFileUrl(
        seller.profileImage,
        this.config.profileImagePath,
      );
    }
    return seller;
  }

  async updateProfileDetailsByAdministrator(data: {
    sellerId: string;
    businessName?: string;
    contactEmail?: string;
    dialCode?: string;
    contactPhone?: string;
    password?: string;
  }): Promise<Seller> {
    return await this.prisma.$transaction(async (tx) => {
      // Step 1: Basic details update karo
      const seller = await this.updateProfileDetails(
        {
          sellerId: data.sellerId,
          businessName: data.businessName,
          contactEmail: data.contactEmail,
          dialCode: data.dialCode,
          contactPhone: data.contactPhone,
        },
        { tx },
      );

      // Step 2: Password bhi update karna hai?
      if (data.password) {
        const { salt, hash } = this.hashPassword(data.password);

        await tx.sellerMeta.update({
          data: {
            passwordHash: hash,
            passwordSalt: salt,
          },
          where: { sellerId: data.sellerId },
        });
      }

      return seller;
    });
  }
}
