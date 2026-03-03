import Tesseract from 'tesseract.js';
import { Region } from '@/types/calendar';

export interface OCRResult {
  text: string;
  region: Region;
  confidence: number;
}

export interface OCRTextResult {
  text: string;
  confidence: number;
}

/**
 * Extracts text from multiple regions of an image using OCR.
 * Each region is preprocessed (upsampled, contrast-enhanced) for better accuracy.
 *
 * @param imageFile - The source image file
 * @param regions - Array of regions (bounding boxes) to extract text from
 * @returns Promise of OCR results with text, region info, and confidence scores
 *
 * @example
 * const results = await extractTextFromRegions(file, [
 *   { x: 100, y: 200, width: 50, height: 30 }
 * ]);
 */
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

/**
 * Extracts all text from an entire image using OCR.
 * The image is preprocessed (upsampled, contrast-enhanced) for better accuracy.
 * Useful for reading text from screenshots and other full-image sources.
 *
 * @param imageFile - The source image file
 * @returns Promise of OCR result with full text and confidence score
 *
 * @example
 * const result = await extractTextFromImage(screenshotFile);
 * console.log(result.text);
 */
export async function extractTextFromImage(imageFile: File): Promise<OCRTextResult> {
  const preprocessedBlob = await preprocessImageForOCR(imageFile);

  const result = await Tesseract.recognize(preprocessedBlob, 'eng', {
    logger: () => {},
    errorHandler: () => {},
  });

  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
  };
}

async function preprocessImageForOCR(imageFile: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(imageFile);
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');

  const minWidth = 1200;
  const scale = img.width < minWidth ? minWidth / img.width : 1;
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrast = gray < 165 ? 0 : 255;

    data[i] = contrast;
    data[i + 1] = contrast;
    data[i + 2] = contrast;
  }

  ctx.putImageData(imageData, 0, 0);

  const blob = await canvasToBlob(canvas);
  URL.revokeObjectURL(imageUrl);
  return blob;
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
