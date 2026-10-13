import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { OrderItemsService } from './order-items.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  // @UseGuards(AuthGuard)
  @Post('create')
  async create(@Body() createOrderItemDto: CreateOrderItemDto) {
    return await this.orderItemsService.create(createOrderItemDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll() {
    return await this.orderItemsService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.orderItemsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrderItemDto: UpdateOrderItemDto,
  ) {
    return await this.orderItemsService.update(id, updateOrderItemDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.orderItemsService.remove(id);
  }
}
