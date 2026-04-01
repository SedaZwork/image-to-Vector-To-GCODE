'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Download, Copy, Check, AlertCircle, FileText, Clock, HardDrive, Image as ImageIcon } from 'lucide-react';
import { saveAs } from 'file-saver';
import { HalftoneConverter } from '@/lib/halftoneConverter';
import { HalftoneData, GCodeOutput } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Separator
} from '@/components/ui';
import { MachineType, OperationType } from '@/lib/gcodeGenerator';
import { formatFileSize } from '@/lib/utils';

interface ExportPanelProps {
  gCodeData?: GCodeOutput | null;
  halftoneData?: HalftoneData | null;
  isGenerating?: boolean;
  onExportSettingsChange?: (settings: ExportSettings) => void;
  className?: string;
}

export interface ExportSettings {
  filename: string;
  machineType: MachineType;
  operationType: OperationType;
  includeComments: boolean;
}

const MACHINE_TYPES: Record<MachineType, string> = {
  grbl: 'GRBL (Arduino CNC)',
  reprap: 'RepRap (3D Printer)',
  marlin: 'Marlin (3D Printer)',
  linuxcnc: 'LinuxCNC',
  mach3: 'Mach3'
};

const OPERATION_TYPES: Record<OperationType, string> = {
  drilling: 'Drilling Pattern',
  engraving: 'Engraving Pattern'
};

