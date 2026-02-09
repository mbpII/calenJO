import { IColorDetectionStrategy } from './IColorDetectionStrategy';
import { Region } from '@/types/calendar';

declare global {
  interface Window {
    cv: any;
  }
}

export class OpenCVStrategy implements IColorDetectionStrategy {
  name = 'OpenCV (Robust)';
  private cvLoaded = false;
  
  async detectRedRegions(imageData: ImageData): Promise<Region[]> {
    await this.loadOpenCV();
    
    if (!window.cv) {
      throw new Error('OpenCV failed to load');
    }
    
    const cv = window.cv;
    const { width, height, data } = imageData;
    
    // Create Mat from ImageData
    const mat = new cv.Mat(height, width, cv.CV_8UC4);
    mat.data.set(data);
    
    // Convert to HSV for better color detection
    const hsv = new cv.Mat();
    cv.cvtColor(mat, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
    
    // Create masks for red color (HSV ranges for red)
    // Red appears at both ends of HSV hue spectrum (0-10 and 170-180)
    const lowerRed1 = new cv.Mat(height, width, cv.CV_8UC3, [0, 50, 30, 0]);
    const upperRed1 = new cv.Mat(height, width, cv.CV_8UC3, [10, 255, 255, 0]);
    const lowerRed2 = new cv.Mat(height, width, cv.CV_8UC3, [170, 50, 30, 0]);
    const upperRed2 = new cv.Mat(height, width, cv.CV_8UC3, [180, 255, 255, 0]);
    
    const mask1 = new cv.Mat();
    const mask2 = new cv.Mat();
    cv.inRange(hsv, lowerRed1, upperRed1, mask1);
    cv.inRange(hsv, lowerRed2, upperRed2, mask2);
    
    // Combine masks
    const mask = new cv.Mat();
    cv.bitwise_or(mask1, mask2, mask);
    
    // Clean up noise with morphological operations
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
    
    // Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    // Extract regions from contours
    const regions: Region[] = [];
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      // Filter out small noise regions
      if (rect.width > 10 && rect.height > 10) {
        regions.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        });
      }
      
      contour.delete();
    }
    
    // Cleanup
    mat.delete();
    hsv.delete();
    lowerRed1.delete();
    upperRed1.delete();
    lowerRed2.delete();
    upperRed2.delete();
    mask1.delete();
    mask2.delete();
    mask.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
    
    return this.mergeOverlappingRegions(regions);
  }
  
  private async loadOpenCV(): Promise<void> {
    if (this.cvLoaded || window.cv?.Mat) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      script.onload = () => {
        // Wait for OpenCV to be fully initialized
        const waitForCV = () => {
          if (window.cv?.Mat) {
            this.cvLoaded = true;
            resolve();
          } else {
            setTimeout(waitForCV, 100);
          }
        };
        waitForCV();
      };
      script.onerror = () => reject(new Error('Failed to load OpenCV'));
      document.body.appendChild(script);
    });
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
