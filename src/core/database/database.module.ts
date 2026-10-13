import { Global, Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import bcrypt from 'bcrypt';

@Global()
@Module({
  providers: [PrismaService, RedisService],
  exports: [PrismaService, RedisService],
})
export class DatabaseModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminRole = process.env.ADMIN_ROLE || 'admin';
    const adminName = process.env.ADMIN_NAME || 'Admin';
    const adminSurname = process.env.ADMIN_SURNAME || 'User';

    if (!adminPhone || !adminPassword) {
      console.log('⚠️ Admin environment variables missing, skipping seed.');
      return;
    }

    const findUser = await this.prisma.user.findUnique({
      where: { phone_number: adminPhone },
    });

    if (!findUser) {
      const hashedPass = await bcrypt.hash(adminPassword, 12);
      await this.prisma.user.create({
        data: {
          address: 'System Administrator',
          first_name: adminName,
          last_name: adminSurname,
          phone_number: adminPhone,
          password: hashedPass,
          role: adminRole as any,
        },
      });
      console.log('✅ Admin created successfully via auto-seed');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
  }
}
