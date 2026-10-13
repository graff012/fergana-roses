import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderItemsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createOrderItemDto: CreateOrderItemDto) {
    try {
      const { flower_id, order_id, ...orderItemData } = createOrderItemDto;

      const orderItem = await this.prismaService.orderItem.create({
        data: {
          ...orderItemData,
          flower: { connect: { id: flower_id } },
          order: { connect: { id: order_id } },
        },
        include: {
          order: true,
          flower: true,
        },
      });

      return {
        message: 'Order item created successfully',
        orderItem,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async findAll() {
    const orderItems = await this.prismaService.orderItem.findMany({
      include: {
        order: true,
        flower: true,
      },
    });
    if (!orderItems) return [];

    return orderItems;
  }

  async findOne(id: string) {
    const orderItem = await this.prismaService.orderItem.findUnique({
      where: { id },
      include: {
        flower: true,
        order: true,
      },
    });

    if (!orderItem) throw new NotFoundException('Order item not found');

    return orderItem;
  }

  async update(id: string, updateOrderItemDto: UpdateOrderItemDto) {
    const orderItem = await this.prismaService.orderItem.findUnique({
      where: { id },
    });

    console.log('order item...: ', orderItem);

    if (!orderItem) throw new NotFoundException('order item not found');

    const updateData: any = {};

    // Only include fields that are provided in the DTO
    if (updateOrderItemDto.quantity !== undefined)
      updateData.quantity = updateOrderItemDto.quantity;
    if (updateOrderItemDto.flower_id !== undefined) {
      updateData.flower = { connect: { id: updateOrderItemDto.flower_id } };
    }
    if (updateOrderItemDto.order_id !== undefined) {
      updateData.order = { connect: { id: updateOrderItemDto.order_id } };
    }
    if (updateOrderItemDto.price !== undefined) {
      updateData.price = updateOrderItemDto.price;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const updateOrderItem = await this.prismaService.orderItem.update({
      where: { id },
      data: updateData,
      include: {
        order: true,
        flower: true,
      },
    });

    return plainToInstance(UpdateOrderItemDto, updateOrderItem);
  }

  async remove(id: string) {
    try {
      const deletedItem = await this.prismaService.orderItem.delete({
        where: { id },
      });

      return {
        message: 'Order Item deleted successfully',
        deletedItem,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('order item not found');
      }

      throw err;
    }
  }
}
