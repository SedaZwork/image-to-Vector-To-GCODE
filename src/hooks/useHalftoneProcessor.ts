'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ImageData, HalftoneData, HalftoneOptions, GCodeOptions, GCodeOutput, ProcessingStatus } from '@/types';
import { ImageProcessor } from '@/lib/imageProcessing';
import { GCodeGenerator, GCodeGeneratorOptions, MachineType, OperationType } from '@/lib/gcodeGenerator';

interface HalftoneProcessorState {
  // Image state
  currentImage: ImageData | null;
  processedCanvas: HTMLCanvasElement | null;
  
  // Processing state
  halftoneData: HalftoneData | null;
  gCodeData: GCodeOutput | null;
  
  // Status
  status: ProcessingStatus;
  progress: number;
  error: string | null;
  
  // Loading states
  isLoadingImage: boolean;
  isProcessingHalftone: boolean;
  isGeneratingGCode: boolean;
}

interface HalftoneProcessorConfig {
  halftoneOptions: HalftoneOptions;
  gCodeOptions: GCodeOptions;
  canvasDimensions: { width: number; height: number };
  machineType: MachineType;
  operationType: OperationType;
  debounceMs: number;
}

interface HalftoneProcessorActions {
  loadImage: (file: File) => Promise<void>;
  removeImage: () => void;
  updateHalftoneOptions: (options: Partial<HalftoneOptions>) => void;
  updateGCodeOptions: (options: Partial<GCodeOptions>) => void;
  updateCanvasDimensions: (dimensions: { width?: number; height?: number }) => void;
  updateMachineType: (machineType: MachineType) => void;
  updateOperationType: (operationType: OperationType) => void;
  forceReprocess: () => void;
  generateGCode: () => Promise<void>;
  clearError: () => void;
}

type HalftoneProcessorReturn = HalftoneProcessorState & HalftoneProcessorActions;

