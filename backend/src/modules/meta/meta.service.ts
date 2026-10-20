import { Injectable } from '@nestjs/common';
import { COMPENSATION_REASONS, COUNTRIES, CURRENCIES, DEPARTMENTS, LEVELS } from '../../common/reference_data';
import { FxRatesService } from '../fx_rates/fx_rates.service';

export interface Meta {
  countries: { code: string; name: string; default_currency: string }[];
  departments: string[];
  levels: string[];
  currencies: string[];
  reasons: string[];
  fx_rates_as_of: string | null;
}

@Injectable()
export class MetaService {
  constructor(private readonly fx_rates_service: FxRatesService) {}

  async get_meta(): Promise<Meta> {
    const snapshot = await this.fx_rates_service.get_snapshot();
    return {
      countries: COUNTRIES.map((country) => ({ ...country })),
      departments: DEPARTMENTS,
      levels: LEVELS,
      currencies: CURRENCIES,
      reasons: [...COMPENSATION_REASONS],
      fx_rates_as_of: snapshot.as_of,
    };
  }
}
