import { Region } from '@/types/calendar';

export interface IColorDetectionStrategy {
  name: string;
  detectRedRegions(imageData: ImageData): Promise<Region[]>;
}
