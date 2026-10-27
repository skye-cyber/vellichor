import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Delete,
  CornerDownLeft,
  Space,
  Keyboard as KeyboardIcon,
  Copy,
  Clipboard,
  Check,
  Smartphone,
  EyeOff,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { WebRTCService } from '../services/WebRTCService';
import { TauriNativeService } from '../services/TauriNativeService';
import { useVirtualKeyboardAdaptive } from '../hooks/useVirtualKeyboardAdaptive';

interface VirtualKeyboardProps {
  initialSuppressNative?: boolean;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  initialSuppressNative = false,
}) => {
  const [textBuffer, setTextBuffer] = useState('');
  const [ctrlActive, setCtrlActive] = useState(false);
  const [altActive, setAltActive] = useState(false);
  const [shiftActive, setShiftActive] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [forwardPhysicalKeys, setForwardPhysicalKeys] = useState(true);

  const {
    isKeyboardOpen,
    keyboardHeight,
    suppressNativeKeyboard,
    setSuppressNativeKeyboard,
    inputRef,
    handleFocus,
    dismissKeyboard,
  } = useVirtualKeyboardAdaptive(initialSuppressNative);

  // Directly forward physical hardware keys when enabled and focused
  useEffect(() => {
    if (!forwardPhysicalKeys) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't forward if user is typing in regular inputs elsewhere on the page
      if (document.activeElement && document.activeElement !== inputRef.current && document.activeElement.tagName === 'INPUT') {
        return;
      }

      if (e.key === 'Control') setCtrlActive(true);
      else if (e.key === 'Alt') setAltActive(true);
      else if (e.key === 'Shift') setShiftActive(true);
      else {
        sendKey(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') setCtrlActive(false);
      else if (e.key === 'Alt') setAltActive(false);
      else if (e.key === 'Shift') setShiftActive(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [forwardPhysicalKeys, ctrlActive, altActive, shiftActive]);

  const sendKey = (key: string) => {
    WebRTCService.sendData('control', {
      action: 'keypress',
      key,
      modifiers: {
        ctrl: ctrlActive,
        alt: altActive,
        shift: shiftActive,
      },
    });

    TauriNativeService.simulateInput({
      action: 'keypress',
      key,
    });
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textBuffer) return;

    for (const char of textBuffer) {
      sendKey(char);
    }
    setTextBuffer('');
    dismissKeyboard();
  };

  const keyboardRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
  ];

  return (
    <div
      className={`flex-1 flex flex-col space-y-4 max-w-2xl mx-auto w-full transition-all duration-200 ${
        isKeyboardOpen ? 'pb-8' : ''
      }`}
    >
      {/* Native Keyboard Suppression and Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs shadow-sm">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-4 h-4 text-primary" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Android Soft Keyboard:
          </span>
          <button
            type="button"
            onClick={() => {
              const nextState = !suppressNativeKeyboard;
              setSuppressNativeKeyboard(nextState);
              if (nextState) dismissKeyboard();
            }}
            title={
              suppressNativeKeyboard
                ? 'Default Android keyboard is DISABLED. Click to allow native keyboard.'
                : 'Default Android keyboard is ACTIVE. Click to prevent native keyboard popup.'
            }
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              suppressNativeKeyboard
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-secondary/15 text-secondary border border-secondary/30'
            }`}
          >
            {suppressNativeKeyboard ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Blocked (Use On-Screen)</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span>Auto-Popup (Allowed)</span>
              </>
            )}
          </button>
        </div>

        {/* Dismiss keyboard button (visible when keyboard is detected on mobile) */}
        {isKeyboardOpen && (
          <button
            type="button"
            onClick={dismissKeyboard}
            className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-vellichor-surface text-gray-700 dark:text-gray-300 hover:text-primary font-semibold flex items-center space-x-1"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Hide Keyboard</span>
          </button>
        )}
      </div>

      {/* Adaptive Input Form - Guaranteed to stay visible */}
      <div className="relative">
        <form onSubmit={handleSendText} className="flex space-x-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              inputMode={suppressNativeKeyboard ? 'none' : 'text'}
              value={textBuffer}
              onFocus={handleFocus}
              onChange={(e) => setTextBuffer(e.target.value)}
              placeholder={
                suppressNativeKeyboard
                  ? 'Input field (Native keyboard blocked • Click on-screen keys below)'
                  : 'Type text here to stream to remote device...'
              }
              className="w-full pl-4 pr-10 py-3 rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary shadow-sm"
            />
            {suppressNativeKeyboard && (
              <span
                title="Default mobile keyboard blocked on click"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500"
              >
                <EyeOff className="w-4 h-4" />
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm flex items-center space-x-1.5 shadow-balanced transition-transform active:scale-95"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Shortcuts Toolbar */}
      <div className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setCtrlActive(!ctrlActive)}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-colors ${
              ctrlActive
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-400 hover:text-primary'
            }`}
          >
            Ctrl
          </button>
          <button
            onClick={() => setAltActive(!altActive)}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-colors ${
              altActive
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-400 hover:text-primary'
            }`}
          >
            Alt
          </button>
          <button
            onClick={() => setShiftActive(!shiftActive)}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-colors ${
              shiftActive
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-400 hover:text-primary'
            }`}
          >
            Shift
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => sendKey('Escape')}
            className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-vellichor-surface hover:text-primary text-gray-600 dark:text-gray-300 font-semibold"
          >
            Esc
          </button>
          <button
            onClick={() => sendKey('Tab')}
            className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-vellichor-surface hover:text-primary text-gray-600 dark:text-gray-300 font-semibold"
          >
            Tab
          </button>
          <button
            onClick={() => {
              sendKey('Control+c');
              setCopiedNotification(true);
              setTimeout(() => setCopiedNotification(false), 1500);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-vellichor-surface hover:text-primary text-gray-600 dark:text-gray-300 font-semibold flex items-center space-x-1"
          >
            {copiedNotification ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy</span>
          </button>
          <button
            onClick={() => sendKey('Control+v')}
            className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-vellichor-surface hover:text-primary text-gray-600 dark:text-gray-300 font-semibold flex items-center space-x-1"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>
        </div>
      </div>

      {/* On-screen Virtual Keyboard */}
      <div className="p-4 rounded-3xl bg-gray-100 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border shadow-inner space-y-2">
        {keyboardRows.map((row, idx) => (
          <div key={idx} className="flex justify-center space-x-1 sm:space-x-1.5">
            {row.map((char) => {
              const displayChar = shiftActive ? char.toUpperCase() : char.toLowerCase();
              return (
                <button
                  key={char}
                  type="button"
                  onClick={() => {
                    sendKey(displayChar);
                    setTextBuffer((prev) => prev + displayChar);
                  }}
                  className="flex-1 max-w-[48px] h-11 sm:h-12 rounded-xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-primary active:bg-primary active:text-white font-bold text-sm text-gray-800 dark:text-gray-200 shadow-sm flex items-center justify-center transition-all select-none"
                >
                  {displayChar}
                </button>
              );
            })}
          </div>
        ))}

        {/* Space, Enter, Backspace row */}
        <div className="flex justify-center space-x-1 sm:space-x-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              sendKey('Backspace');
              setTextBuffer((prev) => prev.slice(0, -1));
            }}
            className="px-4 h-11 sm:h-12 rounded-xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-red-400 text-red-500 font-semibold text-xs shadow-sm flex items-center justify-center space-x-1 transition-all select-none"
          >
            <Delete className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sendKey(' ');
              setTextBuffer((prev) => prev + ' ');
            }}
            className="flex-1 max-w-sm h-11 sm:h-12 rounded-xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-primary font-bold text-xs text-gray-500 shadow-sm flex items-center justify-center space-x-1 transition-all select-none"
          >
            <Space className="w-4 h-4" />
            <span>Spacebar</span>
          </button>

          <button
            type="button"
            onClick={() => sendKey('Enter')}
            className="px-5 h-11 sm:h-12 rounded-xl bg-primary text-white font-semibold text-xs shadow-balanced flex items-center justify-center space-x-1 transition-all select-none"
          >
            <CornerDownLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
