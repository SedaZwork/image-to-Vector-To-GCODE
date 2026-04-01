'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Image, 
  Grid3X3, 
  Zap, 
  Download,
  Keyboard,
  Info
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator
} from '@/components/ui';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: 'halftone' | 'gcode' | 'usage';
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is halftone processing?",
    answer: "Halftone is a printing technique that creates the illusion of continuous tones using dots of varying sizes or spacing. In this app, we convert grayscale images into patterns of dots that can be reproduced by CNC machines.",
    category: 'halftone'
  },
  {
    question: "Which algorithm should I choose?",
    answer: "• Floyd-Steinberg: Best for photographs and complex images with smooth gradients\n• Ordered Dithering: Great for technical drawings and geometric patterns\n• Simple Threshold: Good for high-contrast images and artistic effects",
    category: 'halftone'
  },
  {
    question: "What dot size should I use?",
    answer: "Dot size depends on your tool and material. For engraving: 0.5-2px. For drilling: 2-10px. Larger dots are more visible but require bigger tools.",
    category: 'halftone'
  },
  {
    question: "What is G-code?",
    answer: "G-code is a programming language for CNC machines. It contains instructions for tool movement, spindle control, and other machine operations. Our app generates G-code that recreates your halftone pattern.",
    category: 'gcode'
  },
  {
    question: "What's the difference between drilling and engraving?",
    answer: "• Drilling: Creates individual holes at each dot location (Z-axis plunging)\n• Engraving: Traces paths between dots with variable feed rates based on intensity",
    category: 'gcode'
  },
  {
    question: "My image is too large. What should I do?",
    answer: "Large images will be automatically compressed. You can also manually resize your image before upload. For best results, use images between 500-2000 pixels in your largest dimension.",
    category: 'usage'
  },
  {
    question: "The halftone looks too dense/sparse. How do I fix this?",
    answer: "Adjust the 'Spacing' parameter to control dot density. Lower values create denser patterns. You can also adjust the 'Threshold' to control which areas get dots.",
    category: 'usage'
  },
  {
    question: "Can I use this for laser engraving?",
    answer: "Yes! Set the machine type to 'GRBL' and operation type to 'Engraving'. Adjust feed rates and power settings according to your laser specifications.",
    category: 'usage'
  }
];

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-blue-600" />
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 border-t bg-gray-50/50">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function KeyboardShortcutsTab() {
  const { shortcuts, formatShortcut } = useGlobalShortcuts({});

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Use these keyboard shortcuts to speed up your workflow:
      </p>
      
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
            <span className="text-sm">{shortcut.description}</span>
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
              {formatShortcut(shortcut)}
            </kbd>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Shortcuts work when not typing in input fields</li>
          <li>• Press Escape to close dialog boxes</li>
          <li>• Use ? or F1 to open this help panel anytime</li>
        </ul>
      </div>
    </div>
  );
}

function ConceptsTab() {
  return (
    <div className="space-y-6">
      <CollapsibleSection title="Halftone Basics" icon={Grid3X3} defaultOpen={true}>
        <div className="space-y-3 text-sm">
          <p>
            Halftone is a printing technique that simulates continuous tones using dots. 
            The human eye blends these dots together, creating the illusion of smooth gradients.
          </p>
          <div className="bg-blue-50 p-3 rounded">
            <strong>Key principle:</strong> Darker areas have larger or more closely spaced dots, 
            while lighter areas have smaller or more widely spaced dots.
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Dithering Algorithms" icon={Zap}>
        <div className="space-y-4 text-sm">
          <div>
            <h5 className="font-medium text-blue-700 mb-2">Floyd-Steinberg Error Diffusion</h5>
            <p>Distributes quantization errors to neighboring pixels, creating organic-looking patterns. Best for photographs.</p>
          </div>
          <div>
            <h5 className="font-medium text-blue-700 mb-2">Ordered Dithering (Bayer Matrix)</h5>
            <p>Uses a predefined pattern matrix for consistent, regular dot placement. Great for technical drawings.</p>
          </div>
          <div>
            <h5 className="font-medium text-blue-700 mb-2">Simple Threshold</h5>
            <p>Basic black/white conversion based on a threshold value. Good for high-contrast artistic effects.</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="G-code Generation" icon={Download}>
        <div className="space-y-3 text-sm">
          <p>
            G-code is the standard language for controlling CNC machines. Our app converts 
            halftone dots into machine instructions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-3 rounded">
              <strong className="text-green-700">Drilling Mode:</strong>
              <p className="text-green-600 mt-1">Creates holes by plunging the Z-axis at each dot location.</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <strong className="text-purple-700">Engraving Mode:</strong>
              <p className="text-purple-600 mt-1">Traces paths between dots with variable feed rates.</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function FAQTab() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'halftone' | 'gcode' | 'usage'>('all');
  
  const filteredFAQ = selectedCategory === 'all' 
    ? FAQ_ITEMS 
    : FAQ_ITEMS.filter(item => item.category === selectedCategory);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'halftone', label: 'Halftone' },
          { key: 'gcode', label: 'G-code' },
          { key: 'usage', label: 'Usage' }
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={selectedCategory === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(key as any)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredFAQ.map((item, index) => (
          <CollapsibleSection 
            key={index} 
            title={item.question} 
            icon={Info}
          >
            <div className="text-sm whitespace-pre-line text-gray-700">
              {item.answer}
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
}

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HelpCircle className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Help & Documentation</CardTitle>
                <CardDescription>
                  Learn about halftone processing and G-code generation
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="concepts" className="h-full">
            <div className="border-b px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="concepts" className="flex items-center space-x-2">
                  <Image className="h-4 w-4" />
                  <span>Concepts</span>
                </TabsTrigger>
                <TabsTrigger value="shortcuts" className="flex items-center space-x-2">
                  <Keyboard className="h-4 w-4" />
                  <span>Shortcuts</span>
                </TabsTrigger>
                <TabsTrigger value="faq" className="flex items-center space-x-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>FAQ</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <TabsContent value="concepts">
                <ConceptsTab />
              </TabsContent>

              <TabsContent value="shortcuts">
                <KeyboardShortcutsTab />
              </TabsContent>

              <TabsContent value="faq">
                <FAQTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing help panel state
export function useHelpPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const openHelp = () => setIsOpen(true);
  const closeHelp = () => setIsOpen(false);

  // Listen for ESC key and closeOverlays event
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeHelp();
      }
    };

    const handleCloseOverlays = () => {
      closeHelp();
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('closeOverlays', handleCloseOverlays);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('closeOverlays', handleCloseOverlays);
    };
  }, []);

  return {
    isOpen,
    openHelp,
    closeHelp
  };
}