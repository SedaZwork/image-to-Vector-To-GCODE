'use client';

import { useEffect, useCallback, useRef } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  disabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enableInInputs?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  preventDefault = true,
  stopPropagation = true,
  enableInInputs = false
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if we should ignore the event (e.g., when typing in inputs)
    if (!enableInInputs && isTypingInInput(event.target as Element)) {
      return;
    }

    const activeShortcuts = shortcutsRef.current.filter(shortcut => !shortcut.disabled);

    for (const shortcut of activeShortcuts) {
      if (matchesShortcut(event, shortcut)) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        
        shortcut.action();
        break; // Only execute the first matching shortcut
      }
    }
  }, [preventDefault, stopPropagation, enableInInputs]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return shortcut information for display purposes
  return {
    shortcuts: shortcuts.filter(s => !s.disabled),
    formatShortcut: (shortcut: KeyboardShortcut) => formatShortcutDisplay(shortcut)
  };
}

function isTypingInInput(target: Element): boolean {
  if (!target) return false;
  
  const tagName = target.tagName.toLowerCase();
  const inputTypes = ['input', 'textarea', 'select'];
  
  if (inputTypes.includes(tagName)) {
    return true;
  }
  
  // Check for contenteditable
  if (target.getAttribute('contenteditable') === 'true') {
    return true;
  }
  
  // Check for role="textbox"
  if (target.getAttribute('role') === 'textbox') {
    return true;
  }
  
  return false;
}

function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const key = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();
  
  // Handle special key mappings
  const normalizedKey = normalizeKey(key);
  const normalizedShortcutKey = normalizeKey(shortcutKey);
  
  return (
    normalizedKey === normalizedShortcutKey &&
    !!event.ctrlKey === !!shortcut.ctrlKey &&
    !!event.shiftKey === !!shortcut.shiftKey &&
    !!event.altKey === !!shortcut.altKey &&
    !!event.metaKey === !!shortcut.metaKey
  );
}

function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    'arrowup': 'up',
    'arrowdown': 'down',
    'arrowleft': 'left',
    'arrowright': 'right',
    ' ': 'space',
    'delete': 'del'
  };
  
  return keyMap[key.toLowerCase()] || key.toLowerCase();
}

function formatShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  // Detect platform for proper modifier display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  
  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.metaKey && !isMac) {
    parts.push('Meta');
  }
  
  // Format the main key
  const mainKey = formatMainKey(shortcut.key);
  parts.push(mainKey);
  
  return parts.join(isMac ? '' : '+');
}

function formatMainKey(key: string): string {
  const keyDisplayMap: Record<string, string> = {
    ' ': 'Space',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
    'enter': '↵',
    'escape': 'Esc',
    'delete': 'Del',
    'backspace': '⌫'
  };
  
  const mapped = keyDisplayMap[key.toLowerCase()];
  if (mapped) return mapped;
  
  // Capitalize single letters
  if (key.length === 1) {
    return key.toUpperCase();
  }
  
  // Capitalize first letter of longer keys
  return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

// Hook for managing global application shortcuts
export function useGlobalShortcuts({
  onUpload,
  onGenerate,
  onExport,
  onHelp,
  onReset,
  canUpload,
  canGenerate,
  canExport
}: {
  onUpload?: () => void;
  onGenerate?: () => void;
  onExport?: () => void;
  onHelp?: () => void;
  onReset?: () => void;
  canUpload?: boolean;
  canGenerate?: boolean;
  canExport?: boolean;
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'u',
      ctrlKey: true,
      action: () => onUpload?.(),
      description: 'Upload image',
      disabled: !canUpload || !onUpload
    },
    {
      key: 'g',
      ctrlKey: true,
      action: () => onGenerate?.(),
      description: 'Generate G-code',
      disabled: !canGenerate || !onGenerate
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => onExport?.(),
      description: 'Save/Export G-code',
      disabled: !canExport || !onExport
    },
    {
      key: '?',
      action: () => onHelp?.(),
      description: 'Show help',
      disabled: !onHelp
    },
    {
      key: 'F1',
      action: () => onHelp?.(),
      description: 'Show help',
      disabled: !onHelp
    },
    {
      key: 'r',
      ctrlKey: true,
      shiftKey: true,
      action: () => onReset?.(),
      description: 'Reset application',
      disabled: !onReset
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open modals or overlays
        const event = new CustomEvent('closeOverlays');
        document.dispatchEvent(event);
      },
      description: 'Close dialogs'
    }
  ];

  return useKeyboardShortcuts({
    shortcuts,
    preventDefault: true,
    stopPropagation: true,
    enableInInputs: false
  });
}