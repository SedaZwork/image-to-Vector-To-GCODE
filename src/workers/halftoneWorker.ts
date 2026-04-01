// Dedicated Web Worker for halftone processing
// This runs in a separate thread to avoid blocking the UI

import { HalftoneOptions, HalftoneDot } from '../types';

// Bayer matrix for ordered dithering
const BAYER_MATRIX_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

interface WorkerMessage {
  type: 'PROCESS_HALFTONE';
  payload: {
    imageData: ImageData;
    options: HalftoneOptions;
    id: string;
  };
}

interface WorkerResponse {
  type: 'HALFTONE_COMPLETE' | 'HALFTONE_ERROR' | 'HALFTONE_PROGRESS';
  payload: {
    id: string;
    data?: {
      dots: HalftoneDot[];
      width: number;
      height: number;
      originalWidth: number;
      originalHeight: number;
      options: HalftoneOptions;
    };
    error?: string;
    progress?: number;
  };
}

function getPixelGrayValue(data: Uint8ClampedArray, x: number, y: number, width: number): number {
  const index = (y * width + x) * 4;
  return data[index]; // Assume grayscale input
}

function reportProgress(id: string, progress: number): void {
  self.postMessage({
    type: 'HALFTONE_PROGRESS',
    payload: { id, progress }
  } as WorkerResponse);
}

function convertWithOrderedDithering(
  imageData: ImageData, 
  options: HalftoneOptions, 
  id: string
): { dots: HalftoneDot[]; width: number; height: number } {
  const { width, height, data } = imageData;
  const dots: HalftoneDot[] = [];
  const step = Math.max(1, Math.round(options.spacing));
  const totalPixels = Math.ceil(height / step) * Math.ceil(width / step);
  let processedPixels = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const grayValue = getPixelGrayValue(data, x, y, width);
      const matrixX = x % 4;
      const matrixY = y % 4;
      const threshold = (BAYER_MATRIX_4X4[matrixY][matrixX] / 15) * 255;

      let shouldCreateDot = options.invert ? grayValue > threshold : grayValue < threshold;

      if (shouldCreateDot) {
        const intensity = options.invert ? 
          1 - (grayValue / 255) : 
          1 - (grayValue / 255);

        dots.push({
          x,
          y,
          intensity: Math.max(0.1, intensity),
          size: options.dotSize * intensity
        });
      }

      processedPixels++;
      if (processedPixels % 1000 === 0) {
        const progress = Math.round((processedPixels / totalPixels) * 100);
        reportProgress(id, progress);
      }
    }
  }

  return { dots, width, height };
}

function convertWithFloydSteinberg(
  imageData: ImageData, 
  options: HalftoneOptions, 
  id: string
): { dots: HalftoneDot[]; width: number; height: number } {
  const { width, height } = imageData;
  const dots: HalftoneDot[] = [];
  
  // Create working copy for error diffusion
  const workingData = new Float32Array(width * height);
  for (let i = 0; i < workingData.length; i++) {
    const pixelIndex = i * 4;
    workingData[i] = imageData.data[pixelIndex];
  }

  const step = Math.max(1, Math.round(options.spacing));
  const totalPixels = Math.ceil(height / step) * Math.ceil(width / step);
  let processedPixels = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = y * width + x;
      const oldPixel = workingData[index];
      
      let newPixel: number;
      let shouldCreateDot: boolean;

      if (options.invert) {
        newPixel = oldPixel > options.threshold ? 255 : 0;
        shouldCreateDot = newPixel === 255;
      } else {
        newPixel = oldPixel < options.threshold ? 0 : 255;
        shouldCreateDot = newPixel === 0;
      }

      const error = oldPixel - newPixel;

      // Distribute error to neighboring pixels
      if (x + step < width) {
        workingData[index + step] += error * 7/16;
      }
      if (y + step < height) {
        if (x > 0) {
          workingData[(y + step) * width + (x - step)] += error * 3/16;
        }
        workingData[(y + step) * width + x] += error * 5/16;
        if (x + step < width) {
          workingData[(y + step) * width + (x + step)] += error * 1/16;
        }
      }

      if (shouldCreateDot) {
        const intensity = options.invert ? 
          oldPixel / 255 : 
          1 - (oldPixel / 255);

        dots.push({
          x,
          y,
          intensity: Math.max(0.1, intensity),
          size: options.dotSize * intensity
        });
      }

      processedPixels++;
      if (processedPixels % 500 === 0) {
        const progress = Math.round((processedPixels / totalPixels) * 100);
        reportProgress(id, progress);
      }
    }
  }

  return { dots, width, height };
}

function convertWithThreshold(
  imageData: ImageData, 
  options: HalftoneOptions, 
  id: string
): { dots: HalftoneDot[]; width: number; height: number } {
  const { width, height, data } = imageData;
  const dots: HalftoneDot[] = [];
  const step = Math.max(1, Math.round(options.spacing));
  const totalPixels = Math.ceil(height / step) * Math.ceil(width / step);
  let processedPixels = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const grayValue = getPixelGrayValue(data, x, y, width);
      
      let shouldCreateDot: boolean;
      let intensity: number;

      if (options.invert) {
        shouldCreateDot = grayValue > options.threshold;
        intensity = grayValue / 255;
      } else {
        shouldCreateDot = grayValue < options.threshold;
        intensity = 1 - (grayValue / 255);
      }

      if (shouldCreateDot) {
        dots.push({
          x,
          y,
          intensity: Math.max(0.1, intensity),
          size: options.dotSize * intensity
        });
      }

      processedPixels++;
      if (processedPixels % 1000 === 0) {
        const progress = Math.round((processedPixels / totalPixels) * 100);
        reportProgress(id, progress);
      }
    }
  }

  return { dots, width, height };
}

// Main message handler
self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { type, payload } = e.data;
  
  if (type !== 'PROCESS_HALFTONE') {
    return;
  }

  const { imageData, options, id } = payload;
  
  try {
    reportProgress(id, 0);
    
    let result: { dots: HalftoneDot[]; width: number; height: number };
    
    switch (options.algorithm) {
      case 'ordered':
        result = convertWithOrderedDithering(imageData, options, id);
        break;
      case 'floyd-steinberg':
        result = convertWithFloydSteinberg(imageData, options, id);
        break;
      case 'random':
        result = convertWithThreshold(imageData, options, id);
        break;
      default:
        throw new Error(`Unknown algorithm: ${options.algorithm}`);
    }

    reportProgress(id, 100);

    const halftoneData = {
      ...result,
      originalWidth: result.width,
      originalHeight: result.height,
      options
    };

    self.postMessage({
      type: 'HALFTONE_COMPLETE',
      payload: { id, data: halftoneData }
    } as WorkerResponse);

  } catch (error) {
    self.postMessage({
      type: 'HALFTONE_ERROR',
      payload: { 
        id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    } as WorkerResponse);
  }
};

// Handle worker errors
self.onerror = function(error) {
  console.error('Worker error:', error);
};

// Export for TypeScript
export {};