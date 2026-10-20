import { Module } from '@nestjs/common';
import { FxRatesModule } from '../fx_rates/fx_rates.module';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';

@Module({
  imports: [FxRatesModule],
  controllers: [MetaController],
  providers: [MetaService],
  exports: [MetaService],
})
export class MetaModule {}
