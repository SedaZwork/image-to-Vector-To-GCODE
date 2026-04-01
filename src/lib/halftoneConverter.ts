import { HalftoneOptions, HalftoneData, HalftoneDot } from '@/types';

export class HalftoneConverterError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'HalftoneConverterError';
  }
}

export interface HalftonePreview {
  imageData: ImageData;
  dotCount: number;
}

export class HalftoneConverter {
  private static readonly BAYER_MATRIX_4X4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];

  private static readonly FLOYD_STEINBERG_MATRIX = [
    [0, 0, 7],
    [3, 5, 1]
  ];

  static validateInputs(imageData: ImageData, options: HalftoneOptions): void {
    if (!imageData || !imageData.data) {
      throw new HalftoneConverterError('Invalid image data provided', 'INVALID_IMAGE_DATA');
    }

    if (imageData.width <= 0 || imageData.height <= 0) {
      throw new HalftoneConverterError('Image dimensions must be positive', 'INVALID_DIMENSIONS');
    }

    if (options.dotSize <= 0 || options.dotSize > 100) {
      throw new HalftoneConverterError('Dot size must be between 0 and 100', 'INVALID_DOT_SIZE');
    }

    if (options.spacing <= 0 || options.spacing > 100) {
      throw new HalftoneConverterError('Spacing must be between 0 and 100', 'INVALID_SPACING');
    }

    if (options.threshold < 0 || options.threshold > 255) {
      throw new HalftoneConverterError('Threshold must be between 0 and 255', 'INVALID_THRESHOLD');
    }
  }

  private static getPixelGrayValue(data: Uint8ClampedArray, x: number, y: number, width: number): number {
    const index = (y * width + x) * 4;
    // Assume grayscale input, so R=G=B
    return data[index];
  }

  private static setPixelValue(data: Uint8ClampedArray, x: number, y: number, width: number, value: number): void {
    const index = (y * width + x) * 4;
    data[index] = value;     // R
    data[index + 1] = value; // G
    data[index + 2] = value; // B
    data[index + 3] = 255;   // A
  }

  static convertWithOrderedDithering(imageData: ImageData, options: HalftoneOptions): HalftoneData {
    try {
      this.validateInputs(imageData, options);

      const { width, height, data } = imageData;
      const dots: HalftoneDot[] = [];
      const step = Math.max(1, Math.round(options.spacing));

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const grayValue = this.getPixelGrayValue(data, x, y, width);
          const matrixX = x % 4;
          const matrixY = y % 4;
          const threshold = (this.BAYER_MATRIX_4X4[matrixY][matrixX] / 15) * 255;

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
        }
      }

      return {
        dots,
        width,
        height,
        originalWidth: width,
        originalHeight: height,
        options
      };
    } catch (error) {
      throw error instanceof HalftoneConverterError ? error :
        new HalftoneConverterError(`Ordered dithering failed: ${error}`, 'ORDERED_DITHERING_ERROR');
    }
  }

  static convertWithFloydSteinberg(imageData: ImageData, options: HalftoneOptions): HalftoneData {
    try {
      this.validateInputs(imageData, options);

      const { width, height } = imageData;
      const dots: HalftoneDot[] = [];
      
      // Create a copy of the image data for error diffusion
      const workingData = new Float32Array(width * height);
      for (let i = 0; i < workingData.length; i++) {
        const pixelIndex = i * 4;
        workingData[i] = imageData.data[pixelIndex];
      }

      const step = Math.max(1, Math.round(options.spacing));

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
        }
      }

      return {
        dots,
        width,
        height,
        originalWidth: width,
        originalHeight: height,
        options
      };
    } catch (error) {
      throw error instanceof HalftoneConverterError ? error :
        new HalftoneConverterError(`Floyd-Steinberg dithering failed: ${error}`, 'FLOYD_STEINBERG_ERROR');
    }
  }

  static convertWithThreshold(imageData: ImageData, options: HalftoneOptions): HalftoneData {
    try {
      this.validateInputs(imageData, options);

      const { width, height, data } = imageData;
      const dots: HalftoneDot[] = [];
      const step = Math.max(1, Math.round(options.spacing));

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const grayValue = this.getPixelGrayValue(data, x, y, width);
          
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
        }
      }

      return {
        dots,
        width,
        height,
        originalWidth: width,
        originalHeight: height,
        options
      };
    } catch (error) {
      throw error instanceof HalftoneConverterError ? error :
        new HalftoneConverterError(`Threshold conversion failed: ${error}`, 'THRESHOLD_ERROR');
    }
  }

  static convert(imageData: ImageData, options: HalftoneOptions): HalftoneData {
    try {
      switch (options.algorithm) {
        case 'ordered':
          return this.convertWithOrderedDithering(imageData, options);
        case 'floyd-steinberg':
          return this.convertWithFloydSteinberg(imageData, options);
        case 'random':
          return this.convertWithThreshold(imageData, options);
        default:
          throw new HalftoneConverterError(`Unknown algorithm: ${options.algorithm}`, 'UNKNOWN_ALGORITHM');
      }
    } catch (error) {
      throw error instanceof HalftoneConverterError ? error :
        new HalftoneConverterError(`Conversion failed: ${error}`, 'CONVERSION_ERROR');
    }
  }

  static generateSVG(halftoneData: HalftoneData): string {
    try {
      const { width, height, dots } = halftoneData;
      const svgHeader = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white;">`;
      const svgFooter = '</svg>';
      
      const svgContent = dots.map(dot => {
        const size = dot.size || halftoneData.options.dotSize;
        const opacity = dot.intensity.toFixed(2);
        return `<circle cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${(size / 2).toFixed(2)}" fill="black" fill-opacity="${opacity}" />`;
      }).join('\n');
      
      return `${svgHeader}\n${svgContent}\n${svgFooter}`;
    } catch (error) {
      throw error instanceof HalftoneConverterError ? error :
        new HalftoneConverterError(`SVG generation failed: ${error}`, 'SVG_ERROR');
    }
  }

  static generatePreview(halftoneData: HalftoneData, scale: number = 1): HalftonePreview {
    try {
      const { width, height, dots } = halftoneData;
      const scaledWidth = Math.floor(width * scale);
      const scaledHeight = Math.floor(height * scale);
      
      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new HalftoneConverterError('Cannot get canvas context', 'CANVAS_ERROR');
      }

      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, scaledWidth, scaledHeight);

      // Draw dots
      ctx.fillStyle = 'black';
      dots.forEach(dot => {
        const scaledX = dot.x * scale;
        const scaledY = dot.y * scale;
        const scaledSize = (dot.size || halftoneData.options.dotSize) * scale;
        
        ctx.globalAlpha = dot.intensity;
        ctx.beginPath();
        ctx.arc(scaledX, scaledY, scaledSize / 2, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);

      return {
        imageData,
        dotCount: dots.length
      };
    } catch (error) {
      throw error instanceof HalftoneConverterError ? error :
        new HalftoneConverterError(`Preview generation failed: ${error}`, 'PREVIEW_ERROR');
    }
  }

  static addRandomNoise(halftoneData: HalftoneData, noiseAmount: number = 0.1): HalftoneData {
    try {
      if (noiseAmount <= 0) return halftoneData;

      const noisyDots = halftoneData.dots.map(dot => ({
        ...dot,
        x: dot.x + (Math.random() - 0.5) * noiseAmount * 2,
        y: dot.y + (Math.random() - 0.5) * noiseAmount * 2,
        intensity: Math.max(0.1, Math.min(1, dot.intensity + (Math.random() - 0.5) * noiseAmount))
      }));

      return {
        ...halftoneData,
        dots: noisyDots
      };
    } catch (error) {
      throw error instanceof HalftoneConverterError ? error :
        new HalftoneConverterError(`Adding noise failed: ${error}`, 'NOISE_ERROR');
    }
  }

  static filterDotsByIntensity(halftoneData: HalftoneData, minIntensity: number = 0.1): HalftoneData {
    try {
      const filteredDots = halftoneData.dots.filter(dot => dot.intensity >= minIntensity);

      return {
        ...halftoneData,
        dots: filteredDots
      };
    } catch (error) {
      throw error instanceof HalftoneConverterError ? error :
        new HalftoneConverterError(`Filtering dots failed: ${error}`, 'FILTER_ERROR');
    }
  }

  static getHalftoneStats(halftoneData: HalftoneData): {
    totalDots: number;
    averageIntensity: number;
    dotDensity: number;
    intensityRange: { min: number; max: number };
  } {
    const { dots, width, height } = halftoneData;
    
    if (dots.length === 0) {
      return {
        totalDots: 0,
        averageIntensity: 0,
        dotDensity: 0,
        intensityRange: { min: 0, max: 0 }
      };
    }

    const intensities = dots.map(dot => dot.intensity);
    const totalIntensity = intensities.reduce((sum, intensity) => sum + intensity, 0);
    const averageIntensity = totalIntensity / dots.length;
    const dotDensity = dots.length / (width * height);

    return {
      totalDots: dots.length,
      averageIntensity,
      dotDensity,
      intensityRange: {
        min: Math.min(...intensities),
        max: Math.max(...intensities)
      }
    };
  }
}