export interface Measurement {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  bicep_cm?: number | null;
  thigh_cm?: number | null;
  body_fat_pct?: number | null;
  created_at: string;
}

export interface MeasurementCreate {
  measured_at?: string;
  weight_kg?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  bicep_cm?: number;
  thigh_cm?: number;
  body_fat_pct?: number;
}

export interface ProgressSummary {
  latest_weight_kg?: number | null;
  weight_change_kg?: number | null;
  trend_direction: 'gaining' | 'losing' | 'maintaining' | 'no_data';
  total_entries: number;
  latest_measurement?: Measurement | null;
  history: Measurement[];
}
