import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Users ===');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone_number: true,
      role: true,
    },
  });
  console.log(users);

  console.log('\n=== Flowers ===');
  const flowers = await prisma.flower.findMany({
    select: {
      id: true,
      name: true,
      price: true,
    },
    take: 5, // Just get first 5 flowers
  });
  console.log(flowers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
