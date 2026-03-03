export const COLOR_THRESHOLDS = {
  RED_CANVAS: {
    minRed: 150,
    maxGreen: 100,
    maxBlue: 100,
  },
  RED_OPENCV_HSV: {
    lower1: { hue: [0, 10], saturation: [50, 255], value: [30, 255] },
    lower2: { hue: [170, 180], saturation: [50, 255], value: [30, 255] },
  },
  MIN_REGION_SIZE: {
    canvas: { width: 5, height: 5 },
    opencv: { width: 10, height: 10 },
  },
} as const;

export const OCR_CONFIG = {
  MIN_WIDTH: 1200,
  CONTRAST_THRESHOLD: 165,
  MAX_DIMENSION: 4096,
  LANGUAGE: 'eng',
} as const;
