import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FxRate } from './entities/fx_rate.entity';
import { FxRatesRepository } from './fx_rates.repository';
import { FxRatesService } from './fx_rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([FxRate])],
  providers: [FxRatesRepository, FxRatesService],
  exports: [FxRatesService],
})
export class FxRatesModule {}
