/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, TerraformIcon } from './Icons';

const DpadButton: React.FC<{
  onPress: () => void;
  onRelease: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
  isKeyPressed?: boolean;
}> = ({ onPress, onRelease, children, className = '', ariaLabel, isKeyPressed = false }) => {
  const [isPointerPressed, setIsPointerPressed] = useState(false);
  const activePointerId = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activePointerId.current !== null) return;
    
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Pointer capture failed.", err);
    }
    activePointerId.current = e.pointerId;

    setIsPointerPressed(true);
    onPress();
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    if (activePointerId.current === e.pointerId) {
      activePointerId.current = null;
      setIsPointerPressed(false);
      onRelease();
    }
  };

  const isVisuallyPressed = isPointerPressed || isKeyPressed;

  return (
    <div
      role="button"
      aria-label={ariaLabel}
      className={`w-10 h-10 sm:w-14 sm:h-14 bg-slate-950/75 backdrop-blur-md border border-cyan-500/30 rounded-full flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,242,255,0.06)] active:shadow-[0_0_20px_#00f2ff] transition-all duration-100 ease-in-out select-none touch-none cursor-pointer ${className} ${isVisuallyPressed ? 'bg-cyan-500/25 border-[#00f2ff] text-white scale-90 shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'hover:border-cyan-400 hover:text-[#00f2ff]'}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onLostPointerCapture={handlePointerUpOrCancel}
    >
      {children}
    </div>
  );
};

const TerraformButton: React.FC<{
  onPress: () => void;
  onRelease: () => void;
  power: number;
}> = ({ onPress, onRelease, power }) => {
  const [isPointerPressed, setIsPointerPressed] = useState(false);
  const activePointerId = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activePointerId.current !== null) return;
    
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Pointer capture failed.", err);
    }
    activePointerId.current = e.pointerId;

    setIsPointerPressed(true);
    onPress();
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    if (activePointerId.current === e.pointerId) {
      activePointerId.current = null;
      setIsPointerPressed(false);
      onRelease();
    }
  };
  
  const isFull = power >= 1.0;
  const isDepleted = power <= 0.01;
  const fillHeight = `${Math.min(1, power) * 100}%`;

  const fillColor = isFull ? 'bg-amber-500/40 shadow-[inset_0_0_12px_rgba(255,204,0,0.4)]' : 'bg-cyan-400/30';
  const iconColor = isFull ? 'text-amber-400 filter drop-shadow-[0_0_8px_rgba(255,204,0,0.8)]' : 'text-cyan-400';

  return (
    <div
      role="button"
      aria-label="Terraform Fractal"
      title="Terraform"
      className={`w-16 h-16 sm:w-20 sm:h-20 bg-slate-950/85 backdrop-blur-md border-2 border-cyan-500/35 rounded-full flex items-center justify-center transition-all duration-150 ease-in-out select-none touch-none transform relative overflow-hidden cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.1)] ${isPointerPressed ? 'scale-95 shadow-[0_0_20px_#00f2ff]' : 'hover:border-cyan-400'} ${isDepleted && !isPointerPressed ? 'opacity-70' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onLostPointerCapture={handlePointerUpOrCancel}
    >
      <div 
        className={`absolute bottom-0 left-0 w-full transition-colors duration-300 ${fillColor}`}
        style={{ height: fillHeight, transitionProperty: 'height, background-color', transitionTimingFunction: 'linear' }}
      />
      <TerraformIcon className={`w-8 h-8 sm:w-10 sm:h-10 relative z-10 transition-colors duration-300 ${iconColor}`} />
    </div>
  );
};


