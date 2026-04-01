'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Slider,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Alert,
  AlertDescription
} from '@/components/ui';
import { HalftoneOptions, GCodeOptions } from '@/types';
import { validateHalftoneOptions, validateGCodeOptions, validateCanvasDimensions } from '@/lib/validation';

interface ParameterControlsProps {
  halftoneOptions: HalftoneOptions;
  gCodeOptions: GCodeOptions;
  canvasDimensions: {
    width: number;
    height: number;
  };
  onHalftoneChange: (options: Partial<HalftoneOptions>) => void;
  onGCodeChange: (options: Partial<GCodeOptions>) => void;
  onCanvasChange: (dimensions: { width?: number; height?: number }) => void;
  disabled?: boolean;
}

interface AlgorithmInfo {
  name: string;
  description: string;
  bestFor: string;
}

const ALGORITHM_INFO: Record<HalftoneOptions['algorithm'], AlgorithmInfo> = {
  'ordered': {
    name: 'Ordered Dithering',
    description: 'Uses a structured pattern matrix for consistent, regular dot placement.',
    bestFor: 'Clean geometric patterns, technical drawings'
  },
  'floyd-steinberg': {
    name: 'Floyd-Steinberg',
    description: 'Error diffusion algorithm that distributes quantization errors to neighboring pixels.',
    bestFor: 'Photographs, complex images with gradients'
  },
  'random': {
    name: 'Simple Threshold',
    description: 'Basic threshold-based conversion with circular dots.',
    bestFor: 'High contrast images, artistic effects'
  }
};

