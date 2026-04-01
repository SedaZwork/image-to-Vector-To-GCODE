export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
  maintainAspectRatio?: boolean;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

export class ImageCompressor {
  private static readonly DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.8,
    mimeType: 'image/jpeg',
    maintainAspectRatio: true
  };

  static async compressImage(
    file: File, 
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Cannot get canvas context');
          }

          // Calculate new dimensions
          const { width: newWidth, height: newHeight } = this.calculateDimensions(
            img.width,
            img.height,
            config.maxWidth,
            config.maxHeight,
            config.maintainAspectRatio
          );

          canvas.width = newWidth;
          canvas.height = newHeight;

          // Enable smooth scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw and compress
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const compressedFile = new File(
                [blob], 
                this.generateCompressedFilename(file.name, config.mimeType),
                { type: config.mimeType }
              );

              const result: CompressionResult = {
                file: compressedFile,
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: Math.round((1 - blob.size / file.size) * 100),
                width: newWidth,
                height: newHeight
              };

              URL.revokeObjectURL(img.src);
              resolve(result);
            },
            config.mimeType,
            config.quality
          );
        } catch (error) {
          URL.revokeObjectURL(img.src);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image for compression'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return {
        width: Math.min(originalWidth, maxWidth),
        height: Math.min(originalHeight, maxHeight)
      };
    }

    const aspectRatio = originalWidth / originalHeight;
    
    let width = originalWidth;
    let height = originalHeight;

    // Scale down if needed
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  private static generateCompressedFilename(originalName: string, mimeType: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const extension = mimeType.split('/')[1];
    return `${nameWithoutExt}_compressed.${extension}`;
  }

  static shouldCompress(file: File, thresholdMB: number = 5): boolean {
    const thresholdBytes = thresholdMB * 1024 * 1024;
    return file.size > thresholdBytes;
  }

  static getCompressionRecommendation(file: File): {
    shouldCompress: boolean;
    reason: string;
    suggestedOptions: CompressionOptions;
  } {
    const sizeMB = file.size / (1024 * 1024);
    
    if (sizeMB < 1) {
      return {
        shouldCompress: false,
        reason: 'File is already small enough',
        suggestedOptions: {}
      };
    }

    if (sizeMB < 5) {
      return {
        shouldCompress: false,
        reason: 'File size is acceptable',
        suggestedOptions: {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 0.9
        }
      };
    }

    if (sizeMB < 10) {
      return {
        shouldCompress: true,
        reason: 'Large file - compression recommended for better performance',
        suggestedOptions: {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.8
        }
      };
    }

    return {
      shouldCompress: true,
      reason: 'Very large file - compression strongly recommended',
      suggestedOptions: {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.7
      }
    };
  }

  static async compressIfNeeded(
    file: File,
    options: CompressionOptions & { autoCompress?: boolean } = {}
  ): Promise<{ file: File; wasCompressed: boolean; result?: CompressionResult }> {
    const { autoCompress = true, ...compressionOptions } = options;
    
    if (!autoCompress || !this.shouldCompress(file)) {
      return { file, wasCompressed: false };
    }

    try {
      const result = await this.compressImage(file, compressionOptions);
      
      // Only use compressed version if it's significantly smaller
      if (result.compressionRatio > 10) {
        return { file: result.file, wasCompressed: true, result };
      } else {
        return { file, wasCompressed: false };
      }
    } catch (error) {
      console.warn('Compression failed, using original file:', error);
      return { file, wasCompressed: false };
    }
  }
}