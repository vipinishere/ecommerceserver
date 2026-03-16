import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { JwtPayload, UserType } from '@Common';
import { SendCodeRequestType } from './dto';
import { UsersService } from '../users';
import {
  OtpContext,
  OtpService,
  SendCodeResponse,
  VerifyCodeResponse,
} from '../otp';
import { OtpTransport, User } from '../generated/prisma/client';
import { SellerService } from '../seller/seller.service';

export type ValidAuthResponse = {
  accessToken: string;
  expiresIn: number;
  type: UserType;
};

export type InvalidVerifyCodeResponse = {
  email: VerifyCodeResponse;
  mobile?: VerifyCodeResponse;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly sellerService: SellerService,
  ) {}

  private async generateJwt(
    payload: JwtPayload,
    options?: JwtSignOptions,
  ): Promise<{ token: string; expiresIn: number }> {
    const token = await this.jwtService.signAsync(payload, options);
    const { iat, exp } = this.jwtService.decode(token);

    return { token, expiresIn: exp - iat };
  }

  async sendCode(
    target: string,
    transport: OtpTransport,
    type: SendCodeRequestType,
  ): Promise<SendCodeResponse> {
    if (type === SendCodeRequestType.Register) {
      if (
        transport === OtpTransport.Email &&
        (await this.usersService.isEmailExist(target))
      ) {
        throw new Error('Email already in use');
      }
      if (
        transport === OtpTransport.Mobile &&
        (await this.usersService.isPrimaryNumberExist(target))
      ) {
        throw new Error('Mobile already in use');
      }

      return await this.otpService.send({
        context: OtpContext.Register,
        target,
        ...(transport === OtpTransport.Email
          ? {
              transport,
              transportParams: {
                username: 'User',
              },
            }
          : { transport }),
      });
    }

    throw new Error('Unknown send code request type found');
  }

  async login(userId: string, type: UserType): Promise<ValidAuthResponse> {
    const { token, expiresIn } = await this.generateJwt({
      sub: userId,
      type,
    });
    return {
      accessToken: token,
      expiresIn,
      type,
    };
  }

  async registerUser(data: {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    dialCode?: string;
    primaryNumber: string;
    alternativeNumber?: string;
    emailVerificationCode: string;
    mobileVerificationCode?: string;
  }): Promise<InvalidVerifyCodeResponse | ValidAuthResponse> {
    const [verifyEmailOtpResponse, verifyMobileOtpResponse] = await Promise.all(
      [
        this.otpService.verify(
          data.emailVerificationCode,
          data.email,
          OtpTransport.Email,
        ),
        data.primaryNumber &&
          this.otpService.verify(
            data.mobileVerificationCode || '',
            data.primaryNumber,
            OtpTransport.Mobile,
          ),
      ],
    );
    if (
      !verifyEmailOtpResponse.status ||
      (verifyMobileOtpResponse && !verifyMobileOtpResponse.status)
    ) {
      return {
        email: verifyEmailOtpResponse,
        mobile: verifyMobileOtpResponse || undefined,
      };
    }

    const user = await this.usersService.create({
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      password: data.password,
      dialCode: data.dialCode,
      primaryNumber: data.primaryNumber,
      alternativeNumber: data.alternativeNumber ?? '',
    });
    const { token, expiresIn } = await this.generateJwt({
      sub: user.id,
      type: UserType.User,
    });
    return {
      accessToken: token,
      expiresIn,
      type: UserType.User,
    };
  }

  async registerSeller(data: {
    businessName: string;
    contactEmail: string;
    dialCode: string;
    contactPhone: string;
    password: string;
    emailVerificationCode: string;
  }): Promise<InvalidVerifyCodeResponse | ValidAuthResponse> {
    // OTP verify karo
    const verifyEmailOtpResponse = await this.otpService.verify(
      data.emailVerificationCode,
      data.contactEmail,
      OtpTransport.Email,
    );

    if (!verifyEmailOtpResponse.status) {
      return { email: verifyEmailOtpResponse };
    }

    // Seller create karo
    const seller = await this.sellerService.create({
      businessName: data.businessName,
      contactEmail: data.contactEmail,
      dialCode: data.dialCode,
      contactPhone: data.contactPhone,
      password: data.password,
    });

    // JWT generate karo
    const { token, expiresIn } = await this.generateJwt({
      sub: seller.id,
      type: UserType.Seller,
    });

    return {
      accessToken: token,
      expiresIn,
      type: UserType.Seller,
    };
  }

  async forgotPassword(
    email?: string,
    mobile?: string,
  ): Promise<{ email?: SendCodeResponse; mobile?: SendCodeResponse }> {
    return await this.usersService.sendResetPasswordVerificationCode(
      email,
      mobile,
    );
  }

  async resetPassword(
    code: string,
    newPassword: string,
    mobile?: string,
    email?: string,
  ): Promise<User> {
    return await this.usersService.resetPassword(
      code,
      newPassword,
      mobile,
      email,
    );
  }
}
