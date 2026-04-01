export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
  quality?: number;
}

export interface ProcessedImageResult {
  canvas: HTMLCanvasElement;
  originalDimensions: ImageDimensions;
  newDimensions: ImageDimensions;
  aspectRatio: number;
}

export class ImageProcessingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

export class ImageProcessor {
  private static readonly SUPPORTED_FORMATS = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
  ];

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  static validateFile(file: File): void {
    if (!file) {
      throw new ImageProcessingError('No file provided', 'NO_FILE');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new ImageProcessingError(
        `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
        'FILE_TOO_LARGE'
      );
    }

    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      throw new ImageProcessingError(
        `Unsupported file type: ${file.type}. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`,
        'UNSUPPORTED_FORMAT'
      );
    }
  }

  static async loadImageFromFile(file: File): Promise<ProcessedImageResult> {
    try {
      this.validateFile(file);

      return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new ImageProcessingError('Cannot get canvas context', 'CANVAS_ERROR');
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const result: ProcessedImageResult = {
              canvas,
              originalDimensions: { width: img.width, height: img.height },
              newDimensions: { width: img.width, height: img.height },
              aspectRatio: img.width / img.height
            };

            URL.revokeObjectURL(img.src);
            resolve(result);
          } catch (error) {
            URL.revokeObjectURL(img.src);
            reject(error instanceof ImageProcessingError ? error : 
              new ImageProcessingError(`Failed to process image: ${error}`, 'PROCESSING_ERROR'));
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject(new ImageProcessingError('Failed to load image file', 'LOAD_ERROR'));
        };

        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      throw error instanceof ImageProcessingError ? error : 
        new ImageProcessingError(`Failed to load image: ${error}`, 'LOAD_ERROR');
    }
  }

  static convertToGrayscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new ImageProcessingError('Cannot get canvas context', 'CANVAS_ERROR');
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];
        
        // Use luminance formula for better grayscale conversion
        const gray = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
        
        data[i] = gray;     // Red
        data[i + 1] = gray; // Green  
        data[i + 2] = gray; // Blue
        // Alpha channel (i + 3) remains unchanged
      }

      ctx.putImageData(imageData, 0, 0);
      return canvas;
    } catch (error) {
      throw error instanceof ImageProcessingError ? error :
        new ImageProcessingError(`Failed to convert to grayscale: ${error}`, 'GRAYSCALE_ERROR');
    }
  }

  static resizeImage(
    canvas: HTMLCanvasElement, 
    options: ResizeOptions = {}
  ): ProcessedImageResult {
    try {
      const {
        maxWidth,
        maxHeight,
        maintainAspectRatio = true,
        quality = 1
      } = options;

      const originalWidth = canvas.width;
      const originalHeight = canvas.height;
      const aspectRatio = originalWidth / originalHeight;

      let newWidth = originalWidth;
      let newHeight = originalHeight;

      if (maxWidth || maxHeight) {
        if (maintainAspectRatio) {
          if (maxWidth && maxHeight) {
            const widthRatio = maxWidth / originalWidth;
            const heightRatio = maxHeight / originalHeight;
            const ratio = Math.min(widthRatio, heightRatio);
            
            newWidth = Math.round(originalWidth * ratio);
            newHeight = Math.round(originalHeight * ratio);
          } else if (maxWidth) {
            newWidth = Math.min(maxWidth, originalWidth);
            newHeight = Math.round(newWidth / aspectRatio);
          } else if (maxHeight) {
            newHeight = Math.min(maxHeight, originalHeight);
            newWidth = Math.round(newHeight * aspectRatio);
          }
        } else {
          newWidth = maxWidth || originalWidth;
          newHeight = maxHeight || originalHeight;
        }
      }

      if (newWidth === originalWidth && newHeight === originalHeight) {
        return {
          canvas,
          originalDimensions: { width: originalWidth, height: originalHeight },
          newDimensions: { width: newWidth, height: newHeight },
          aspectRatio
        };
      }

      const newCanvas = document.createElement('canvas');
      const ctx = newCanvas.getContext('2d');
      
      if (!ctx) {
        throw new ImageProcessingError('Cannot get canvas context', 'CANVAS_ERROR');
      }

      newCanvas.width = newWidth;
      newCanvas.height = newHeight;

      // Enable smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = quality === 1 ? 'high' : 'medium';

      ctx.drawImage(canvas, 0, 0, newWidth, newHeight);

      return {
        canvas: newCanvas,
        originalDimensions: { width: originalWidth, height: originalHeight },
        newDimensions: { width: newWidth, height: newHeight },
        aspectRatio
      };
    } catch (error) {
      throw error instanceof ImageProcessingError ? error :
        new ImageProcessingError(`Failed to resize image: ${error}`, 'RESIZE_ERROR');
    }
  }

  static extractImageData(canvas: HTMLCanvasElement): ImageData {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new ImageProcessingError('Cannot get canvas context', 'CANVAS_ERROR');
      }

      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      throw error instanceof ImageProcessingError ? error :
        new ImageProcessingError(`Failed to extract image data: ${error}`, 'EXTRACT_ERROR');
    }
  }

  static getImageInfo(canvas: HTMLCanvasElement): {
    width: number;
    height: number;
    aspectRatio: number;
    pixelCount: number;
  } {
    return {
      width: canvas.width,
      height: canvas.height,
      aspectRatio: canvas.width / canvas.height,
      pixelCount: canvas.width * canvas.height
    };
  }

  static async processImageFile(
    file: File,
    options: {
      convertToGrayscale?: boolean;
      resize?: ResizeOptions;
    } = {}
  ): Promise<ProcessedImageResult> {
    try {
      let result = await this.loadImageFromFile(file);
      
      if (options.convertToGrayscale) {
        this.convertToGrayscale(result.canvas);
      }
      
      if (options.resize) {
        result = this.resizeImage(result.canvas, options.resize);
      }
      
      return result;
    } catch (error) {
      throw error instanceof ImageProcessingError ? error :
        new ImageProcessingError(`Failed to process image file: ${error}`, 'PROCESS_ERROR');
    }
  }
}