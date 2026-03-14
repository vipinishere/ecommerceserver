import { join } from 'node:path';
import { Cache } from 'cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { adminConfigFactory } from '@Config';
import {
  StorageService,
  UtilsService,
  ValidatedUser,
  UserType,
  getAccessGuardCacheKey,
} from '@Common';
import { PrismaService } from '../prisma';
import {
  Admin,
  AdminMeta,
  AdminStatus,
  Prisma,
} from '../generated/prisma/client';

@Injectable()
export class AdminService {
  constructor(
    @Inject(adminConfigFactory.KEY)
    private readonly config: ConfigType<typeof adminConfigFactory>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly storageService: StorageService,
  ) {}

  // ─── HELPERS ─────────────────────────────────────────────────

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

  // ─── EXISTENCE CHECKS ─────────────────────────────────────────

  async isEmailExist(email: string, excludeAdminId?: string): Promise<boolean> {
    return (
      (await this.prisma.admin.count({
        where: {
          email: email.toLowerCase(),
          NOT: { id: excludeAdminId },
        },
      })) !== 0
    );
  }

  // ─── GETTERS ──────────────────────────────────────────────────

  async getById(adminId: string): Promise<Admin> {
    return await this.prisma.admin.findUniqueOrThrow({
      where: { id: adminId },
    });
  }

  async getByEmail(email: string): Promise<Admin | null> {
    return await this.prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async getMetaById(adminId: string): Promise<AdminMeta> {
    return await this.prisma.adminMeta.findUniqueOrThrow({
      where: { adminId },
    });
  }

  // ─── AUTHENTICATE ─────────────────────────────────────────────

  async authenticate(adminId: string, password: string): Promise<Admin> {
    const admin = await this.getById(adminId);
    const validation = await this.validateCredentials(admin.email, password);

    if (validation === null) throw new Error('Admin not found');
    if (validation === false) throw new Error('Incorrect password');

    return admin;
  }

  // ─── VALIDATE CREDENTIALS ────────────────────────────────────

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidatedUser | false | null> {
    const admin = await this.getByEmail(email);
    if (!admin) return null;

    if (admin.status !== AdminStatus.ACTIVE) {
      throw new Error(
        'Your account has been temporarily suspended/blocked by the system',
      );
    }

    const adminMeta = await this.getMetaById(admin.id);
    const passwordHash = this.utilsService.hashPassword(
      password,
      adminMeta.passwordSalt || '',
      adminMeta.passwordHash
        ? adminMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (adminMeta.passwordHash === passwordHash) {
      return {
        id: admin.id,
        type: UserType.Admin,
      };
    }

    return false;
  }

  // ─── GET PROFILE ──────────────────────────────────────────────

  async getProfile(adminId: string): Promise<Admin> {
    const admin = await this.getById(adminId);
    if (admin.profileImage) {
      admin.profileImage = this.getProfileImageUrl(admin.profileImage);
    }
    return admin;
  }

  // ─── UPDATE PROFILE DETAILS ───────────────────────────────────

  async updateProfileDetails(
    adminId: string,
    data: {
      firstname?: string;
      lastname?: string;
      email?: string;
    },
    options?: { tx?: Prisma.TransactionClient },
  ): Promise<Admin> {
    const prismaClient = options?.tx ? options.tx : this.prisma;

    if (data.email && (await this.isEmailExist(data.email, adminId))) {
      throw new Error('Email already exists');
    }

    return await prismaClient.admin.update({
      data: {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email && data.email.toLowerCase(),
      },
      where: { id: adminId },
    });
  }

  // ─── UPDATE PROFILE IMAGE ─────────────────────────────────────

  async updateProfileImage(
    adminId: string,
    profileImage: string,
  ): Promise<{ profileImage: string | null }> {
    const admin = await this.getById(adminId);

    return await this.prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id: adminId },
        data: { profileImage },
      });

      if (admin.profileImage) {
        await this.storageService.removeFile(
          join(this.config.profileImagePath, admin.profileImage),
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

  // ─── CHANGE PASSWORD ──────────────────────────────────────────

  async changePassword(
    adminId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<Admin> {
    const admin = await this.getById(adminId);
    const adminMeta = await this.getMetaById(admin.id);

    const hashedOldPassword = this.utilsService.hashPassword(
      oldPassword,
      adminMeta.passwordSalt || '',
      adminMeta.passwordHash
        ? adminMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (hashedOldPassword !== adminMeta.passwordHash) {
      throw new Error('Password does not match');
    }

    const { salt, hash } = this.hashPassword(newPassword);

    await this.prisma.adminMeta.update({
      data: {
        passwordHash: hash,
        passwordSalt: salt,
      },
      where: { adminId },
    });

    return admin;
  }

  // ─── SET STATUS ───────────────────────────────────────────────

  async setStatus(adminId: string, status: AdminStatus): Promise<Admin> {
    await this.cacheManager.del(
      getAccessGuardCacheKey({ id: adminId, type: UserType.Admin }),
    );
    return await this.prisma.admin.update({
      data: { status },
      where: { id: adminId },
    });
  }
}
