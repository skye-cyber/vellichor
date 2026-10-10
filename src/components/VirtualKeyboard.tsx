import React, { useState } from 'react';
import {
  Send,
  Delete,
  CornerDownLeft,
  Space,
  Keyboard,
  Copy,
  Clipboard,
  Check,
} from 'lucide-react';
import { WebRTCService } from '../services/WebRTCService';
import { TauriNativeService } from '../services/TauriNativeService';

export const VirtualKeyboard: React.FC = () => {
  const [textBuffer, setTextBuffer] = useState('');
  const [ctrlActive, setCtrlActive] = useState(false);
  const [altActive, setAltActive] = useState(false);
  const [shiftActive, setShiftActive] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

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
  };

  const keyboardRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
  ];

  return (
    <div className="flex-1 flex flex-col space-y-4 max-w-2xl mx-auto w-full">
      {/* Quick Input Bar */}
      <form onSubmit={handleSendText} className="flex space-x-2">
        <input
          type="text"
          value={textBuffer}
          onChange={(e) => setTextBuffer(e.target.value)}
          placeholder="Type string to send to remote device..."
          className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary shadow-sm"
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm flex items-center space-x-1.5 shadow-balanced"
        >
          <span>Send</span>
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Shortcuts toolbar */}
      <div className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setCtrlActive(!ctrlActive)}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-colors ${
              ctrlActive
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-400'
            }`}
          >
            Ctrl
          </button>
          <button
            onClick={() => setAltActive(!altActive)}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-colors ${
              altActive
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-400'
            }`}
          >
            Alt
          </button>
          <button
            onClick={() => setShiftActive(!shiftActive)}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-colors ${
              shiftActive
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-400'
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

      {/* Virtual On-screen Keyboard */}
      <div className="p-4 rounded-3xl bg-gray-100 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border shadow-inner space-y-2">
        {keyboardRows.map((row, idx) => (
          <div key={idx} className="flex justify-center space-x-1 sm:space-x-1.5">
            {row.map((char) => (
              <button
                key={char}
                onClick={() => sendKey(shiftActive ? char.toUpperCase() : char.toLowerCase())}
                className="flex-1 max-w-[48px] h-11 sm:h-12 rounded-xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-primary active:bg-primary active:text-white font-bold text-sm text-gray-800 dark:text-gray-200 shadow-sm flex items-center justify-center transition-all"
              >
                {shiftActive ? char.toUpperCase() : char.toLowerCase()}
              </button>
            ))}
          </div>
        ))}

        {/* Space, Enter, Backspace row */}
        <div className="flex justify-center space-x-1 sm:space-x-1.5 pt-1">
          <button
            onClick={() => sendKey('Backspace')}
            className="px-4 h-11 sm:h-12 rounded-xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-red-400 text-red-500 font-semibold text-xs shadow-sm flex items-center justify-center space-x-1 transition-all"
          >
            <Delete className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <button
            onClick={() => sendKey(' ')}
            className="flex-1 max-w-sm h-11 sm:h-12 rounded-xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-primary font-bold text-xs text-gray-500 shadow-sm flex items-center justify-center space-x-1 transition-all"
          >
            <Space className="w-4 h-4" />
            <span>Spacebar</span>
          </button>

          <button
            onClick={() => sendKey('Enter')}
            className="px-5 h-11 sm:h-12 rounded-xl bg-primary text-white font-semibold text-xs shadow-balanced flex items-center justify-center space-x-1 transition-all"
          >
            <CornerDownLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
