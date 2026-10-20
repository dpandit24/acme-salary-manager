import { CompensationReason } from '../../../common/reference_data';

/** Compensation as returned by the API and by CompensationsService to other modules. */
export interface CompensationView {
  id: string;
  employee_id: string;
  effective_from: string;
  amount_minor: number;
  currency: string;
  reason: CompensationReason;
  note: string | null;
  amount_usd_minor: number;
  created_at: Date;
  updated_at: Date;
}

export interface NewCompensation {
  effective_from: string;
  amount_minor: number;
  currency: string;
  reason: CompensationReason;
  note?: string | null;
}
