import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';
import { Logger } from '@nestjs/common';

const prisma = new PrismaClient();
const admin_phone = process.env.ADMIN_PHONE_NUMBER;
const admin_password = process.env.ADMIN_PASSWORD;
const admin_role = process.env.ADMIN_ROLE;
const admin_name = process.env.ADMIN_NAME;
const admin_surname = process.env.ADMIN_SURNAME;
const logger = new Logger();

if (!admin_phone || !admin_password || !admin_role) {
  throw new Error('Missing admin env variables ⚠️');
}

const main = async () => {
  const hashedPass = await bcrypt.hash(admin_password, 12);

  const findUser = await prisma.user.findUnique({
    where: { phone_number: admin_phone },
  });

  if (!findUser) {
    await prisma.user.create({
      data: {
        address: 'System Adminstrator',
        first_name: admin_name as string,
        last_name: admin_surname as string,
        phone_number: admin_phone,
        password: hashedPass,
        role: admin_role as Role,
      },
    });
    logger.log('Admin created successfully ✅');
  } else if (findUser.role !== admin_role) {
    await prisma.user.update({
      where: { phone_number: admin_phone },
      data: { role: admin_role as Role },
    });
    logger.log('Role added successfully ✅');
  } else {
    logger.log('Admin user already exists with correct role');
  }
};

void (async () => {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
