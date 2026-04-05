import type { CSSProperties } from "react";

export interface CropPosition {
  x: number;
  y: number;
  scale: number;
}

export const DEFAULT_CROP_POSITION: CropPosition = {
  x: 50,
  y: 50,
  scale: 1,
};

export function normalizeCropPosition(
  cropPosition?: Partial<CropPosition> | null,
): CropPosition {
  return {
    x: cropPosition?.x ?? DEFAULT_CROP_POSITION.x,
    y: cropPosition?.y ?? DEFAULT_CROP_POSITION.y,
    scale: cropPosition?.scale ?? DEFAULT_CROP_POSITION.scale,
  };
}

export function getCoverImageStyle(
  cropPosition?: Partial<CropPosition> | null,
): CSSProperties {
  const position = normalizeCropPosition(cropPosition);

  return {
    objectPosition: `${position.x}% ${position.y}%`,
    transform: `scale(${position.scale})`,
    transformOrigin: `${position.x}% ${position.y}%`,
  };
}