export const DpadControls: React.FC = () => {
  const { pressKey, releaseKey, cameraControlsEnabled, pressedKeys, handleTerraformPress, handleTerraformRelease, terraformPower } = useAppContext();

  if (!cameraControlsEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 flex justify-between items-end pointer-events-none z-30" aria-hidden="true">
      {/* Left Side: Movement */}
      <div className="flex items-end gap-3 pointer-events-auto">
        <div className="grid grid-cols-3 grid-rows-3 w-28 h-28 sm:w-40 sm:h-40">
          <div className="col-start-2 row-start-1 flex justify-center items-center">
            <DpadButton onPress={() => pressKey('w')} onRelease={() => releaseKey('w')} ariaLabel="Move Forward" isKeyPressed={pressedKeys.has('w')}><ChevronUpIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
          </div>
          <div className="col-start-1 row-start-2 flex justify-center items-center">
            <DpadButton onPress={() => pressKey('a')} onRelease={() => releaseKey('a')} ariaLabel="Move Left" isKeyPressed={pressedKeys.has('a')}><ChevronLeftIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
          </div>
          <div className="col-start-3 row-start-2 flex justify-center items-center">
            <DpadButton onPress={() => pressKey('d')} onRelease={() => releaseKey('d')} ariaLabel="Move Right" isKeyPressed={pressedKeys.has('d')}><ChevronRightIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
          </div>
          <div className="col-start-2 row-start-3 flex justify-center items-center">
            <DpadButton onPress={() => pressKey('s')} onRelease={() => releaseKey('s')} ariaLabel="Move Backward" isKeyPressed={pressedKeys.has('s')}><ChevronDownIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
          </div>
        </div>
        <div className="flex flex-col gap-2 h-28 sm:h-40 justify-center pb-1 sm:pb-2">
          <DpadButton onPress={() => pressKey('shift')} onRelease={() => releaseKey('shift')} ariaLabel="Move Down" className="!w-10 !h-16 sm:!w-12 sm:!h-20 !rounded-xl" isKeyPressed={pressedKeys.has('shift')}><ChevronUpIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
          <DpadButton onPress={() => pressKey(' ')} onRelease={() => releaseKey(' ')} ariaLabel="Move Up" className="!w-10 !h-16 sm:!w-12 sm:!h-20 !rounded-xl" isKeyPressed={pressedKeys.has(' ')}><ChevronDownIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
        </div>
      </div>
      
      {/* Center: Terraform Button */}
      <div className="absolute bottom-8 sm:bottom-14 left-1/2 -translate-x-1/2 pointer-events-auto">
        <TerraformButton onPress={handleTerraformPress} onRelease={handleTerraformRelease} power={terraformPower} />
      </div>

      {/* Right Side: Rotation */}
      <div className="pointer-events-auto">
        <div className="grid grid-cols-3 grid-rows-3 w-28 h-28 sm:w-40 sm:h-40">
          <div className="col-start-2 row-start-1 flex justify-center items-center">
            <DpadButton onPress={() => pressKey('arrowup')} onRelease={() => releaseKey('arrowup')} ariaLabel="Look Up" isKeyPressed={pressedKeys.has('arrowup')}><ChevronUpIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
          </div>
          <div className="col-start-1 row-start-2 flex justify-center items-center">
            <DpadButton onPress={() => pressKey('arrowleft')} onRelease={() => releaseKey('arrowleft')} ariaLabel="Look Left" isKeyPressed={pressedKeys.has('arrowleft')}><ChevronLeftIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
          </div>
          <div className="col-start-3 row-start-2 flex justify-center items-center">
            <DpadButton onPress={() => pressKey('arrowright')} onRelease={() => releaseKey('arrowright')} ariaLabel="Look Right" isKeyPressed={pressedKeys.has('arrowright')}><ChevronRightIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
          </div>
          <div className="col-start-2 row-start-3 flex justify-center items-center">
            <DpadButton onPress={() => pressKey('arrowdown')} onRelease={() => releaseKey('arrowdown')} ariaLabel="Look Down" isKeyPressed={pressedKeys.has('arrowdown')}><ChevronDownIcon className="w-5 h-5 sm:w-7 sm:h-7" /></DpadButton>
          </div>
        </div>
      </div>
    </div>
  );
};
