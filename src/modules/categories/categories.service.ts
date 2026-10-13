import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const category = await this.prismaService.category.create({
      data: createCategoryDto,
    });

    return {
      message: 'Category created successfully',
      category,
    };
  }

  async findAll() {
    const categories = await this.prismaService.category.findMany();

    if (!categories) return [];

    return { categories };
  }

  async findOne(id: string) {
    const category = await this.prismaService.category.findUnique({
      where: { id },
    });

    if (!category) throw new NotFoundException('Category not Found');

    return { category };
  }

  async update(id: string, data: CreateCategoryDto) {
    try {
      const category = await this.prismaService.category.update({
        where: { id },
        data: { name: data.name },
      });

      return {
        message: 'category successfully updated',
        category,
      };
    } catch (err) {
      console.error(err);
      throw new NotFoundException('category not found or smth went wrong');
    }
  }

  async remove(id: string) {
    try {
      const deletedUser = await this.prismaService.category.delete({
        where: { id },
      });

      return {
        message: 'category deleted successfully',
        deletedUser,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('category not found');
      }

      throw err;
    }
  }
}
