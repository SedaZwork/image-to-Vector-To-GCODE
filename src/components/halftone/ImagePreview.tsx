'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button 
} from '@/components/ui';
import { ImageData, HalftoneData } from '@/types';
import { HalftoneConverter } from '@/lib/halftoneConverter';

interface ImagePreviewProps {
  originalImage?: ImageData | null;
  halftoneData?: HalftoneData | null;
  isProcessing?: boolean;
  className?: string;
}

export function ImagePreview({
  originalImage,
  halftoneData,
  isProcessing = false,
  className
}: ImagePreviewProps) {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const halftoneCanvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 });

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  // Calculate responsive canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = document.querySelector('.preview-container');
      if (container) {
        const containerWidth = container.clientWidth;
        const maxWidth = Math.min(containerWidth / 2 - 24, 400); // Account for gap and padding
        setCanvasSize({ width: maxWidth, height: maxWidth });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Render original image
  useEffect(() => {
    if (!originalImage || !originalCanvasRef.current) return;

    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Calculate display size maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      let displayWidth = canvasSize.width;
      let displayHeight = canvasSize.height;

      if (aspectRatio > 1) {
        displayHeight = displayWidth / aspectRatio;
      } else {
        displayWidth = displayHeight * aspectRatio;
      }

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Draw image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
    };
    
    img.src = originalImage.url;
  }, [originalImage, canvasSize]);

  // Render halftone preview
  useEffect(() => {
    if (!halftoneData || !halftoneCanvasRef.current) return;

    const canvas = halftoneCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Calculate display size maintaining aspect ratio
      const aspectRatio = halftoneData.width / halftoneData.height;
      let displayWidth = canvasSize.width;
      let displayHeight = canvasSize.height;

      if (aspectRatio > 1) {
        displayHeight = displayWidth / aspectRatio;
      } else {
        displayWidth = displayHeight * aspectRatio;
      }

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Generate preview using HalftoneConverter
      const preview = HalftoneConverter.generatePreview(
        halftoneData, 
        Math.min(displayWidth / halftoneData.width, displayHeight / halftoneData.height)
      );

      // Draw the preview
      ctx.putImageData(preview.imageData, 0, 0);
    } catch (error) {
      console.error('Error rendering halftone preview:', error);
      
      // Fallback: show error state
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Preview Error', canvas.width / 2, canvas.height / 2);
    }
  }, [halftoneData, canvasSize]);

  if (!originalImage && !halftoneData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Image Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>Upload an image to see the preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Image Preview</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.1}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 5}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetZoom}
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="preview-container grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700">Original</h3>
            <div 
              className="border rounded-lg overflow-hidden bg-gray-50"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            >
              <canvas
                ref={originalCanvasRef}
                className="block max-w-full"
                style={{ 
                  imageRendering: zoom > 2 ? 'pixelated' : 'auto'
                }}
              />
            </div>
            {originalImage && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>Dimensions: {originalImage.width} × {originalImage.height}px</p>
                <p>Size: {originalImage.size}</p>
              </div>
            )}
          </div>

          {/* Halftone Preview */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700">Halftone</h3>
            <div 
              className="border rounded-lg overflow-hidden bg-white"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            >
              {isProcessing ? (
                <div 
                  className="flex items-center justify-center bg-gray-50"
                  style={{ width: canvasSize.width, height: canvasSize.height }}
                >
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                    <p className="text-sm text-gray-600">Processing...</p>
                  </div>
                </div>
              ) : (
                <canvas
                  ref={halftoneCanvasRef}
                  className="block max-w-full"
                  style={{ 
                    imageRendering: zoom > 2 ? 'pixelated' : 'auto'
                  }}
                />
              )}
            </div>
            {halftoneData && !isProcessing && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>Dots: {halftoneData.dots.length.toLocaleString()}</p>
                <p>Algorithm: {halftoneData.options.algorithm}</p>
                <p>
                  Density: {((halftoneData.dots.length / (halftoneData.width * halftoneData.height)) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        {(originalImage || halftoneData) && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Zoom:</span>
                <p>{Math.round(zoom * 100)}%</p>
              </div>
              {originalImage && (
                <div>
                  <span className="font-medium text-gray-600">Format:</span>
                  <p>{originalImage.file.type.split('/')[1].toUpperCase()}</p>
                </div>
              )}
              {halftoneData && (
                <>
                  <div>
                    <span className="font-medium text-gray-600">Dot Size:</span>
                    <p>{halftoneData.options.dotSize}px</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Spacing:</span>
                    <p>{halftoneData.options.spacing}px</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}