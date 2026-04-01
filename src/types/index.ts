export interface HalftoneOptions {
  dotSize: number;
  spacing: number;
  threshold: number;
  algorithm: 'floyd-steinberg' | 'ordered' | 'random';
  invert?: boolean;
}

export interface HalftoneDot {
  x: number;
  y: number;
  intensity: number;
  size?: number;
}

export interface HalftoneData {
  dots: HalftoneDot[];
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  options: HalftoneOptions;
}

export interface GCodeOptions {
  feedRate: number;
  spindleSpeed: number;
  safeHeight: number;
  workHeight: number;
  plungeRate: number;
  units: 'mm' | 'inches';
  coordinateSystem: 'absolute' | 'relative';
  homeAfterJob?: boolean;
  coolant?: boolean;
}

export interface GCodeOutput {
  gcode: string;
  estimatedTime: number;
  totalDistance: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export enum ProcessingStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  PROCESSING_IMAGE = 'processing_image',
  GENERATING_HALFTONE = 'generating_halftone',
  GENERATING_GCODE = 'generating_gcode',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export interface ProcessingState {
  status: ProcessingStatus;
  progress: number;
  message?: string;
  error?: string;
}

export interface ImageData {
  file: File;
  url: string;
  width: number;
  height: number;
  size: string;
}