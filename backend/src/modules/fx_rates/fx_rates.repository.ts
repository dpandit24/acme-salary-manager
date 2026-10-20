import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FxRate } from './entities/fx_rate.entity';

@Injectable()
export class FxRatesRepository {
  constructor(@InjectRepository(FxRate) private readonly fx_rates: Repository<FxRate>) {}

  find_all(): Promise<FxRate[]> {
    return this.fx_rates.find({ order: { currency: 'ASC' } });
  }
}
