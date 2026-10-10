import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer,
  Sliders,
  Move,
  CornerDownLeft,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { WebRTCService } from '../services/WebRTCService';
import { TauriNativeService } from '../services/TauriNativeService';

interface TouchpadProps {
  deviceName?: string;
}

export const Touchpad: React.FC<TouchpadProps> = ({ deviceName }) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [sensitivity, setSensitivity] = useState(1.5);
  const [isDragging, setIsDragging] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    lastPosRef.current = { x: clientX, y: clientY };
    updateVisualPointer(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !lastPosRef.current) return;
    const dx = (clientX - lastPosRef.current.x) * sensitivity;
    const dy = (clientY - lastPosRef.current.y) * sensitivity;
    lastPosRef.current = { x: clientX, y: clientY };

    updateVisualPointer(clientX, clientY);

    // Send delta to remote peer
    WebRTCService.sendData('control', {
      action: 'mousemove',
      dx,
      dy,
    });
    TauriNativeService.simulateInput({
      action: 'mousemove',
      x: dx,
      y: dy,
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
    lastPosRef.current = null;
    setPointerPos(null);
  };

  const updateVisualPointer = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    setPointerPos({
      x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, clientY - rect.top)),
    });
  };

  const handleClick = (button: 'left' | 'right' | 'middle') => {
    WebRTCService.sendData('control', {
      action: 'click',
      button,
    });
    TauriNativeService.simulateInput({
      action: 'click',
      button,
    });
  };

  const handleScroll = (deltaY: number) => {
    WebRTCService.sendData('control', {
      action: 'scroll',
      delta_y: deltaY,
    });
    TauriNativeService.simulateInput({
      action: 'scroll',
      delta_y: deltaY,
    });
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 max-w-2xl mx-auto w-full">
      {/* Top Sensitivity Controls */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
          <Sliders className="w-4 h-4 text-primary" />
          <span className="font-semibold">Sensitivity</span>
        </div>
        <div className="flex items-center space-x-3 w-48">
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-full accent-primary h-1.5 bg-gray-200 dark:bg-vellichor-border rounded-lg cursor-pointer"
          />
          <span className="font-mono text-gray-500 w-8">{sensitivity}x</span>
        </div>
      </div>

      {/* Main Touchpad Canvas & Scroll Strip */}
      <div className="flex-1 flex space-x-3 min-h-[360px]">
        {/* Trackpad Area */}
        <div
          ref={padRef}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleEnd}
          className="flex-1 relative rounded-3xl bg-gradient-to-b from-gray-100 to-gray-200/80 dark:from-vellichor-surface dark:to-vellichor-card border border-gray-300 dark:border-vellichor-border shadow-inner cursor-crosshair select-none overflow-hidden flex flex-col items-center justify-center transition-colors"
        >
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#6c5ce7_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          {/* Dynamic Touch Indicator */}
          {pointerPos && (
            <div
              className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-primary/40 border-2 border-primary pointer-events-none transform scale-110 transition-transform shadow-glow animate-pulse"
              style={{ left: pointerPos.x, top: pointerPos.y }}
            />
          )}

          <div className="flex flex-col items-center space-y-2 pointer-events-none text-gray-400 dark:text-gray-500">
            <MousePointer className="w-8 h-8 text-primary/70 animate-bounce" />
            <span className="text-xs font-semibold">Touch & Drag to Move Cursor</span>
            <span className="text-[11px] opacity-60">Tap for Left Click • 2 Fingers for Right Click</span>
          </div>
        </div>

        {/* Vertical Scroll Strip */}
        <div className="w-14 rounded-3xl bg-gray-100 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border flex flex-col items-center justify-between p-2 shrink-0">
          <button
            onClick={() => handleScroll(-100)}
            className="w-10 h-10 rounded-xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center space-y-1 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
            <Move className="w-4 h-4 mb-1" />
            <span>S</span>
            <span>C</span>
            <span>R</span>
            <span>O</span>
            <span>L</span>
            <span>L</span>
          </div>
          <button
            onClick={() => handleScroll(100)}
            className="w-10 h-10 rounded-xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mouse Buttons */}
      <div className="grid grid-cols-2 gap-3 h-20 shrink-0">
        <button
          onClick={() => handleClick('left')}
          className="rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-primary active:bg-primary active:text-white text-gray-800 dark:text-white font-bold text-sm shadow-sm hover:shadow-balanced flex items-center justify-center space-x-2 transition-all"
        >
          <span>Left Click</span>
        </button>
        <button
          onClick={() => handleClick('right')}
          className="rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-primary active:bg-primary active:text-white text-gray-800 dark:text-white font-bold text-sm shadow-sm hover:shadow-balanced flex items-center justify-center space-x-2 transition-all"
        >
          <span>Right Click</span>
        </button>
      </div>
    </div>
  );
};
