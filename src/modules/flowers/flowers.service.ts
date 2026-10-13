import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFlowerDto } from './dto/create-flower.dto';
import { UpdateFlowerDto } from './dto/update-flower.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { S3Service } from '../../core/storage/s3/s3.service';

interface ToggleLikeResult {
  message: string;
  isLiked: boolean;
}

@Injectable()
export class FlowersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async create(createFlowerDto: CreateFlowerDto, file?: Express.Multer.File) {
    let imgKey: string | null = null;

    if (file) {
      try {
        imgKey = await this.s3Service.uploadFile(file, 'flowers');
        console.log('Image stored with reference:', imgKey);
      } catch (err) {
        console.error('Failed to store uploaded image:', err);
        throw new Error('Failed to store uploaded image');
      }
    }

    const { categoryId, ...flowerData } = createFlowerDto;

    const flower = await this.prismaService.flower.create({
      data: {
        name: flowerData.name,
        smell: flowerData.smell,
        flower_size: flowerData.flowerSize,
        height: flowerData.height,
        price: flowerData.price,
        img_url: imgKey,
        stock: flowerData.stock ?? 0,
        category: {
          connect: { id: categoryId },
        },
      },
      include: {
        category: true,
      },
    });

    const imgUrl = await this.s3Service.resolveFileUrl(imgKey);

    return {
      message: 'Flower added successfully',
      flower: {
        ...flower,
        flowerSize: flower.flower_size,
        imgUrl,
        categoryId: flower.category?.id,
      },
    };
  }

  async findAll(userId?: string) {
    console.log('Fetching flowers for user:', userId);

    try {
      const flowers = await this.prismaService.flower.findMany({
        include: {
          liked_by: {
            where: userId ? { user_id: userId } : undefined,
            select: { user_id: true },
          },
          category: true,
        },
      });

      console.log(`Found ${flowers.length} flowers`);

      if (!flowers || flowers.length === 0) {
        console.log('No flowers found in the database');
        return [];
      }

      // Process each flower and generate presigned URLs
      const processedFlowers = await Promise.all(
        flowers.map(async (flower) => {
          const isLiked = flower.liked_by && flower.liked_by.length > 0;
          const { liked_by, ...flowerData } = flower;

          const imgUrl = await this.s3Service.resolveFileUrl(flower.img_url);

          const processedFlower = {
            ...flowerData,
            isLiked,
            flowerSize: flower.flower_size,
            imgUrl,
            categoryId: flower.category?.id,
          };

          return processedFlower;
        }),
      );

      return processedFlowers;
    } catch (error) {
      console.error('Error in flowersService.findAll:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const flower = await this.prismaService.flower.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!flower) throw new NotFoundException('Flower not found');

    const imgUrl = await this.s3Service.resolveFileUrl(flower.img_url);

    return {
      ...flower,
      flowerSize: flower.flower_size,
      imgUrl,
      categoryId: flower.category?.id,
    };
  }

  async update(
    id: string,
    updateFlowerDto: UpdateFlowerDto,
    file?: Express.Multer.File,
  ) {
    const existingFlower = await this.prismaService.flower.findUnique({
      where: { id },
    });

    if (!existingFlower) throw new NotFoundException('Flower not found');

    let imgKey = existingFlower.img_url;

    if (file) {
      try {
        imgKey = await this.s3Service.uploadFile(file, 'flowers');
        console.log('New image stored with reference:', imgKey);

        if (existingFlower.img_url) {
          try {
            await this.s3Service.deleteFile(existingFlower.img_url);
            console.log(
              'Old image deleted successfully:',
              existingFlower.img_url,
            );
          } catch (deleteError) {
            console.error('Failed to delete old image:', deleteError);
          }
        }
      } catch (err) {
        console.error('Failed to store new image:', err);
        throw new Error('Failed to store uploaded image');
      }
    }

    const { categoryId, ...flowerData } = updateFlowerDto;

    const updateData: any = {
      img_url: imgKey,
    };

    if (flowerData.name !== undefined && flowerData.name !== '')
      updateData.name = flowerData.name;
    if (flowerData.smell !== undefined && flowerData.smell !== '')
      updateData.smell = flowerData.smell;
    if (flowerData.flowerSize !== undefined && flowerData.flowerSize !== '')
      updateData.flower_size = flowerData.flowerSize;
    if (flowerData.height !== undefined && flowerData.height !== '')
      updateData.height = flowerData.height;
    if (flowerData.price !== undefined && flowerData.price !== '')
      updateData.price = flowerData.price;
    if (flowerData.stock !== undefined) updateData.stock = flowerData.stock;

    if (categoryId) {
      updateData.category = {
        connect: { id: categoryId },
      };
    }

    const flower = await this.prismaService.flower.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    const imgUrl = await this.s3Service.resolveFileUrl(imgKey);

    return {
      message: 'Flower updated successfully',
      flower: {
        ...flower,
        flowerSize: flower.flower_size,
        imgUrl,
        categoryId: flower.category?.id,
      },
    };
  }

  async remove(id: string) {
    const flower = await this.prismaService.flower.findUnique({
      where: { id },
    });

    if (!flower) {
      throw new NotFoundException(`Flower with ID ${id} not found`);
    }

    if (flower.img_url) {
      try {
        await this.s3Service.deleteFile(flower.img_url);
        console.log('Image deleted successfully:', flower.img_url);
      } catch (error) {
        console.error('Failed to delete image from S3:', error);
      }
    }

    await this.prismaService.flower.delete({
      where: { id },
    });

    return {
      message: 'Flower deleted successfully',
    };
  }

  async toggleLike(
    flowerId: string,
    userId: string,
  ): Promise<ToggleLikeResult> {
    // Check if flower exists
    const flower = await this.prismaService.flower.findUnique({
      where: { id: flowerId },
    });

    if (!flower) {
      throw new NotFoundException('Flower not found');
    }

    // Check if user exists
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already liked the flower
    const existingLike = await this.prismaService.userLikes.findUnique({
      where: {
        user_id_flower_id: {
          user_id: userId,
          flower_id: flowerId,
        },
      },
    });

    if (existingLike) {
      // Unlike the flower
      await this.prismaService.userLikes.delete({
        where: {
          user_id_flower_id: {
            user_id: userId,
            flower_id: flowerId,
          },
        },
      });

      return {
        message: 'Successfully unliked the flower',
        isLiked: false,
      };
    } else {
      // Like the flower
      await this.prismaService.userLikes.create({
        data: {
          user_id: userId,
          flower_id: flowerId,
        },
      });

      return {
        message: 'Successfully liked the flower',
        isLiked: true,
      };
    }
  }

  async uploadImageToS3(file: Express.Multer.File): Promise<string> {
    try {
      return await this.s3Service.uploadFile(file, 'flowers');
    } catch (error) {
      console.error('Failed to store image:', error);
      throw new Error('Failed to store image');
    }
  }
}