export function ExportPanel({
  gCodeData,
  halftoneData,
  isGenerating = false,
  onExportSettingsChange,
  className
}: ExportPanelProps) {
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    filename: 'halftone',
    machineType: 'grbl',
    operationType: 'drilling',
    includeComments: true
  });
  
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLines, setPreviewLines] = useState(50);

  // Calculate file stats
  const fileStats = useMemo(() => {
    if (!gCodeData?.gcode) {
      return {
        size: 0,
        sizeFormatted: '0 B',
        lines: 0,
        estimatedTime: 0,
        estimatedTimeFormatted: '0 min'
      };
    }

    const lines = gCodeData.gcode.split('\n').length;
    const size = new Blob([gCodeData.gcode]).size;
    const timeHours = Math.floor(gCodeData.estimatedTime / 60);
    const timeMinutes = Math.round(gCodeData.estimatedTime % 60);
    
    let timeFormatted = '';
    if (timeHours > 0) {
      timeFormatted = `${timeHours}h ${timeMinutes}m`;
    } else {
      timeFormatted = `${timeMinutes}m`;
    }

    return {
      size,
      sizeFormatted: formatFileSize(size),
      lines,
      estimatedTime: gCodeData.estimatedTime,
      estimatedTimeFormatted: timeFormatted
    };
  }, [gCodeData]);

  // Generate preview (first N lines)
  const previewText = useMemo(() => {
    if (!gCodeData?.gcode) return '';
    
    const lines = gCodeData.gcode.split('\n');
    const preview = lines.slice(0, previewLines);
    const hasMore = lines.length > previewLines;
    
    return preview.join('\n') + (hasMore ? `\n\n... (${lines.length - previewLines} more lines)` : '');
  }, [gCodeData?.gcode, previewLines]);

  const handleExportSettingsChange = useCallback((updates: Partial<ExportSettings>) => {
    const newSettings = { ...exportSettings, ...updates };
    setExportSettings(newSettings);
    onExportSettingsChange?.(newSettings);
  }, [exportSettings, onExportSettingsChange]);

  const handleFilenameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const filename = e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''); // Sanitize filename
    handleExportSettingsChange({ filename });
  }, [handleExportSettingsChange]);

  const handleMachineTypeChange = useCallback((machineType: MachineType) => {
    handleExportSettingsChange({ machineType });
  }, [handleExportSettingsChange]);

  const handleOperationTypeChange = useCallback((operationType: OperationType) => {
    handleExportSettingsChange({ operationType });
  }, [handleExportSettingsChange]);

  const handleIncludeCommentsChange = useCallback((checked: boolean) => {
    handleExportSettingsChange({ includeComments: checked });
  }, [handleExportSettingsChange]);

  const processGCodeForExport = useCallback((gcode: string): string => {
    if (!exportSettings.includeComments) {
      // Remove comment lines (starting with ;)
      return gcode
        .split('\n')
        .filter(line => !line.trim().startsWith(';'))
        .join('\n');
    }
    return gcode;
  }, [exportSettings.includeComments]);

  const handleDownloadSVG = useCallback(async () => {
    if (!halftoneData) return;

    try {
      setError(null);
      
      const svg = HalftoneConverter.generateSVG(halftoneData);
      const filename = `${exportSettings.filename || 'halftone'}.svg`;
      
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      saveAs(blob, filename);
      
    } catch (err) {
      setError(`SVG download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [halftoneData, exportSettings.filename]);

  const handleDownload = useCallback(async () => {
    if (!gCodeData?.gcode) return;

    try {
      setError(null);
      
      const processedGCode = processGCodeForExport(gCodeData.gcode);
      const filename = `${exportSettings.filename || 'halftone'}.gcode`;
      
      const blob = new Blob([processedGCode], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, filename);
      
    } catch (err) {
      setError(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [gCodeData?.gcode, exportSettings.filename, processGCodeForExport]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!gCodeData?.gcode) return;

    try {
      setError(null);
      
      const processedGCode = processGCodeForExport(gCodeData.gcode);
      await navigator.clipboard.writeText(processedGCode);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
    } catch (err) {
      setError(`Copy failed: ${err instanceof Error ? err.message : 'Clipboard not available'}`);
    }
  }, [gCodeData?.gcode, processGCodeForExport]);

  const handleShowMoreLines = useCallback(() => {
    setPreviewLines(prev => Math.min(prev + 50, gCodeData?.gcode.split('\n').length || 0));
  }, [gCodeData?.gcode]);

  const handleShowLessLines = useCallback(() => {
    setPreviewLines(prev => Math.max(50, prev - 50));
  }, []);

  if (!gCodeData && !isGenerating) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Export G-Code</CardTitle>
          <CardDescription>
            Generate halftone data to export G-code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p>No G-code data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Export G-Code</CardTitle>
        <CardDescription>
          Configure export settings and download your G-code file
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Export Settings */}
        <div className="space-y-4">
          <h3 className="font-medium">Export Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <div className="flex">
                <Input
                  id="filename"
                  value={exportSettings.filename}
                  onChange={handleFilenameChange}
                  placeholder="halftone"
                  className="rounded-r-none"
                />
                <div className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-md text-sm text-gray-600">
                  .gcode
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="machine-type">Machine Type</Label>
              <Select
                value={exportSettings.machineType}
                onValueChange={handleMachineTypeChange}
              >
                <SelectTrigger id="machine-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MACHINE_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="operation-type">Operation Type</Label>
              <Select
                value={exportSettings.operationType}
                onValueChange={handleOperationTypeChange}
              >
                <SelectTrigger id="operation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPERATION_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-comments"
                checked={exportSettings.includeComments}
                onChange={(e) => handleIncludeCommentsChange(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="include-comments" className="text-sm">
                Include comments
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* File Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">{fileStats.lines.toLocaleString()} lines</p>
              <p className="text-xs text-gray-500">G-code lines</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <HardDrive className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">{fileStats.sizeFormatted}</p>
              <p className="text-xs text-gray-500">File size</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">{fileStats.estimatedTimeFormatted}</p>
              <p className="text-xs text-gray-500">Est. time</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* G-Code Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">G-Code Preview</h3>
            <div className="flex items-center space-x-2">
              {gCodeData && previewLines < gCodeData.gcode.split('\n').length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowMoreLines}
                >
                  Show More
                </Button>
              )}
              {previewLines > 50 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowLessLines}
                >
                  Show Less
                </Button>
              )}
            </div>
          </div>
          
          <div className="relative">
            <textarea
              value={isGenerating ? 'Generating G-code...' : previewText}
              readOnly
              className="w-full h-64 p-3 font-mono text-xs border rounded-md bg-gray-50 resize-none"
              placeholder="G-code will appear here..."
            />
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto" />
                  <p className="text-sm text-gray-600">Generating G-code...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleDownload}
            disabled={!gCodeData?.gcode || isGenerating}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download G-Code
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadSVG}
            disabled={!halftoneData || isGenerating}
            className="flex-1"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Download SVG
          </Button>
          
          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            disabled={!gCodeData?.gcode || isGenerating}
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </div>

        {/* Additional Info */}
        {gCodeData && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm text-blue-900 mb-2">Export Summary</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• Filename: {exportSettings.filename || 'halftone'}.gcode</p>
              <p>• Machine: {MACHINE_TYPES[exportSettings.machineType]}</p>
              <p>• Operation: {OPERATION_TYPES[exportSettings.operationType]}</p>
              <p>• Work area: {gCodeData.bounds.minX.toFixed(1)} to {gCodeData.bounds.maxX.toFixed(1)} × {gCodeData.bounds.minY.toFixed(1)} to {gCodeData.bounds.maxY.toFixed(1)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}