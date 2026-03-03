import { IColorDetectionStrategy } from './IColorDetectionStrategy';
import { Region } from '@/types/calendar';
import { mergeOverlappingRegions } from '../utils/region';

export class CanvasStrategy implements IColorDetectionStrategy {
  name = 'Canvas (Fast)';

  async detectRedRegions(imageData: ImageData): Promise<Region[]> {
    const { width, height, data } = imageData;
    const regions: Region[] = [];
    const visited = new Set<number>();

    const isRed = (r: number, g: number, b: number): boolean => {
      return r > 150 && g < 100 && b < 100;
    };

    const findCluster = (startX: number, startY: number): Region => {
      const stack: [number, number][] = [[startX, startY]];
      let minX = startX,
        maxX = startX;
      let minY = startY,
        maxY = startY;

      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const idx = y * width + x;

        if (visited.has(idx) || x < 0 || x >= width || y < 0 || y >= height) {
          continue;
        }

        const pixelIdx = idx * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];

        if (!isRed(r, g, b)) {
          continue;
        }

        visited.add(idx);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
      }

      return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      };
    };

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (isRed(r, g, b) && !visited.has(y * width + x)) {
          const region = findCluster(x, y);
          if (region.width > 5 && region.height > 5) {
            regions.push(region);
          }
        }
      }
    }

    return mergeOverlappingRegions(regions);
  }
}
