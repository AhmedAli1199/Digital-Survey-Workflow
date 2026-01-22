-- Phase 1 placeholder data (SAFE TO DELETE later)
-- Keep this intentionally small.

insert into public.pricing_rules (complexity_level, base_price, obstruction_multiplier)
values
  (1, 150.00, 1.30),
  (2, 275.00, 1.30)
on conflict (complexity_level) do update
set base_price = excluded.base_price,
    obstruction_multiplier = excluded.obstruction_multiplier;

-- Mandatory photos across all assets in Phase 1
-- overall, side, connection, tape_length, tape_diameter

insert into public.asset_type_configs (
  asset_type,
  display_name,
  asset_category,
  min_complexity_level,
  level1_measurement_keys,
  level2_template,
  required_photo_types
)
values
  (
    'straight_pipe',
    'Straight Pipework',
    'Pipes',
    1,
    array['length_mm','max_diameter_mm','pipe_dn'],
    null,
    array['overall','side','connection','tape_length','tape_diameter']
  ),
  (
    'basic_flange',
    'Basic Flange',
    'Flanges',
    1,
    array['length_mm','max_diameter_mm','flange_od_mm','pipe_dn'],
    null,
    array['overall','side','connection','tape_length','tape_diameter']
  ),
  (
    'check_valve',
    'Check Valve',
    'Valves',
    2,
    array[]::text[],
    jsonb_build_object(
      'drawing_url', null,
      'steps', jsonb_build_array(
        jsonb_build_object('key','dim_a_mm','label','Dimension A (Inlet to Outlet)','requiresPhoto', true, 'sequence', 1),
        jsonb_build_object('key','dim_b_mm','label','Dimension B (Body Height)','requiresPhoto', true, 'sequence', 2),
        jsonb_build_object('key','flange_od_mm','label','Flange OD','requiresPhoto', true, 'sequence', 3)
      )
    ),
    array['overall','side','connection','tape_length','tape_diameter']
  ),
  (
    'y_strainer',
    'Y-Strainer',
    'Strainers',
    2,
    array[]::text[],
    jsonb_build_object(
      'drawing_url', null,
      'steps', jsonb_build_array(
        jsonb_build_object('key','dim_a_mm','label','Dimension A (Inlet to Outlet)','requiresPhoto', true, 'sequence', 1),
        jsonb_build_object('key','dim_b_mm','label','Dimension B (Overall Height)','requiresPhoto', true, 'sequence', 2),
        jsonb_build_object('key','pipe_dn','label','Pipe Size (DN)','requiresPhoto', false, 'sequence', 3)
      )
    ),
    array['overall','side','connection','tape_length','tape_diameter']
  )
on conflict (asset_type) do update
set display_name = excluded.display_name,
  asset_category = excluded.asset_category,
    min_complexity_level = excluded.min_complexity_level,
    level1_measurement_keys = excluded.level1_measurement_keys,
    level2_template = excluded.level2_template,
    required_photo_types = excluded.required_photo_types;
