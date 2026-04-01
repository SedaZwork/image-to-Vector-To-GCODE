'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Grid } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import { HalftoneData, GCodeOptions, GCodeOutput } from '@/types';

interface GCodePreviewProps {
  halftoneData?: HalftoneData | null;
  gCodeData?: GCodeOutput | null;
  gCodeOptions: GCodeOptions;
  canvasDimensions: {
    width: number;
    height: number;
  };
  isGenerating?: boolean;
  className?: string;
}

type ViewMode = 'dots' | 'toolpath';

export function GCodePreview({
  halftoneData,
  gCodeData,
  gCodeOptions,
  canvasDimensions,
  isGenerating = false,
  className
}: GCodePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('dots');
  const [showGrid, setShowGrid] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 });

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const toggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
  }, []);

  // Calculate responsive canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = document.querySelector('.gcode-preview-container');
      if (container) {
        const containerWidth = container.clientWidth;
        const maxSize = Math.min(containerWidth - 48, 500); // Account for padding
        setCanvasSize({ width: maxSize, height: maxSize });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Render G-code preview
  useEffect(() => {
    if (!halftoneData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scale to fit canvas dimensions into display
    const scaleX = canvasSize.width / canvasDimensions.width;
    const scaleY = canvasSize.height / canvasDimensions.height;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave margin

    // Center the drawing
    const offsetX = (canvasSize.width - canvasDimensions.width * scale) / 2;
    const offsetY = (canvasSize.height - canvasDimensions.height * scale) / 2;

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, canvasSize.width, canvasSize.height, scale, offsetX, offsetY);
    }

    // Draw canvas boundary
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, canvasDimensions.width * scale, canvasDimensions.height * scale);

    // Transform coordinates from image space to canvas space
    const transformX = (x: number) => offsetX + (x / halftoneData.width) * canvasDimensions.width * scale;
    const transformY = (y: number) => offsetY + (y / halftoneData.height) * canvasDimensions.height * scale;

    if (viewMode === 'dots') {
      drawDots(ctx, halftoneData, transformX, transformY, scale);
    } else {
      drawToolpath(ctx, halftoneData, transformX, transformY);
    }

    // Draw coordinate labels
    drawCoordinateLabels(ctx, canvasSize.width, canvasSize.height, canvasDimensions, gCodeOptions.units, offsetX, offsetY, scale);

  }, [halftoneData, canvasSize, canvasDimensions, viewMode, showGrid, gCodeOptions.units]);

  const drawGrid = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;

    const gridSpacing = Math.max(10, 20 * scale);
    
    // Vertical lines
    for (let x = offsetX; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines  
    for (let y = offsetY; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawDots = (
    ctx: CanvasRenderingContext2D,
    data: HalftoneData,
    transformX: (x: number) => number,
    transformY: (y: number) => number,
    scale: number
  ) => {
    ctx.fillStyle = '#1f2937';

    data.dots.forEach(dot => {
      const x = transformX(dot.x);
      const y = transformY(dot.y);
      const radius = Math.max(0.5, (dot.size || data.options.dotSize) * scale * 0.1);

      ctx.globalAlpha = dot.intensity;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  };

  const drawToolpath = (
    ctx: CanvasRenderingContext2D,
    data: HalftoneData,
    transformX: (x: number) => number,
    transformY: (y: number) => number
  ) => {
    if (data.dots.length === 0) return;

    // Simple toolpath: connect dots in order (not optimized)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    ctx.beginPath();
    const firstDot = data.dots[0];
    ctx.moveTo(transformX(firstDot.x), transformY(firstDot.y));

    data.dots.slice(1).forEach(dot => {
      ctx.lineTo(transformX(dot.x), transformY(dot.y));
    });

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw dots on top
    ctx.fillStyle = '#dc2626';
    data.dots.forEach(dot => {
      const x = transformX(dot.x);
      const y = transformY(dot.y);
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawCoordinateLabels = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dimensions: { width: number; height: number },
    units: string,
    offsetX: number,
    offsetY: number,
    scale: number
  ) => {
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // Origin (0,0)
    ctx.fillText('(0,0)', offsetX - 10, offsetY + 15);
    
    // Max dimensions
    const maxX = offsetX + dimensions.width * scale;
    const maxY = offsetY + dimensions.height * scale;
    
    ctx.fillText(`(${dimensions.width}${units},0)`, maxX, offsetY + 15);
    ctx.fillText(`(0,${dimensions.height}${units})`, offsetX - 10, maxY);
    ctx.fillText(`(${dimensions.width}${units},${dimensions.height}${units})`, maxX, maxY);
  };

  if (!halftoneData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>G-Code Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>Generate halftone data to see G-code preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>G-Code Preview</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleGrid}
              className={showGrid ? 'bg-blue-50' : ''}
              aria-label="Toggle grid"
            >
              <Grid className="h-4 w-4" />
            </Button>
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
              disabled={zoom >= 10}
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
        <div className="space-y-4">
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dots">Dot Pattern</TabsTrigger>
              <TabsTrigger value="toolpath">Tool Path</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Canvas Container */}
          <div className="gcode-preview-container">
            <div 
              className="border rounded-lg overflow-hidden bg-white mx-auto"
              style={{ 
                transform: `scale(${zoom})`, 
                transformOrigin: 'center',
                maxWidth: canvasSize.width,
                maxHeight: canvasSize.height
              }}
            >
              {isGenerating ? (
                <div 
                  className="flex items-center justify-center bg-gray-50"
                  style={{ width: canvasSize.width, height: canvasSize.height }}
                >
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                    <p className="text-sm text-gray-600">Generating preview...</p>
                  </div>
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="block"
                  style={{ 
                    imageRendering: zoom > 3 ? 'pixelated' : 'auto'
                  }}
                />
              )}
            </div>
          </div>

          {/* Preview Info */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm pt-4 border-t">
            <div>
              <span className="font-medium text-gray-600">Canvas Size:</span>
              <p>{canvasDimensions.width} × {canvasDimensions.height} {gCodeOptions.units}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Total Dots:</span>
              <p>{halftoneData.dots.length.toLocaleString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">View Mode:</span>
              <p>{viewMode === 'dots' ? 'Dot Pattern' : 'Tool Path'}</p>
            </div>
            {gCodeData && (
              <div>
                <span className="font-medium text-gray-600">Est. Time:</span>
                <p>{Math.round(gCodeData.estimatedTime)} min</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Legend</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {viewMode === 'dots' ? (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                    <span>Drill points</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-300 border border-gray-400"></div>
                    <span>Canvas boundary</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-0.5 bg-blue-500" style={{ borderStyle: 'dashed' }}></div>
                    <span>Tool path</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <span>Drill points</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}