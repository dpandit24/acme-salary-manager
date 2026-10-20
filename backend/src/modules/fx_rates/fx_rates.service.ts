import { Injectable } from '@nestjs/common';
import { to_usd_minor } from '../../common/money';
import { FxRatesRepository } from './fx_rates.repository';

/** The frozen USD snapshot. One rate per currency, one `as_of` for the whole table. */
export class FxSnapshot {
  constructor(
    private readonly rates: ReadonlyMap<string, number>,
    readonly as_of: string | null,
  ) {}

  to_usd_minor(amount_minor: number, currency: string): number {
    const rate = this.rates.get(currency);
    if (rate === undefined) throw new Error(`No FX rate for ${currency} in the snapshot`);
    return to_usd_minor(amount_minor, rate);
  }
}

/** The snapshot is frozen data that changes only when the table is reloaded, so a short cache is safe. */
export const FX_SNAPSHOT_CACHE_MS = 60_000;

@Injectable()
export class FxRatesService {
  private cached: { snapshot: Promise<FxSnapshot>; loaded_at: number } | null = null;

  constructor(private readonly fx_rates_repository: FxRatesRepository) {}

  get_snapshot(): Promise<FxSnapshot> {
    if (this.cached && Date.now() - this.cached.loaded_at < FX_SNAPSHOT_CACHE_MS) return this.cached.snapshot;
    const snapshot = this.load_snapshot();
    this.cached = { snapshot, loaded_at: Date.now() };
    snapshot.catch(() => (this.cached = null));
    return snapshot;
  }

  clear_cache(): void {
    this.cached = null;
  }

  private async load_snapshot(): Promise<FxSnapshot> {
    const rows = await this.fx_rates_repository.find_all();
    const as_of = rows.reduce<string | null>((latest, row) => (latest === null || row.as_of > latest ? row.as_of : latest), null);
    return new FxSnapshot(new Map(rows.map((row) => [row.currency, row.rate_to_usd_ppm])), as_of);
  }
}
