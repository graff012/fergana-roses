import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/create-auth.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
// import { OtpService } from './otp.service';
// import { VerifyOtpDto } from './dto/verify-otp.dto';
// import { LoginPhoneAndPasswordDto } from './dto/login-phone-password.dto';
// import { LoginPhoneNumberDto } from './dto/login-phone-number.dto';

// Brute-force protection: 5 failed attempts -> 5 minute block per phone number.
// In-memory is enough for a single-instance deployment (Railway default).
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 5 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<
    string,
    { fails: number; blockedUntil: number }
  >();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private checkLoginThrottle(phoneNumber: string) {
    const record = this.loginAttempts.get(phoneNumber);
    if (record && record.blockedUntil > Date.now()) {
      const secondsLeft = Math.ceil((record.blockedUntil - Date.now()) / 1000);
      throw new UnauthorizedException(
        `Juda ko'p urinish. ${secondsLeft} soniyadan so'ng qayta urinib ko'ring.`,
      );
    }
  }

  private recordFailedLogin(phoneNumber: string) {
    const record = this.loginAttempts.get(phoneNumber) ?? {
      fails: 0,
      blockedUntil: 0,
    };
    record.fails += 1;
    if (record.fails >= MAX_LOGIN_ATTEMPTS) {
      record.blockedUntil = Date.now() + LOGIN_BLOCK_MS;
      record.fails = 0;
    }
    this.loginAttempts.set(phoneNumber, record);
  }

  private clearLoginAttempts(phoneNumber: string) {
    this.loginAttempts.delete(phoneNumber);
  }

  private mapUserProfile(user: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    role: string;
    address: string | null;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      role: user.role,
      address: user.address,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        role: true,
        address: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return this.mapUserProfile(user);
  }

  async register(registerDto: RegisterDto) {
    if (
      !registerDto.phoneNumber ||
      !registerDto.firstName ||
      !registerDto.lastName
    ) {
      throw new ConflictException('Missing required fields');
    }

    const user = await this.prismaService.user.findUnique({
      where: { phone_number: registerDto.phoneNumber },
    });

    if (user) {
      throw new ConflictException('User already exists');
    }

    await this.prismaService.user.create({
      data: {
        first_name: registerDto.firstName,
        address: registerDto.address,
        last_name: registerDto.lastName,
        phone_number: registerDto.phoneNumber,
      },
    });

    // await this.otpService.sendOtp(registerDto.phone_number);

    return {
      message: 'user register success',
    };
  }

  async login(loginDto: LoginDto) {
    const phoneNumber = loginDto.phoneNumber?.trim();
    if (!phoneNumber) {
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    }

    this.checkLoginThrottle(phoneNumber);

    // Generic error on purpose: must not reveal whether the phone is registered.
    const invalidCredentials = (): never => {
      this.recordFailedLogin(phoneNumber);
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    };

    const user = await this.prismaService.user.findUnique({
      where: {
        phone_number: phoneNumber,
      },
    });

    // Direct throw here so TypeScript narrows `user` to non-null below.
    // Same generic message: must not reveal whether the phone is registered.
    if (!user) {
      this.recordFailedLogin(phoneNumber);
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    }

    // Admin panel login must never accept a non-admin account.
    if (loginDto.isAdmin && user.role !== 'admin') invalidCredentials();

    // Admin accounts always require a password (no phone-only login).
    if (!user.password || user.role === 'admin') {
      // Direct throw (not the helper) so TypeScript narrows `user.password`.
      if (!loginDto.password || !user.password) {
        this.recordFailedLogin(phoneNumber);
        throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );
      if (!isPasswordValid) invalidCredentials();
    }

    // Passwordless login (regular users without a password only).
    const payload = {
      userId: user.id,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);
    this.clearLoginAttempts(phoneNumber);

    return {
      message: 'Login successful',
      token,
    };
  }

  // this login is for otp
  // async login(loginDto: LoginDto) {
  //   const user = await this.prismaService.user.findUnique({
  //     where: { phoneNumber: loginDto.phoneNumber },
  //   });
  //
  //   if (!user || !user.isPhoneVerified) {
  //     throw new NotFoundException('User not found or not verified');
  //   }
  //
  //   await this.otpService.sendOtp(loginDto.phoneNumber);
  //
  //   return { message: 'OTP sent to phone number' };
  // }
  //
  // async verifyOtpUser(verifyOtpDto: VerifyOtpDto) {
  //   const key = `user:${verifyOtpDto.phone_number}`;
  //
  //   const sessionToken = await this.otpService.verifyOtpSendUser(
  //     key,
  //     verifyOtpDto.code,
  //     verifyOtpDto.phone_number
  //   );
  //
  //   return {
  //     message: 'OTP verified successfully',
  //     session_token: sessionToken,
  //   };
  // }

  // async logout(req: Request) {
  //   const userId = req.userId;

  //   // Optional: clear session from Redis
  //   // await this.otpService.delSessionTokenUser(`session_token:${userId}`);

  //   return { message: 'Successfully logged out' };
  // }
}
