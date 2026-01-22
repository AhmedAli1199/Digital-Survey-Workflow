export type NormalizedHotspot = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type HotspotOverlay = {
  key: string;
  label: string;
  hotspot?: NormalizedHotspot | null;
};
