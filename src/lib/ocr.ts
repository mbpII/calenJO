import Tesseract from 'tesseract.js';
import { Region } from '@/types/calendar';

export interface OCRResult {
  text: string;
  region: Region;
  confidence: number;
}

export async function extractTextFromRegions(
  imageFile: File, 
  regions: Region[]
): Promise<OCRResult[]> {
  // Load image
  const imageUrl = URL.createObjectURL(imageFile);
  const img = await loadImage(imageUrl);
  
  const results: OCRResult[] = [];
  
  for (const region of regions) {
    // Extract region as canvas
    const canvas = document.createElement('canvas');
    canvas.width = region.width;
    canvas.height = region.height;
    const ctx = canvas.getContext('2d')!;
    
    ctx.drawImage(
      img,
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height
    );
    
    // Convert to blob for Tesseract
    const blob = await canvasToBlob(canvas);
    
    try {
      const result = await Tesseract.recognize(blob, 'eng', {
        logger: () => {}, // Suppress progress logs
      });
      
      if (result.data.text.trim()) {
        results.push({
          text: result.data.text.trim(),
          region,
          confidence: result.data.confidence
        });
      }
    } catch (error) {
      console.warn('OCR failed for region:', region, error);
    }
  }
  
  URL.revokeObjectURL(imageUrl);
  return results;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas to Blob conversion failed'));
    }, 'image/png');
  });
}
