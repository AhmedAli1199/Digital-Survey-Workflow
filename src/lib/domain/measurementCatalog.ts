export type MeasurementDefinition = {
  key: string;
  label: string;
  placeholder?: string;
};

const DEFAULTS: Record<string, MeasurementDefinition> = {
  length_mm: { key: 'length_mm', label: 'Overall length (mm)', placeholder: 'e.g., 450' },
  max_diameter_mm: {
    key: 'max_diameter_mm',
    label: 'Maximum diameter / width (mm)',
    placeholder: 'e.g., 220',
  },
  flange_od_mm: { key: 'flange_od_mm', label: 'Flange OD (mm)', placeholder: 'e.g., 260' },
  pipe_dn: { key: 'pipe_dn', label: 'Pipe size (DN)', placeholder: 'e.g., 80' },

  dim_a_mm: { key: 'dim_a_mm', label: 'Dimension A (mm)', placeholder: 'e.g., 450' },
  dim_b_mm: { key: 'dim_b_mm', label: 'Dimension B (mm)', placeholder: 'e.g., 320' },
};

export function getMeasurementDefinition(key: string): MeasurementDefinition {
  return (
    DEFAULTS[key] ?? {
      key,
      label: key
        .replace(/_mm$/i, ' (mm)')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase()),
    }
  );
}