// Web Worker inline code
const createHalftoneWorker = (): Worker => {
  const workerCode = `
    // Halftone processing in Web Worker
    const BAYER_MATRIX_4X4 = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];

    function getPixelGrayValue(data, x, y, width) {
      const index = (y * width + x) * 4;
      return data[index]; // Assume grayscale
    }

    function convertWithOrderedDithering(imageData, options) {
      const { width, height, data } = imageData;
      const dots = [];
      const step = Math.max(1, Math.round(options.spacing));

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const grayValue = getPixelGrayValue(data, x, y, width);
          const matrixX = x % 4;
          const matrixY = y % 4;
          const threshold = (BAYER_MATRIX_4X4[matrixY][matrixX] / 15) * 255;

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

      return { dots, width, height };
    }

    function convertWithFloydSteinberg(imageData, options) {
      const { width, height } = imageData;
      const dots = [];
      
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
          
          let newPixel, shouldCreateDot;

          if (options.invert) {
            newPixel = oldPixel > options.threshold ? 255 : 0;
            shouldCreateDot = newPixel === 255;
          } else {
            newPixel = oldPixel < options.threshold ? 0 : 255;
            shouldCreateDot = newPixel === 0;
          }

          const error = oldPixel - newPixel;

          // Distribute error
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

      return { dots, width, height };
    }

    function convertWithThreshold(imageData, options) {
      const { width, height, data } = imageData;
      const dots = [];
      const step = Math.max(1, Math.round(options.spacing));

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const grayValue = getPixelGrayValue(data, x, y, width);
          
          let shouldCreateDot, intensity;

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

      return { dots, width, height };
    }

    self.onmessage = function(e) {
      const { imageData, options, id } = e.data;
      
      try {
        let result;
        
        switch (options.algorithm) {
          case 'ordered':
            result = convertWithOrderedDithering(imageData, options);
            break;
          case 'floyd-steinberg':
            result = convertWithFloydSteinberg(imageData, options);
            break;
          case 'random':
            result = convertWithThreshold(imageData, options);
            break;
          default:
            throw new Error('Unknown algorithm: ' + options.algorithm);
        }

        const halftoneData = {
          ...result,
          originalWidth: result.width,
          originalHeight: result.height,
          options
        };

        self.postMessage({ 
          success: true, 
          data: halftoneData, 
          id 
        });
      } catch (error) {
        self.postMessage({ 
          success: false, 
          error: error.message, 
          id 
        });
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

export function useHalftoneProcessor(initialConfig?: Partial<HalftoneProcessorConfig>): HalftoneProcessorReturn {
  // Configuration with defaults
  const config = useMemo((): HalftoneProcessorConfig => ({
    halftoneOptions: {
      dotSize: 2,
      spacing: 3,
      threshold: 128,
      algorithm: 'floyd-steinberg',
      invert: false,
    },
    gCodeOptions: {
      feedRate: 1000,
      spindleSpeed: 12000,
      safeHeight: 5,
      workHeight: 0,
      plungeRate: 200,
      units: 'mm',
      coordinateSystem: 'absolute',
      homeAfterJob: true,
      coolant: false,
    },
    canvasDimensions: { width: 100, height: 100 },
    machineType: 'grbl',
    operationType: 'drilling',
    debounceMs: 500,
    ...initialConfig,
  }), [initialConfig]);

  // State
  const [state, setState] = useState<HalftoneProcessorState>({
    currentImage: null,
    processedCanvas: null,
    halftoneData: null,
    gCodeData: null,
    status: ProcessingStatus.IDLE,
    progress: 0,
    error: null,
    isLoadingImage: false,
    isProcessingHalftone: false,
    isGeneratingGCode: false,
  });

  // Refs
  const workerRef = useRef<Worker | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processingIdRef = useRef<number>(0);
  const configRef = useRef(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Initialize worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      workerRef.current = createHalftoneWorker();
      
      workerRef.current.onmessage = (e) => {
        const { success, data, error, id } = e.data;
        
        // Check if this is the most recent processing request
        if (id !== processingIdRef.current) return;

        if (success) {
          setState(prev => ({
            ...prev,
            halftoneData: data,
            status: ProcessingStatus.COMPLETE,
            progress: 100,
            isProcessingHalftone: false,
            error: null,
          }));
        } else {
          setState(prev => ({
            ...prev,
            status: ProcessingStatus.ERROR,
            error: `Halftone processing failed: ${error}`,
            isProcessingHalftone: false,
          }));
        }
      };

      workerRef.current.onerror = (error) => {
        setState(prev => ({
          ...prev,
          status: ProcessingStatus.ERROR,
          error: `Worker error: ${error.message}`,
          isProcessingHalftone: false,
        }));
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced halftone processing
  const debouncedProcessHalftone = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!state.processedCanvas || !workerRef.current) return;

      try {
        setState(prev => ({
          ...prev,
          isProcessingHalftone: true,
          status: ProcessingStatus.GENERATING_HALFTONE,
          progress: 0,
          error: null,
        }));

        const imageData = ImageProcessor.extractImageData(state.processedCanvas);
        const processingId = ++processingIdRef.current;

        workerRef.current.postMessage({
          imageData,
          options: configRef.current.halftoneOptions,
          id: processingId,
        });

      } catch (error) {
        setState(prev => ({
          ...prev,
          status: ProcessingStatus.ERROR,
          error: `Failed to start halftone processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isProcessingHalftone: false,
        }));
      }
    }, configRef.current.debounceMs);
  }, [state.processedCanvas]);

  // Actions
  const loadImage = useCallback(async (file: File) => {
    try {
      setState(prev => ({
        ...prev,
        isLoadingImage: true,
        status: ProcessingStatus.LOADING,
        progress: 0,
        error: null,
      }));

      // Process image
      const result = await ImageProcessor.processImageFile(file, {
        convertToGrayscale: true,
        resize: {
          maxWidth: 800,
          maxHeight: 800,
          maintainAspectRatio: true,
        },
      });

      const imageData: ImageData = {
        file,
        url: URL.createObjectURL(file),
        width: result.originalDimensions.width,
        height: result.originalDimensions.height,
        size: file.size.toString(),
      };

      setState(prev => ({
        ...prev,
        currentImage: imageData,
        processedCanvas: result.canvas,
        status: ProcessingStatus.PROCESSING_IMAGE,
        progress: 50,
        isLoadingImage: false,
        halftoneData: null,
        gCodeData: null,
      }));

      // Trigger halftone processing
      setTimeout(debouncedProcessHalftone, 100);

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: ProcessingStatus.ERROR,
        error: `Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoadingImage: false,
      }));
    }
  }, [debouncedProcessHalftone]);

  const removeImage = useCallback(() => {
    if (state.currentImage?.url) {
      URL.revokeObjectURL(state.currentImage.url);
    }

    setState(prev => ({
      ...prev,
      currentImage: null,
      processedCanvas: null,
      halftoneData: null,
      gCodeData: null,
      status: ProcessingStatus.IDLE,
      progress: 0,
      error: null,
    }));
  }, [state.currentImage]);

  const updateHalftoneOptions = useCallback((options: Partial<HalftoneOptions>) => {
    configRef.current = {
      ...configRef.current,
      halftoneOptions: { ...configRef.current.halftoneOptions, ...options },
    };

    // Clear previous G-code when halftone options change
    setState(prev => ({ ...prev, gCodeData: null }));

    // Trigger reprocessing
    debouncedProcessHalftone();
  }, [debouncedProcessHalftone]);

  const updateGCodeOptions = useCallback((options: Partial<GCodeOptions>) => {
    configRef.current = {
      ...configRef.current,
      gCodeOptions: { ...configRef.current.gCodeOptions, ...options },
    };

    // Clear G-code when options change
    setState(prev => ({ ...prev, gCodeData: null }));
  }, []);

  const updateCanvasDimensions = useCallback((dimensions: { width?: number; height?: number }) => {
    configRef.current = {
      ...configRef.current,
      canvasDimensions: { ...configRef.current.canvasDimensions, ...dimensions },
    };

    // Clear G-code when dimensions change
    setState(prev => ({ ...prev, gCodeData: null }));
  }, []);

  const updateMachineType = useCallback((machineType: MachineType) => {
    configRef.current = { ...configRef.current, machineType };
    setState(prev => ({ ...prev, gCodeData: null }));
  }, []);

  const updateOperationType = useCallback((operationType: OperationType) => {
    configRef.current = { ...configRef.current, operationType };
    setState(prev => ({ ...prev, gCodeData: null }));
  }, []);

  const forceReprocess = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debouncedProcessHalftone();
  }, [debouncedProcessHalftone]);

  const generateGCode = useCallback(async () => {
    if (!state.halftoneData) return;

    try {
      setState(prev => ({
        ...prev,
        isGeneratingGCode: true,
        status: ProcessingStatus.GENERATING_GCODE,
        error: null,
      }));

      const options: GCodeGeneratorOptions = {
        ...configRef.current.gCodeOptions,
        machineType: configRef.current.machineType,
        operationType: configRef.current.operationType,
        toolDiameter: 1,
        maxDepth: 1,
        retractHeight: configRef.current.gCodeOptions.safeHeight * 0.5,
      };

      const gCodeOutput = GCodeGenerator.generate(
        state.halftoneData,
        options,
        configRef.current.canvasDimensions
      );

      setState(prev => ({
        ...prev,
        gCodeData: gCodeOutput,
        status: ProcessingStatus.COMPLETE,
        isGeneratingGCode: false,
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: ProcessingStatus.ERROR,
        error: `G-code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isGeneratingGCode: false,
      }));
    }
  }, [state.halftoneData]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    loadImage,
    removeImage,
    updateHalftoneOptions,
    updateGCodeOptions,
    updateCanvasDimensions,
    updateMachineType,
    updateOperationType,
    forceReprocess,
    generateGCode,
    clearError,
  };
}