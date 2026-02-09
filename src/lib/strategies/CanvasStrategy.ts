import { IColorDetectionStrategy } from './IColorDetectionStrategy';
import { Region } from '@/types/calendar';

export class CanvasStrategy implements IColorDetectionStrategy {
  name = 'Canvas (Fast)';
  
  async detectRedRegions(imageData: ImageData): Promise<Region[]> {
    const { width, height, data } = imageData;
    const regions: Region[] = [];
    const visited = new Set<number>();
    
    // Red detection thresholds (RGB)
    const isRed = (r: number, g: number, b: number): boolean => {
      return r > 150 && g < 100 && b < 100;
    };
    
    // Find connected components of red pixels
    const findCluster = (startX: number, startY: number): Region => {
      const stack: [number, number][] = [[startX, startY]];
      let minX = startX, maxX = startX;
      let minY = startY, maxY = startY;
      
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
        
        // Check neighbors (8-connected)
        stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
      }
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      };
    };
    
    // Scan image for red regions
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        if (isRed(r, g, b) && !visited.has(y * width + x)) {
          const region = findCluster(x, y);
          // Filter out tiny noise regions
          if (region.width > 5 && region.height > 5) {
            regions.push(region);
          }
        }
      }
    }
    
    // Merge overlapping regions
    return this.mergeOverlappingRegions(regions);
  }
  
  private mergeOverlappingRegions(regions: Region[]): Region[] {
    if (regions.length === 0) return [];
    
    const merged: Region[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;
      
      let current = { ...regions[i] };
      used.add(i);
      
      let mergedNew = true;
      while (mergedNew) {
        mergedNew = false;
        for (let j = 0; j < regions.length; j++) {
          if (used.has(j)) continue;
          
          const other = regions[j];
          if (this.regionsOverlap(current, other)) {
            current = this.mergeTwoRegions(current, other);
            used.add(j);
            mergedNew = true;
          }
        }
      }
      
      merged.push(current);
    }
    
    return merged;
  }
  
  private regionsOverlap(r1: Region, r2: Region): boolean {
    return !(r1.x + r1.width < r2.x || 
             r2.x + r2.width < r1.x || 
             r1.y + r1.height < r2.y || 
             r2.y + r2.height < r1.y);
  }
  
  private mergeTwoRegions(r1: Region, r2: Region): Region {
    const minX = Math.min(r1.x, r2.x);
    const minY = Math.min(r1.y, r2.y);
    const maxX = Math.max(r1.x + r1.width, r2.x + r2.width);
    const maxY = Math.max(r1.y + r1.height, r2.y + r2.height);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}
