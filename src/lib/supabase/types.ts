export type SurveyStatus = 'in_progress' | 'complete' | 'synced';

export type SurveyRow = {
  id: string;
  client_name: string;
  site_name: string;
  site_address: string | null;
  survey_date: string; // YYYY-MM-DD
  surveyor_name: string;
  project_reference: string | null;
  general_notes: string | null;
  status: SurveyStatus;
  created_at: string;
  updated_at: string;
};

export type AssetRow = {
  id: string;
  survey_id: string;
  asset_tag: string;
  asset_type: string;
  quantity: number;
  location_area: string | null;
  service: string | null;
  complexity_level: 1 | 2;
  obstruction_present: boolean;
  obstruction_type: string | null;
  obstruction_offset_mm: string | number | null;
  obstruction_notes: string | null;
  calculated_price: string | number | null;
  created_at: string;
  updated_at: string;
};

export type AssetTypeConfigRow = {
  asset_type: string;
  display_name: string;
  min_complexity_level: 1 | 2;
  level1_measurement_keys: string[];
  level2_template: any | null;
  required_photo_types: string[];
};