export function ParameterControls({
  halftoneOptions,
  gCodeOptions,
  canvasDimensions,
  onHalftoneChange,
  onGCodeChange,
  onCanvasChange,
  disabled = false
}: ParameterControlsProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Validate parameters whenever they change
  useEffect(() => {
    const halftoneValidation = validateHalftoneOptions(halftoneOptions);
    const gCodeValidation = validateGCodeOptions(gCodeOptions);
    const canvasValidation = validateCanvasDimensions(canvasDimensions, gCodeOptions.units);

    const allErrors = [
      ...halftoneValidation.errors,
      ...gCodeValidation.errors,
      ...canvasValidation.errors
    ];

    const allWarnings = [
      ...halftoneValidation.warnings,
      ...gCodeValidation.warnings,
      ...canvasValidation.warnings
    ];

    setValidationErrors(allErrors);
    setValidationWarnings(allWarnings);
  }, [halftoneOptions, gCodeOptions, canvasDimensions]);
  const handleAlgorithmChange = (algorithm: HalftoneOptions['algorithm']) => {
    onHalftoneChange({ algorithm });
  };

  const handleDotSizeChange = (value: number[]) => {
    onHalftoneChange({ dotSize: value[0] });
  };

  const handleSpacingChange = (value: number[]) => {
    onHalftoneChange({ spacing: value[0] });
  };

  const handleThresholdChange = (value: number[]) => {
    onHalftoneChange({ threshold: value[0] });
  };

  const handleInvertChange = (checked: boolean) => {
    onHalftoneChange({ invert: checked });
  };

  const handleUnitsChange = (units: 'mm' | 'inches') => {
    onGCodeChange({ units });
  };

  const handleCanvasWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseFloat(e.target.value);
    if (!isNaN(width) && width > 0) {
      onCanvasChange({ width });
    }
  };

  const handleCanvasHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseFloat(e.target.value);
    if (!isNaN(height) && height > 0) {
      onCanvasChange({ height });
    }
  };

  const currentAlgorithmInfo = ALGORITHM_INFO[halftoneOptions.algorithm];

  return (
    <div className="space-y-6">
      {/* Validation Alerts */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validationWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium mb-2">Warnings:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Algorithm Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Algorithm Selection</CardTitle>
          <CardDescription>
            Choose the halftone conversion algorithm that best suits your image
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={halftoneOptions.algorithm} 
            onValueChange={(value) => handleAlgorithmChange(value as HalftoneOptions["algorithm"])}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ordered" disabled={disabled}>Ordered</TabsTrigger>
              <TabsTrigger value="floyd-steinberg" disabled={disabled}>Floyd-Steinberg</TabsTrigger>
              <TabsTrigger value="random" disabled={disabled}>Threshold</TabsTrigger>
            </TabsList>
            
            <TabsContent value={halftoneOptions.algorithm} className="mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">{currentAlgorithmInfo.name}</h4>
                <p className="text-sm text-gray-600">{currentAlgorithmInfo.description}</p>
                <p className="text-xs text-blue-600 font-medium">
                  Best for: {currentAlgorithmInfo.bestFor}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Halftone Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Halftone Parameters</CardTitle>
          <CardDescription>
            Adjust the dot size, spacing, and threshold to control the halftone effect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dot Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="dot-size">Dot Size</Label>
              <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                {halftoneOptions.dotSize.toFixed(1)}px
              </span>
            </div>
            <Slider
              id="dot-size"
              min={1}
              max={20}
              step={0.5}
              value={[halftoneOptions.dotSize]}
              onValueChange={handleDotSizeChange}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Controls the maximum size of halftone dots
            </p>
          </div>

          <Separator />

          {/* Spacing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="spacing">Dot Spacing</Label>
              <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                {halftoneOptions.spacing.toFixed(1)}px
              </span>
            </div>
            <Slider
              id="spacing"
              min={1}
              max={10}
              step={0.1}
              value={[halftoneOptions.spacing]}
              onValueChange={handleSpacingChange}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Distance between dot centers (lower = denser pattern)
            </p>
          </div>

          <Separator />

          {/* Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="threshold">Threshold</Label>
              <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                {halftoneOptions.threshold}
              </span>
            </div>
            <Slider
              id="threshold"
              min={0}
              max={255}
              step={1}
              value={[halftoneOptions.threshold]}
              onValueChange={handleThresholdChange}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Brightness threshold for dot creation (0 = black, 255 = white)
            </p>
          </div>

          <Separator />

          {/* Invert Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="invert"
              checked={halftoneOptions.invert || false}
              onChange={(e) => handleInvertChange(e.target.checked)}
              disabled={disabled}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="invert" className="text-sm">
              Invert colors (create dots in bright areas instead of dark)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Output Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Output Settings</CardTitle>
          <CardDescription>
            Configure the output dimensions and units for G-code generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Units Selection */}
          <div className="space-y-2">
            <Label htmlFor="units">Output Units</Label>
            <Select
              value={gCodeOptions.units}
              onValueChange={handleUnitsChange}
              disabled={disabled}
            >
              <SelectTrigger id="units">
                <SelectValue placeholder="Select units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">Millimeters (mm)</SelectItem>
                <SelectItem value="inches">Inches</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Unit of measurement for G-code coordinates
            </p>
          </div>

          <Separator />

          {/* Canvas Dimensions */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Canvas Dimensions</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="canvas-width" className="text-sm">
                  Width ({gCodeOptions.units})
                </Label>
                <Input
                  id="canvas-width"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={canvasDimensions.width}
                  onChange={handleCanvasWidthChange}
                  disabled={disabled}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="canvas-height" className="text-sm">
                  Height ({gCodeOptions.units})
                </Label>
                <Input
                  id="canvas-height"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={canvasDimensions.height}
                  onChange={handleCanvasHeightChange}
                  disabled={disabled}
                  className="w-full"
                />
              </div>
            </div>
            
            <p className="text-xs text-gray-500">
              Physical dimensions of the output canvas/material
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base">Current Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Algorithm:</span>
              <p>{currentAlgorithmInfo.name}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Dot Size:</span>
              <p>{halftoneOptions.dotSize}px</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Spacing:</span>
              <p>{halftoneOptions.spacing}px</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Threshold:</span>
              <p>{halftoneOptions.threshold}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Canvas:</span>
              <p>{canvasDimensions.width} × {canvasDimensions.height} {gCodeOptions.units}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Inverted:</span>
              <p>{halftoneOptions.invert ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}