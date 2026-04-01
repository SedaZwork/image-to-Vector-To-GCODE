'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Settings, Eye, Download, AlertCircle, CheckCircle, Clock, Loader2, HelpCircle } from 'lucide-react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Alert,
  AlertDescription,
  Button,
  Separator
} from '@/components/ui';
import { ImageUpload } from '@/components/halftone/ImageUpload';
import { ParameterControls } from '@/components/halftone/ParameterControls';
import { ImagePreview } from '@/components/halftone/ImagePreview';
import { GCodePreview } from '@/components/halftone/GCodePreview';
import { ExportPanel } from '@/components/halftone/ExportPanel';
import { ErrorBoundary } from '@/components/halftone/ErrorBoundary';
import { HelpPanel, useHelpPanel } from '@/components/halftone/HelpPanel';
import { useHalftoneProcessor } from '@/hooks/useHalftoneProcessor';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ProcessingStatus, HalftoneOptions, GCodeOptions } from '@/types';

type WorkflowStep = 'upload' | 'configure' | 'preview' | 'export';

const STEP_LABELS: Record<WorkflowStep, string> = {
  upload: 'Upload Image',
  configure: 'Configure Parameters',
  preview: 'Preview & Generate',
  export: 'Export G-Code'
};

const STEP_DESCRIPTIONS: Record<WorkflowStep, string> = {
  upload: 'Upload your image file to convert to halftone',
  configure: 'Adjust halftone parameters and output settings',
  preview: 'Preview the halftone pattern and generate G-code',
  export: 'Download or copy your G-code file'
};

