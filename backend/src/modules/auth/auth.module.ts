import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { HrUser } from './entities/hr_user.entity';
import { UserSession } from './entities/user_session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HrUser, UserSession])],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
