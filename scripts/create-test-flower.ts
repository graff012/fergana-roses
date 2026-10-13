import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // First, check if we have any categories
  const categories = await prisma.category.findMany();
  
  if (categories.length === 0) {
    console.log('No categories found. Creating a test category...');
    await prisma.category.create({
      data: {
        name: 'Test Category',
      },
    });
    console.log('Test category created');
  }
  
  // Get the first category
  const category = await prisma.category.findFirst();
  
  if (!category) {
    throw new Error('Failed to find or create a category');
  }
  
  // Create a test flower
  console.log('Creating a test flower...');
  const flower = await prisma.flower.create({
    data: {
      name: 'Test Rose',
      smell: 'STRONG',
      flower_size: 'MEDIUM',
      height: '30cm',
      price: '19.99',
      img_url: '/images/test-rose.jpg',
      category: {
        connect: { id: category.id },
      },
    },
    include: {
      category: true,
    },
  });
  
  console.log('Test flower created:');
  console.log(flower);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
