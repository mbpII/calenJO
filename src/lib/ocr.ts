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
    // Extract region as canvas with preprocessing
    const canvas = document.createElement('canvas');
    // Upsample small regions for better OCR accuracy (minimum 100px)
    const scale = Math.max(1, 100 / Math.min(region.width, region.height));
    canvas.width = Math.round(region.width * scale);
    canvas.height = Math.round(region.height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    // Use better image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw scaled image
    ctx.drawImage(
      img,
      region.x, region.y, region.width, region.height,
      0, 0, canvas.width, canvas.height
    );
    
    // Apply image preprocessing for better OCR
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale and increase contrast
    for (let i = 0; i < data.length; i += 4) {
      // Grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Increase contrast (threshold at 128)
      const contrast = gray < 128 ? 0 : 255;
      
      data[i] = contrast;     // R
      data[i + 1] = contrast; // G
      data[i + 2] = contrast; // B
      // Keep alpha unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to blob for Tesseract
    const blob = await canvasToBlob(canvas);
    
    try {
      // Configure Tesseract for better accuracy
      const result = await Tesseract.recognize(blob, 'eng', {
        logger: () => {}, // Suppress progress logs
        errorHandler: () => {}, // Suppress error logs
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
    img.crossOrigin = 'anonymous';
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
