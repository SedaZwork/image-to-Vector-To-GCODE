'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, Button, Alert, AlertDescription, Progress } from '@/components/ui';
import { cn, formatFileSize } from '@/lib/utils';
import { ImageData } from '@/types';
import { validators, validateImageDimensions } from '@/lib/validation';

interface ImageUploadProps {
  onImageSelect: (imageData: ImageData) => void;
  onImageRemove: () => void;
  currentImage?: ImageData | null;
  disabled?: boolean;
  maxFileSize?: number;
  acceptedFormats?: string[];
  onError?: (error: string) => void;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];

export function ImageUpload({
  onImageSelect,
  onImageRemove,
  currentImage,
  disabled = false,
  maxFileSize = DEFAULT_MAX_SIZE,
  acceptedFormats = DEFAULT_FORMATS,
  onError
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string; warning?: string } => {
    // Use the validation library
    const fileValidation = validators.isValidImageFile(file);
    if (!fileValidation.isValid) {
      return { isValid: false, error: fileValidation.error };
    }

    // Additional format check
    if (!file.type) {
      // Try to determine type from file extension if MIME type is missing
      const extension = file.name.toLowerCase().split('.').pop();
      const extensionToMime: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'bmp': 'image/bmp'
      };
      
      if (!extension || !extensionToMime[extension]) {
        return {
          isValid: false,
          error: `Failed to load image: Unsupported file type: ${file.type || 'undefined'}. Supported formats: ${acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}`
        };
      }
      // If extension is valid, continue with processing
    } else if (!acceptedFormats.includes(file.type)) {
      return {
        isValid: false,
        error: `Failed to load image: Unsupported file type: ${file.type}. Supported formats: ${acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}`
      };
    }

    // Additional size check with custom limit
    if (file.size > maxFileSize) {
      return {
        isValid: false,
        error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxFileSize)})`
      };
    }

    return {
      isValid: true,
      warning: fileValidation.warning
    };
  }, [acceptedFormats, maxFileSize]);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setWarning(null);
    setIsLoading(true);
    setProgress(0);

    try {
      // Step 1: Validate file (10% progress)
      setProgress(10);
      const validation = validateFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'File validation failed');
        onError?.(validation.error || 'File validation failed');
        setIsLoading(false);
        return;
      }

      if (validation.warning) {
        setWarning(validation.warning);
      }

      // Step 2: Create image URL (20% progress)
      setProgress(20);
      const imageUrl = URL.createObjectURL(file);

      // Step 3: Load and validate image (30-80% progress)
      setProgress(30);
      
      const img = new Image();
      
      img.onload = () => {
        setProgress(80);
        
        try {
          // Validate image dimensions
          const dimensionValidation = validateImageDimensions(img.width, img.height);
          if (!dimensionValidation.isValid) {
            URL.revokeObjectURL(imageUrl);
            const errorMsg = dimensionValidation.errors.join(', ');
            setError(errorMsg);
            onError?.(errorMsg);
            setIsLoading(false);
            return;
          }

          if (dimensionValidation.warnings.length > 0) {
            setWarning(dimensionValidation.warnings.join(', '));
          }

          // Step 4: Create image data (90% progress)
          setProgress(90);
          
          const imageData: ImageData = {
            file,
            url: imageUrl,
            width: img.width,
            height: img.height,
            size: formatFileSize(file.size)
          };

          // Step 5: Complete (100% progress)
          setProgress(100);
          
          onImageSelect(imageData);
          setIsLoading(false);
          
        } catch (err) {
          URL.revokeObjectURL(imageUrl);
          const errorMsg = 'Failed to process image data';
          setError(errorMsg);
          onError?.(errorMsg);
          setIsLoading(false);
        }
      };

      img.onerror = (event) => {
        URL.revokeObjectURL(imageUrl);
        const errorMsg = 'Failed to load image. The file may be corrupted or not a valid image format.';
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        console.error('Image load error:', event);
      };

      // Add timeout for loading
      const loadTimeout = setTimeout(() => {
        URL.revokeObjectURL(imageUrl);
        const errorMsg = 'Image loading timed out. Please try a smaller file.';
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
      }, 30000); // 30 second timeout

      // Store original handlers and add timeout cleanup
      const originalOnLoad = img.onload;
      const originalOnError = img.onerror;

      img.onload = (event) => {
        clearTimeout(loadTimeout);
        if (originalOnLoad) {
          originalOnLoad.call(img, event);
        }
      };

      img.onerror = (event) => {
        clearTimeout(loadTimeout);
        if (originalOnError) {
          originalOnError.call(img, event);
        }
      };

      img.src = imageUrl;
      
    } catch (err) {
      const errorMsg = `An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMsg);
      onError?.(errorMsg);
      setIsLoading(false);
      console.error('File processing error:', err);
    }
  }, [validateFile, onImageSelect, onError]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCountRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    dragCountRef.current = 0;

    if (disabled || isLoading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [disabled, isLoading, processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleRemoveImage = useCallback(() => {
    if (currentImage) {
      URL.revokeObjectURL(currentImage.url);
    }
    onImageRemove();
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentImage, onImageRemove]);

  const handleUploadClick = useCallback(() => {
    if (!disabled && !isLoading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isLoading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleUploadClick();
    }
  }, [handleUploadClick]);

  if (currentImage) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Uploaded Image</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
                disabled={disabled}
                aria-label="Remove image"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <img
                  src={currentImage.url}
                  alt="Uploaded preview"
                  className="w-full h-48 object-contain border rounded-lg bg-gray-50"
                />
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium text-gray-600">Dimensions:</span>
                    <p>{currentImage.width} × {currentImage.height}px</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">File Size:</span>
                    <p>{currentImage.size}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">File Name:</span>
                    <p className="truncate" title={currentImage.file.name}>
                      {currentImage.file.name}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Format:</span>
                    <p>{currentImage.file.type.split('/')[1].toUpperCase()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {warning && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          )}

          {isLoading && progress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing image...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200",
              "hover:bg-gray-50 hover:border-gray-400",
              "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
              isDragOver && "border-blue-500 bg-blue-50",
              disabled && "opacity-50 cursor-not-allowed",
              isLoading && "opacity-50"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats.join(',')}
              onChange={handleFileSelect}
              disabled={disabled || isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Upload image file"
            />

            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-gray-100">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6 text-gray-500" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">
                  {isLoading ? 'Processing image...' : 'Upload an image'}
                </h3>
                
                <p className="text-sm text-gray-600">
                  Drag and drop your image here, or{' '}
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isLoading}
                    className="text-blue-600 hover:text-blue-500 font-medium focus:outline-none focus:underline disabled:opacity-50"
                  >
                    browse files
                  </button>
                </p>

                <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <ImageIcon className="h-3 w-3" />
                    <span>{acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}</span>
                  </div>
                  <span>•</span>
                  <span>Max {formatFileSize(maxFileSize)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}