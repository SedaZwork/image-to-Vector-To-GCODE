import { HalftoneOptions, GCodeOptions } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validators = {
  // Number validation
  isPositiveNumber: (value: number, fieldName: string): FieldValidationResult => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { isValid: false, error: `${fieldName} must be a valid number` };
    }
    if (value <= 0) {
      return { isValid: false, error: `${fieldName} must be positive` };
    }
    return { isValid: true };
  },

  isNonNegativeNumber: (value: number, fieldName: string): FieldValidationResult => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { isValid: false, error: `${fieldName} must be a valid number` };
    }
    if (value < 0) {
      return { isValid: false, error: `${fieldName} cannot be negative` };
    }
    return { isValid: true };
  },

  isInRange: (value: number, min: number, max: number, fieldName: string): FieldValidationResult => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { isValid: false, error: `${fieldName} must be a valid number` };
    }
    if (value < min || value > max) {
      return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
    }
    return { isValid: true };
  },

  // String validation
  isNonEmptyString: (value: string, fieldName: string): FieldValidationResult => {
    if (typeof value !== 'string') {
      return { isValid: false, error: `${fieldName} must be a string` };
    }
    if (value.trim().length === 0) {
      return { isValid: false, error: `${fieldName} cannot be empty` };
    }
    return { isValid: true };
  },

  isValidFilename: (value: string): FieldValidationResult => {
    if (typeof value !== 'string') {
      return { isValid: false, error: 'Filename must be a string' };
    }
    
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Filename cannot be empty' };
    }
    
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(trimmed)) {
      return { isValid: false, error: 'Filename contains invalid characters' };
    }
    
    // Check length
    if (trimmed.length > 255) {
      return { isValid: false, error: 'Filename is too long (max 255 characters)' };
    }
    
    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(trimmed)) {
      return { isValid: false, error: 'Filename is a reserved system name' };
    }
    
    return { isValid: true };
  },

  // File validation
  isValidImageFile: (file: File): FieldValidationResult => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    
    if (file.size > maxSize) {
      return { 
        isValid: false, 
        error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (50MB)` 
      };
    }
    
    // Check if file type is undefined or empty
    if (!file.type) {
      // Try to determine type from file extension
      const extension = file.name.toLowerCase().split('.').pop();
      const extensionToMime: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'bmp': 'image/bmp'
      };
      
      if (extension && extensionToMime[extension]) {
        // File extension suggests it's a valid image, proceed with warning
        return { 
          isValid: true, 
          warning: 'File type could not be detected, but extension suggests valid image format' 
        };
      }
      
      return { 
        isValid: false, 
        error: `Failed to load image: Unsupported file type: ${file.type || 'undefined'}. Supported formats: image/jpeg, image/jpg, image/png, image/gif, image/webp, image/bmp` 
      };
    }
    
    if (!validTypes.includes(file.type)) {
      return { 
        isValid: false, 
        error: `Failed to load image: Unsupported file type: ${file.type}. Supported formats: image/jpeg, image/jpg, image/png, image/gif, image/webp, image/bmp` 
      };
    }
    
    // Warning for large files
    if (file.size > 10 * 1024 * 1024) {
      return { 
        isValid: true, 
        warning: 'Large file size may result in slower processing' 
      };
    }
    
    return { isValid: true };
  }
};

export function validateHalftoneOptions(options: HalftoneOptions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate dot size
  const dotSizeResult = validators.isInRange(options.dotSize, 0.1, 50, 'Dot size');
  if (!dotSizeResult.isValid && dotSizeResult.error) {
    errors.push(dotSizeResult.error);
  }
  if (options.dotSize > 20) {
    warnings.push('Large dot size may result in overlapping dots');
  }

  // Validate spacing
  const spacingResult = validators.isInRange(options.spacing, 0.1, 20, 'Spacing');
  if (!spacingResult.isValid && spacingResult.error) {
    errors.push(spacingResult.error);
  }
  if (options.spacing < 1) {
    warnings.push('Very small spacing may result in extremely dense patterns');
  }

  // Validate threshold
  const thresholdResult = validators.isInRange(options.threshold, 0, 255, 'Threshold');
  if (!thresholdResult.isValid && thresholdResult.error) {
    errors.push(thresholdResult.error);
  }

  // Validate algorithm
  const validAlgorithms = ['ordered', 'floyd-steinberg', 'random'];
  if (!validAlgorithms.includes(options.algorithm)) {
    errors.push(`Algorithm must be one of: ${validAlgorithms.join(', ')}`);
  }

  // Logical validations
  if (options.dotSize > options.spacing * 2) {
    warnings.push('Dot size is much larger than spacing - dots will overlap significantly');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateGCodeOptions(options: GCodeOptions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate feed rates
  const feedRateResult = validators.isInRange(options.feedRate, 1, 10000, 'Feed rate');
  if (!feedRateResult.isValid && feedRateResult.error) {
    errors.push(feedRateResult.error);
  }

  const plungeRateResult = validators.isInRange(options.plungeRate, 1, 5000, 'Plunge rate');
  if (!plungeRateResult.isValid && plungeRateResult.error) {
    errors.push(plungeRateResult.error);
  }

  // Validate spindle speed
  const spindleSpeedResult = validators.isNonNegativeNumber(options.spindleSpeed, 'Spindle speed');
  if (!spindleSpeedResult.isValid && spindleSpeedResult.error) {
    errors.push(spindleSpeedResult.error);
  }
  if (options.spindleSpeed > 30000) {
    warnings.push('Very high spindle speed - ensure your machine supports this RPM');
  }

  // Validate heights
  const safeHeightResult = validators.isNonNegativeNumber(options.safeHeight, 'Safe height');
  if (!safeHeightResult.isValid && safeHeightResult.error) {
    errors.push(safeHeightResult.error);
  }

  // Work height can be negative (below surface)
  if (typeof options.workHeight !== 'number' || isNaN(options.workHeight)) {
    errors.push('Work height must be a valid number');
  }

  // Logical validations
  if (options.safeHeight <= options.workHeight) {
    errors.push('Safe height must be greater than work height');
  }

  if (options.plungeRate > options.feedRate) {
    warnings.push('Plunge rate is higher than feed rate - this may cause issues');
  }

  // Validate units
  if (!['mm', 'inches'].includes(options.units)) {
    errors.push('Units must be either "mm" or "inches"');
  }

  // Validate coordinate system
  if (!['absolute', 'relative'].includes(options.coordinateSystem)) {
    errors.push('Coordinate system must be either "absolute" or "relative"');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateCanvasDimensions(
  dimensions: { width: number; height: number },
  units: 'mm' | 'inches' = 'mm'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const maxSize = units === 'mm' ? 1000 : 40; // 1000mm or 40 inches
  const minSize = units === 'mm' ? 1 : 0.1; // 1mm or 0.1 inches

  // Validate width
  const widthResult = validators.isInRange(dimensions.width, minSize, maxSize, 'Canvas width');
  if (!widthResult.isValid && widthResult.error) {
    errors.push(widthResult.error);
  }

  // Validate height
  const heightResult = validators.isInRange(dimensions.height, minSize, maxSize, 'Canvas height');
  if (!heightResult.isValid && heightResult.error) {
    errors.push(heightResult.error);
  }

  // Warnings for extreme aspect ratios
  const aspectRatio = dimensions.width / dimensions.height;
  if (aspectRatio > 10 || aspectRatio < 0.1) {
    warnings.push('Extreme aspect ratio may not display well');
  }

  // Warnings for very large canvases
  const area = dimensions.width * dimensions.height;
  const maxArea = units === 'mm' ? 500000 : 800; // 500,000 mm² or 800 in²
  if (area > maxArea) {
    warnings.push('Very large canvas may result in long processing times');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateImageDimensions(width: number, height: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum dimensions
  if (width < 10 || height < 10) {
    errors.push('Image must be at least 10x10 pixels');
  }

  // Check maximum dimensions
  if (width > 10000 || height > 10000) {
    errors.push('Image dimensions are too large (max 10000x10000 pixels)');
  }

  // Warnings
  if (width > 5000 || height > 5000) {
    warnings.push('Large image dimensions may result in slow processing');
  }

  if (width < 100 || height < 100) {
    warnings.push('Small image dimensions may result in poor halftone quality');
  }

  const aspectRatio = width / height;
  if (aspectRatio > 20 || aspectRatio < 0.05) {
    warnings.push('Extreme aspect ratio may not convert well to halftone');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Utility function to sanitize user inputs
export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

// Utility function to validate and sanitize filename
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .trim()
    .substring(0, 255);
}