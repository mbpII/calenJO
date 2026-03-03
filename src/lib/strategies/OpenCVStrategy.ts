import { IColorDetectionStrategy } from './IColorDetectionStrategy';
import { Region } from '@/types/calendar';
import { mergeOverlappingRegions } from '../utils/region';

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

    const mat = new cv.Mat(height, width, cv.CV_8UC4);
    mat.data.set(data);

    const hsv = new cv.Mat();
    cv.cvtColor(mat, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

    const lowerRed1 = new cv.Mat(height, width, cv.CV_8UC3, [0, 50, 30, 0]);
    const upperRed1 = new cv.Mat(height, width, cv.CV_8UC3, [10, 255, 255, 0]);
    const lowerRed2 = new cv.Mat(height, width, cv.CV_8UC3, [170, 50, 30, 0]);
    const upperRed2 = new cv.Mat(height, width, cv.CV_8UC3, [180, 255, 255, 0]);

    const mask1 = new cv.Mat();
    const mask2 = new cv.Mat();
    cv.inRange(hsv, lowerRed1, upperRed1, mask1);
    cv.inRange(hsv, lowerRed2, upperRed2, mask2);

    const mask = new cv.Mat();
    cv.bitwise_or(mask1, mask2, mask);

    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const regions: Region[] = [];
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);

      if (rect.width > 10 && rect.height > 10) {
        regions.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
      }

      contour.delete();
    }

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

    return mergeOverlappingRegions(regions);
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
}
