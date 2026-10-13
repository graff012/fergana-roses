import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { UpdateUserDto } from './dto/update-user.dto';

interface RequestWithUser extends Request {
  user?: { id: string; role: string };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Roles('admin')
  @Get()
  async getAllUsers() {
    return await this.usersService.getAllUsers();
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles('admin')
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return await this.usersService.getUserById(id);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
    @Req() req: RequestWithUser,
  ) {
    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user?.id === id;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You are not allowed to do this');
    }

    return await this.usersService.updateUser(id, data);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Req() req: RequestWithUser) {
    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user?.id === id;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You are not allowed to do this');
    }

    return await this.usersService.remove(id);
  }
}
