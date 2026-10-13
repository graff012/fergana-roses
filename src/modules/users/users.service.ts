import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  private sanitizeUser(user: {
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

  async getAllUsers() {
    const users = await this.prismaService.user.findMany();

    if (!users) return [];

    return users.map((user) => this.sanitizeUser(user));
  }

  async getUserById(id: string) {
    const user = await this.prismaService.user.findFirst({
      where: { id },
    });

    if (!user) throw new NotFoundException('User not found');

    return this.sanitizeUser(user);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException('User not found');

    if (updateUserDto.role !== undefined && updateUserDto.role !== user.role) {
      throw new BadRequestException('Changing the role is not allowed');
    }

    const updateData: any = {};

    // Only include fields that are provided in the DTO
    if (updateUserDto.first_name !== undefined)
      updateData.first_name = updateUserDto.first_name;
    if (updateUserDto.last_name !== undefined)
      updateData.last_name = updateUserDto.last_name;
    if (updateUserDto.phone_number !== undefined)
      updateData.phone_number = updateUserDto.phone_number;
    if (updateUserDto.password !== undefined) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: updateData,
    });

    return this.sanitizeUser(updatedUser);
  }

  async remove(id: string) {
    try {
      const deletedUser = await this.prismaService.user.delete({
        where: { id },
      });

      return {
        message: 'User deleted successfully',
        deletedUser,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }

      throw err;
    }
  }
}
