import { join } from 'node:path';
import { Cache } from 'cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  StorageService,
  UserType,
  UtilsService,
  ValidatedUser,
  getAccessGuardCacheKey,
} from '@Common';
import { userConfigFactory } from '@Config';
import { PrismaService } from '../prisma';
import {
  OtpContext,
  OtpService,
  SendCodeResponse,
  VerifyCodeResponse,
} from '../otp';
import {
  OtpTransport,
  Prisma,
  User,
  UserMeta,
  UserStatus,
} from '../generated/prisma/client';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(userConfigFactory.KEY)
    private readonly config: ConfigType<typeof userConfigFactory>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly storageService: StorageService,
    private readonly otpService: OtpService,
    private readonly walletService: WalletService,
  ) {}

  private getProfileImageUrl(profileImage: string): string {
    return this.storageService.getFileUrl(
      profileImage,
      this.config.profileImagePath,
    );
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

  private isValidUsername(username: string): boolean {
    return /^[a-z][a-z0-9_]{3,20}$/.test(username);
  }

  async isEmailExist(email: string, excludeUserId?: string): Promise<boolean> {
    return (
      (await this.prisma.user.count({
        where: {
          email: email.toLowerCase(),
          NOT: {
            id: excludeUserId,
          },
        },
      })) !== 0
    );
  }

  async isPrimaryNumberExist(
    primaryNumber: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.user.count({
        where: {
          primaryNumber,
          NOT: { id: excludeUserId },
        },
      })) !== 0
    );
  }

  async getById(userId: string): Promise<User> {
    return await this.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });
  }

  async getByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  async getByPrimaryNumber(primaryNumber: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: {
        primaryNumber,
      },
    });
  }

  async getMetaById(userId: string): Promise<UserMeta> {
    return await this.prisma.userMeta.findUniqueOrThrow({
      where: {
        userId,
      },
    });
  }

  async getMetaByEmail(email: string): Promise<UserMeta> {
    return await this.prisma.userMeta.findFirstOrThrow({
      where: {
        user: {
          email: email.toLowerCase(),
        },
      },
    });
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidatedUser | false | null> {
    const user = await this.getByEmail(email);
    if (!user) return null;
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error(
        'Your account has been temporarily suspended/blocked by the system. Please contact customer support for assistance',
      );
    }

    const userMeta = await this.getMetaById(user.id);
    const passwordHash = this.utilsService.hashPassword(
      password,
      userMeta.passwordSalt || '',
      userMeta.passwordHash
        ? userMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );
    if (userMeta.passwordHash === passwordHash) {
      return {
        id: user.id,
        type: UserType.User,
      };
    }

    return false;
  }

  async create(data: {
    firstname: string;
    lastname: string;
    primaryNumber: string;
    email: string;
    password?: string;
    dialCode?: string;
    alternativeNumber?: string;
    profileImage?: string;
  }): Promise<User> {
    if (await this.isEmailExist(data.email)) {
      throw new Error('Email already exist');
    }
    if (
      data.primaryNumber &&
      (await this.isPrimaryNumberExist(data.primaryNumber))
    ) {
      throw new Error('Phone Number already exist');
    }

    let passwordSalt = null;
    let passwordHash = null;
    if (data.password) {
      const { salt, hash } = this.hashPassword(data.password);
      passwordSalt = salt;
      passwordHash = hash;
    }

    const user = await this.prisma.user.create({
      data: {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email.toLowerCase(),
        dialCode: data.dialCode ?? '+91',
        primaryNumber: data.primaryNumber,
        profileImage: data.profileImage ?? '',
        meta: {
          create: {
            passwordHash,
            passwordSalt,
          },
        },
      },
    });

    await this.walletService.createWalletAccount(user.id);

    return user;
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.getById(userId);
    if (user.profileImage) {
      user.profileImage = this.getProfileImageUrl(user.profileImage);
    }
    return user;
  }

  async updateProfileDetails(
    data: {
      userId: string;
      firstname?: string;
      lastname?: string;
      email?: string;
      dialCode?: string;
      primaryNumber?: string;
      alternativeNumber?: string;
    },
    options?: { tx?: Prisma.TransactionClient },
  ): Promise<User> {
    const prismaClient = options?.tx ? options.tx : this.prisma;

    if (data.email && (await this.isEmailExist(data.email, data.userId))) {
      throw new Error('Email already exist');
    }
    if (
      data.primaryNumber &&
      (await this.isPrimaryNumberExist(data.primaryNumber, data.userId))
    ) {
      throw new Error('Phone number already exists');
    }

    return await prismaClient.user.update({
      data: {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email && data.email.toLowerCase(),
        dialCode: data.dialCode,
        primaryNumber: data.primaryNumber,
        alternativeNumber: data.alternativeNumber,
      },
      where: {
        id: data.userId,
      },
    });
  }

  async updateProfileDetailsByAdministrator(data: {
    userId: string;
    firstname?: string;
    lastname?: string;
    email?: string;
    dailCode?: string;
    primaryNumber?: string;
    alternativeNumber?: string;
    password?: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      const user = await this.updateProfileDetails(
        {
          userId: data.userId,
          firstname: data.firstname,
          lastname: data.lastname,
          email: data.email,
          dialCode: data.dailCode,
          primaryNumber: data.primaryNumber,
          alternativeNumber: data.alternativeNumber,
        },
        { tx },
      );

      if (data.password) {
        const { salt, hash } = this.hashPassword(data.password);
        const passwordSalt = salt;
        const passwordHash = hash;

        await tx.userMeta.update({
          data: {
            passwordHash,
            passwordSalt,
          },
          where: {
            userId: data.userId,
          },
        });
      }

      return user;
    });
  }

  async updateProfileImage(
    userId: string,
    profileImage: string,
  ): Promise<{ profileImage: string | null }> {
    const user = await this.getById(userId);

    return await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { profileImage },
      });

      if (user.profileImage) {
        // Remove previous profile image from storage
        await this.storageService.removeFile(
          join(this.config.profileImagePath, user.profileImage),
        );
      }
      await this.storageService.move(
        profileImage,
        this.config.profileImagePath,
      );

      return {
        profileImage: this.getProfileImageUrl(profileImage),
      };
    });
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.getById(userId);
    const userMeta = await this.getMetaById(user.id);

    const hashedPassword = this.utilsService.hashPassword(
      oldPassword,
      userMeta.passwordSalt || '',
      userMeta.passwordHash
        ? userMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (hashedPassword !== userMeta.passwordHash)
      throw new Error('Password does not match');

    const { salt, hash } = this.hashPassword(newPassword);
    const passwordSalt = salt;
    const passwordHash = hash;

    await this.prisma.userMeta.update({
      data: {
        passwordHash,
        passwordSalt,
      },
      where: {
        userId,
      },
    });
    return user;
  }

  async sendResetPasswordVerificationCode(email?: string, mobile?: string) {
    let user: User | null | undefined;

    if (email) user = await this.getByEmail(email);
    if (!user && mobile) user = await this.getByPrimaryNumber(mobile);
    if (!user) throw new Error('User does not exist');

    const response: { email?: SendCodeResponse; mobile?: SendCodeResponse } =
      {};

    if (mobile) {
      response.mobile = await this.otpService.send({
        context: OtpContext.ResetPassword,
        target: mobile,
        transport: OtpTransport.Mobile,
      });
    }
    if (email) {
      response.email = await this.otpService.send({
        context: OtpContext.ResetPassword,
        target: email,
        transport: OtpTransport.Email,
        transportParams: {
          username: user.firstname.concat(' ', user.lastname),
        },
      });
    }

    return response;
  }

  async resetPassword(
    code: string,
    newPassword: string,
    mobile?: string,
    email?: string,
  ): Promise<User> {
    // Get user
    let user: User | null | undefined;
    if (email) {
      user = await this.getByEmail(email);
    }
    if (!user && mobile) {
      user = await this.getByPrimaryNumber(mobile);
    }
    if (!user) throw new Error('User not found');

    // Validate code
    let response: VerifyCodeResponse | null | undefined;

    if (mobile)
      response = await this.otpService.verify(
        code,
        mobile,
        OtpTransport.Mobile,
      );
    if (email)
      response = await this.otpService.verify(code, email, OtpTransport.Email);
    if (!response) throw new Error('Invalid email or mobile');
    if (response.status === false)
      throw new Error('Incorrect verification code');

    // Reset password
    const { salt: passwordSalt, hash: passwordHash } =
      this.hashPassword(newPassword);

    await this.prisma.userMeta.update({
      data: {
        passwordSalt,
        passwordHash,
      },
      where: { userId: user.id },
    });
    return user;
  }

  async setStatus(userId: string, status: UserStatus): Promise<User> {
    await this.cacheManager.del(
      getAccessGuardCacheKey({ id: userId, type: UserType.User }),
    );
    return await this.prisma.user.update({
      data: { status },
      where: {
        id: userId,
      },
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
}