function StatusIndicator({ status, isLoading }: { status: ProcessingStatus; isLoading: boolean }) {
  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    
    switch (status) {
      case ProcessingStatus.COMPLETE:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case ProcessingStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case ProcessingStatus.IDLE:
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
  };

  const getStatusText = () => {
    if (isLoading) return 'Processing...';
    
    switch (status) {
      case ProcessingStatus.LOADING:
        return 'Loading image...';
      case ProcessingStatus.PROCESSING_IMAGE:
        return 'Processing image...';
      case ProcessingStatus.GENERATING_HALFTONE:
        return 'Generating halftone...';
      case ProcessingStatus.GENERATING_GCODE:
        return 'Generating G-code...';
      case ProcessingStatus.COMPLETE:
        return 'Complete';
      case ProcessingStatus.ERROR:
        return 'Error occurred';
      case ProcessingStatus.IDLE:
      default:
        return 'Ready';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
}

function WorkflowProgress({ currentStep, completedSteps }: { 
  currentStep: WorkflowStep; 
  completedSteps: Set<WorkflowStep>;
}) {
  const steps: WorkflowStep[] = ['upload', 'configure', 'preview', 'export'];
  const currentIndex = steps.indexOf(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>Workflow Progress</span>
        <span>{currentIndex + 1} of {steps.length}</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="grid grid-cols-4 gap-2 text-xs">
        {steps.map((step, index) => (
          <div 
            key={step}
            className={`text-center p-2 rounded ${
              completedSteps.has(step) 
                ? 'bg-green-50 text-green-700' 
                : currentStep === step 
                ? 'bg-blue-50 text-blue-700' 
                : 'bg-gray-50 text-gray-500'
            }`}
          >
            <div className="font-medium">{index + 1}</div>
            <div className="truncate">{STEP_LABELS[step]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(new Set());
  const helpPanel = useHelpPanel();

  // Parameter state management
  const [halftoneOptions, setHalftoneOptions] = useState<HalftoneOptions>({
    dotSize: 2,
    spacing: 3,
    threshold: 128,
    algorithm: 'floyd-steinberg',
    invert: false,
  });

  const [gCodeOptions, setGCodeOptions] = useState<GCodeOptions>({
    feedRate: 1000,
    spindleSpeed: 12000,
    safeHeight: 5,
    workHeight: 0,
    plungeRate: 200,
    units: 'mm',
    coordinateSystem: 'absolute',
    homeAfterJob: true,
    coolant: false,
  });

  const [canvasDimensions, setCanvasDimensions] = useState({ width: 100, height: 100 });

  const processor = useHalftoneProcessor({
    halftoneOptions,
    gCodeOptions,
    canvasDimensions,
    machineType: 'grbl',
    operationType: 'drilling',
    debounceMs: 500,
  });

  // Parameter update handlers
  const handleHalftoneChange = useCallback((newOptions: Partial<HalftoneOptions>) => {
    const updatedOptions = { ...halftoneOptions, ...newOptions };
    setHalftoneOptions(updatedOptions);
    processor.updateHalftoneOptions(newOptions);
  }, [halftoneOptions, processor]);

  const handleGCodeChange = useCallback((newOptions: Partial<GCodeOptions>) => {
    const updatedOptions = { ...gCodeOptions, ...newOptions };
    setGCodeOptions(updatedOptions);
    processor.updateGCodeOptions(newOptions);
  }, [gCodeOptions, processor]);

  const handleCanvasChange = useCallback((newDimensions: { width?: number; height?: number }) => {
    const updatedDimensions = { ...canvasDimensions, ...newDimensions };
    setCanvasDimensions(updatedDimensions);
    processor.updateCanvasDimensions(newDimensions);
  }, [canvasDimensions, processor]);

  const isAnyLoading = processor.isLoadingImage || processor.isProcessingHalftone || processor.isGeneratingGCode;

  // Setup keyboard shortcuts
  useGlobalShortcuts({
    onUpload: () => {
      if (currentStep === 'upload') {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fileInput?.click();
      }
    },
    onGenerate: processor.generateGCode,
    onExport: () => {
      // Trigger download - this would need to be connected to ExportPanel
      if (processor.gCodeData) {
        console.log('Export shortcut triggered');
      }
    },
    onHelp: helpPanel.openHelp,
    onReset: () => {
      if (confirm('Are you sure you want to reset the application? All progress will be lost.')) {
        processor.removeImage();
        setCurrentStep('upload');
        setCompletedSteps(new Set());
      }
    },
    canUpload: currentStep === 'upload' && !isAnyLoading,
    canGenerate: !!processor.halftoneData && !processor.isGeneratingGCode,
    canExport: !!processor.gCodeData
  });

  // Auto-advance workflow steps
  useEffect(() => {
    const newCompletedSteps = new Set(completedSteps);
    let hasChanges = false;

    if (processor.currentImage && !completedSteps.has('upload')) {
      newCompletedSteps.add('upload');
      hasChanges = true;
      if (currentStep === 'upload') {
        setCurrentStep('configure');
      }
    }

    if (processor.halftoneData && !completedSteps.has('configure')) {
      newCompletedSteps.add('configure');
      hasChanges = true;
      if (currentStep === 'configure') {
        setCurrentStep('preview');
      }
    }

    if (processor.gCodeData) {
      if (!completedSteps.has('preview')) {
        newCompletedSteps.add('preview');
        hasChanges = true;
        if (currentStep === 'preview') {
          setCurrentStep('export');
        }
      }
      if (!completedSteps.has('export')) {
        newCompletedSteps.add('export');
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setCompletedSteps(newCompletedSteps);
    }
  }, [processor.currentImage, processor.halftoneData, processor.gCodeData, currentStep, completedSteps]);

  const handleStepChange = useCallback((step: WorkflowStep) => {
    // Only allow going to completed steps or the next step
    if (completedSteps.has(step) || 
        (step === 'configure' && processor.currentImage) ||
        (step === 'preview' && processor.halftoneData) ||
        (step === 'export' && processor.gCodeData)) {
      setCurrentStep(step);
    }
  }, [completedSteps, processor.currentImage, processor.halftoneData, processor.gCodeData]);

  const canAdvance = (step: WorkflowStep): boolean => {
    switch (step) {
      case 'upload':
        return true;
      case 'configure':
        return !!processor.currentImage;
      case 'preview':
        return !!processor.halftoneData;
      case 'export':
        return !!processor.gCodeData;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Halftone to G-Code Converter</h1>
              <p className="text-gray-600 mt-1">Convert images to CNC-ready G-code with halftone patterns</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={helpPanel.openHelp}
                className="flex items-center space-x-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Help</span>
              </Button>
              <StatusIndicator status={processor.status} isLoading={isAnyLoading} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Workflow Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflow Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowProgress currentStep={currentStep} completedSteps={completedSteps} />
            </CardContent>
          </Card>

          {/* Error Display */}
          {processor.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{processor.error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={processor.clearError}
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Main Workflow */}
          <Tabs value={currentStep} onValueChange={(value) => handleStepChange(value as WorkflowStep)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger 
                value="upload" 
                disabled={!canAdvance('upload')}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger 
                value="configure" 
                disabled={!canAdvance('configure')}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configure</span>
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                disabled={!canAdvance('preview')}
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Preview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="export" 
                disabled={!canAdvance('export')}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {/* Step 1: Upload Image */}
              <TabsContent value="upload" className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">{STEP_LABELS.upload}</h2>
                  <p className="text-gray-600 mt-2">{STEP_DESCRIPTIONS.upload}</p>
                </div>
                
                <ErrorBoundary>
                  <ImageUpload
                    onImageSelect={(imageData) => processor.loadImage(imageData.file)}
                    onImageRemove={processor.removeImage}
                    currentImage={processor.currentImage}
                    disabled={processor.isLoadingImage}
                    onError={(error) => console.error('Image upload error:', error)}
                  />
                </ErrorBoundary>

                {processor.currentImage && (
                  <div className="text-center">
                    <Button 
                      onClick={() => setCurrentStep('configure')}
                      disabled={isAnyLoading}
                    >
                      Continue to Configuration
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Step 2: Configure Parameters */}
              <TabsContent value="configure" className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">{STEP_LABELS.configure}</h2>
                  <p className="text-gray-600 mt-2">{STEP_DESCRIPTIONS.configure}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ErrorBoundary>
                    <ParameterControls
                      halftoneOptions={halftoneOptions}
                      gCodeOptions={gCodeOptions}
                      canvasDimensions={canvasDimensions}
                      onHalftoneChange={handleHalftoneChange}
                      onGCodeChange={handleGCodeChange}
                      onCanvasChange={handleCanvasChange}
                      disabled={isAnyLoading}
                    />
                  </ErrorBoundary>

                  <ErrorBoundary>
                    <ImagePreview
                      originalImage={processor.currentImage}
                      halftoneData={processor.halftoneData}
                      isProcessing={processor.isProcessingHalftone}
                    />
                  </ErrorBoundary>
                </div>

                {processor.halftoneData && (
                  <div className="text-center">
                    <Button 
                      onClick={() => setCurrentStep('preview')}
                      disabled={isAnyLoading}
                    >
                      Continue to Preview
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Step 3: Preview & Generate */}
              <TabsContent value="preview" className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">{STEP_LABELS.preview}</h2>
                  <p className="text-gray-600 mt-2">{STEP_DESCRIPTIONS.preview}</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <ErrorBoundary>
                    <ImagePreview
                      originalImage={processor.currentImage}
                      halftoneData={processor.halftoneData}
                      isProcessing={processor.isProcessingHalftone}
                    />
                  </ErrorBoundary>

                  <ErrorBoundary>
                    <GCodePreview
                      halftoneData={processor.halftoneData}
                      gCodeData={processor.gCodeData}
                      gCodeOptions={gCodeOptions}
                      canvasDimensions={canvasDimensions}
                      isGenerating={processor.isGeneratingGCode}
                    />
                  </ErrorBoundary>
                </div>

                <div className="text-center space-y-4">
                  {!processor.gCodeData && (
                    <Button 
                      onClick={processor.generateGCode}
                      disabled={!processor.halftoneData || processor.isGeneratingGCode}
                      size="lg"
                    >
                      {processor.isGeneratingGCode ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating G-Code...
                        </>
                      ) : (
                        'Generate G-Code'
                      )}
                    </Button>
                  )}

                  {processor.gCodeData && (
                    <Button 
                      onClick={() => setCurrentStep('export')}
                      disabled={isAnyLoading}
                      size="lg"
                    >
                      Continue to Export
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Step 4: Export */}
              <TabsContent value="export" className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">{STEP_LABELS.export}</h2>
                  <p className="text-gray-600 mt-2">{STEP_DESCRIPTIONS.export}</p>
                </div>

                <ErrorBoundary>
                  <ExportPanel
                    gCodeData={processor.gCodeData}
                    halftoneData={processor.halftoneData}
                    isGenerating={processor.isGeneratingGCode}
                  />
                </ErrorBoundary>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>Halftone to G-Code Converter - Convert images to CNC patterns</p>
            <p className="text-sm mt-2">Built with Next.js, TypeScript, and shadcn/ui</p>
          </div>
        </div>
      </footer>

      {/* Help Panel */}
      <HelpPanel isOpen={helpPanel.isOpen} onClose={helpPanel.closeHelp} />
    </div>
  );
}
