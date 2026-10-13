import { Module } from '@nestjs/common';
import { FlowersService } from './flowers.service';
import { FlowersController } from './flowers.controller';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      dest: './public/images',
    }),
  ],
  controllers: [FlowersController],
  providers: [FlowersService],
})
export class FlowersModule {}
