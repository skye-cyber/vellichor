import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Music2,
  Radio,
} from 'lucide-react';
import { WebRTCService } from '../services/WebRTCService';

export const MediaController: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(35);

  const sendMediaCommand = (command: string, value?: any) => {
    WebRTCService.sendData('control', {
      action: 'media',
      command,
      value,
    });
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    sendMediaCommand('toggle_play');
  };

  const handleVolume = (newVal: number) => {
    setVolume(newVal);
    if (isMuted && newVal > 0) setIsMuted(false);
    sendMediaCommand('set_volume', newVal);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    sendMediaCommand('toggle_mute');
  };

  return (
    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-8 py-4">
      {/* Artwork / Vinyl Display */}
      <div className="text-center space-y-4">
        <div className="relative w-48 h-48 mx-auto rounded-3xl bg-gradient-to-tr from-primary to-accent p-1 shadow-2xl flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-white dark:bg-vellichor-card flex flex-col items-center justify-center space-y-3 overflow-hidden">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 border-4 border-dashed border-primary/40 flex items-center justify-center ${
                isPlaying ? 'animate-spin [animation-duration:8s]' : ''
              }`}
            >
              <Music2 className="w-10 h-10 text-primary" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            {isPlaying ? 'Resonance - Echo Drift' : 'No Media Playing'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isPlaying ? 'Home Session • 320kbps' : 'Open a media player on connected peer'}
          </p>
        </div>
      </div>

      {/* Progress Slider */}
      <div className="space-y-1.5">
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setProgress(val);
              sendMediaCommand('seek', val);
            }}
            className="w-full accent-primary h-1.5 bg-gray-200 dark:bg-vellichor-border rounded-lg cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-gray-400">
          <span>01:14</span>
          <span>03:42</span>
        </div>
      </div>

      {/* Main Playback Controls */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => sendMediaCommand('previous')}
          className="p-3 rounded-2xl bg-gray-100 dark:bg-vellichor-card hover:bg-gray-200 dark:hover:bg-vellichor-surface text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            setProgress(Math.max(0, progress - 5));
            sendMediaCommand('skip_backward');
          }}
          className="p-3 rounded-2xl bg-gray-100 dark:bg-vellichor-card hover:bg-gray-200 dark:hover:bg-vellichor-surface text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-3xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-glow transition-all transform active:scale-95"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 fill-white" />
          ) : (
            <Play className="w-7 h-7 fill-white ml-0.5" />
          )}
        </button>

        <button
          onClick={() => {
            setProgress(Math.min(100, progress + 5));
            sendMediaCommand('skip_forward');
          }}
          className="p-3 rounded-2xl bg-gray-100 dark:bg-vellichor-card hover:bg-gray-200 dark:hover:bg-vellichor-surface text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <button
          onClick={() => sendMediaCommand('next')}
          className="p-3 rounded-2xl bg-gray-100 dark:bg-vellichor-card hover:bg-gray-200 dark:hover:bg-vellichor-surface text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Volume Bar */}
      <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border">
        <button
          onClick={toggleMute}
          className="text-gray-500 hover:text-primary transition-colors"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-5 h-5 text-red-500" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolume(parseInt(e.target.value))}
          className="flex-1 accent-primary h-1.5 bg-gray-200 dark:bg-vellichor-border rounded-lg cursor-pointer"
        />
        <span className="font-mono text-xs text-gray-500 w-8 text-right">
          {isMuted ? 0 : volume}%
        </span>
      </div>
    </div>
  );
};
