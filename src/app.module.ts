import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FlowersModule } from './modules/flowers/flowers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { OrderItemsModule } from './modules/order-items/order-items.module';
@Module({
  imports: [CoreModule, AuthModule, UsersModule, FlowersModule, CategoriesModule, OrdersModule, OrderItemsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
