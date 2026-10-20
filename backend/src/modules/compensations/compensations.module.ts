import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FxRatesModule } from '../fx_rates/fx_rates.module';
import { CompensationsController } from './compensations.controller';
import { CompensationsRepository } from './compensations.repository';
import { CompensationsService } from './compensations.service';
import { Compensation } from './entities/compensation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Compensation]), FxRatesModule],
  controllers: [CompensationsController],
  providers: [CompensationsRepository, CompensationsService],
  exports: [CompensationsService],
})
export class CompensationsModule {}
