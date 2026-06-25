import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

export const GestureControls: React.FC = () => {
  const { 
    cameraControlsEnabled, 
    controlConfig, 
    handleTerraformPress,
    handleTerraformRelease
  } = useAppContext();

  // If pilot navigation is off, or gestural systems are not toggled, render nothing
  if (!cameraControlsEnabled || !controlConfig.enableGestureControls) {
    // Zero out inputs on bypass to ensure no drift
    const gw = window as any;
    gw.gestureFwdInput = 0;
    gw.gestureStrInput = 0;
    gw.gestureAscInput = 0;
    gw.gesturePitchInput = 0;
    gw.gestureYawInput = 0;
    return null;
  }

  const mode = controlConfig.gestureMode || 'touch';

  return (
    <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {mode === 'touch' && <TouchJoystickControls />}
      {mode === 'tilt' && <TiltGyroControls />}
      {mode === 'webcam' && <WebcamMotionControls />}
      
      {/* Dynamic Flight Assist Notification */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 border border-cyan-500/40 rounded-full backdrop-blur-md text-[#00f2ff] font-sans font-medium text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(0,242,255,0.15)] animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
        <span>Gesture Assist: {mode.toUpperCase()} MODE</span>
      </div>
    </div>
  );
};

/* ==========================================
   1. TOUCH DUAL-JOYSTICKS (DYNAMIC CENTERING)
   ========================================== */
interface TouchPadState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const TouchJoystickControls: React.FC = () => {
  const [leftTouch, setLeftTouch] = useState<TouchPadState>({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [rightTouch, setRightTouch] = useState<TouchPadState>({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      // Clear inputs upon unmount or transition
      const gw = window as any;
      gw.gestureFwdInput = 0;
      gw.gestureStrInput = 0;
      gw.gesturePitchInput = 0;
      gw.gestureYawInput = 0;
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const isLeft = x < rect.width / 2;

    const padState: TouchPadState = { active: true, startX: x, startY: y, currentX: x, currentY: y };

    if (isLeft) {
      setLeftTouch(padState);
    } else {
      setRightTouch(padState);
    }
    
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("Pointer capture failed", err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gw = window as any;
    const limit = 60; // Maximum joystick offset distance in pixels

    if (leftTouch.active && leftTouch.startX < rect.width / 2 && x < rect.width * 0.65) {
      // Left touch controls Translation
      let dx = x - leftTouch.startX;
      let dy = y - leftTouch.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > limit) {
        dx = (dx / dist) * limit;
        dy = (dy / dist) * limit;
      }
      setLeftTouch(prev => ({ ...prev, currentX: prev.startX + dx, currentY: prev.startY + dy }));

      gw.gestureStrInput = dx / limit;
      gw.gestureFwdInput = -dy / limit; // Drag up goes forward
    }

    if (rightTouch.active && rightTouch.startX >= rect.width / 2 && x >= rect.width * 0.35) {
      // Right touch controls Steering (Pitch & Yaw)
      let dx = x - rightTouch.startX;
      let dy = y - rightTouch.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > limit) {
        dx = (dx / dist) * limit;
        dy = (dy / dist) * limit;
      }
      setRightTouch(prev => ({ ...prev, currentX: prev.startX + dx, currentY: prev.startY + dy }));

      gw.gestureYawInput = dx / limit;
      gw.gesturePitchInput = dy / limit; // Drag down looks down
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;

    const gw = window as any;

    if (isLeft || leftTouch.active) {
      setLeftTouch({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
      gw.gestureFwdInput = 0;
      gw.gestureStrInput = 0;
    }
    
    if (!isLeft || rightTouch.active) {
      setRightTouch({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
      gw.gesturePitchInput = 0;
      gw.gestureYawInput = 0;
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-auto touch-none flex"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Left Touch Pad Zone */}
      <div className="flex-1 relative border-r border-cyan-500/5 flex items-center justify-center">
        {/* Helper cockpit labeling */}
        <div className="absolute bottom-12 left-8 font-mono text-[9px] text-cyan-500/45 tracking-widest uppercase">
          [Vector Thrust Joystick Grid] <br />
          Drag to strafe left/right, slide fwd/back
        </div>

        {leftTouch.active && (
          <div 
            className="absolute rounded-full pointer-events-none transition-transform duration-75 flex items-center justify-center"
            style={{
              left: leftTouch.startX - 60,
              top: leftTouch.startY - 60,
              width: 120,
              height: 120,
            }}
          >
            {/* Outer ring */}
            <div className="absolute inset-0 border-2 border-dashed border-cyan-400/25 rounded-full animate-spin [animation-duration:12s]" />
            <div className="absolute inset-1 border border-[#00f2ff]/30 rounded-full shadow-[0_0_20px_rgba(0,242,255,0.05)] bg-[#000a12]/30" />
            <div className="absolute w-[18px] h-[18px] border-l border-t border-[#00f2ff]/60 left-0 top-0" />
            <div className="absolute w-[18px] h-[18px] border-r border-t border-[#00f2ff]/60 right-0 top-0" />
            <div className="absolute w-[18px] h-[18px] border-l border-b border-[#00f2ff]/60 left-0 bottom-0" />
            <div className="absolute w-[18px] h-[18px] border-r border-b border-[#00f2ff]/60 right-0 bottom-0" />
            
            {/* Center crosshair */}
            <div className="absolute w-4 h-0.5 bg-cyan-500/50" />
            <div className="absolute h-4 w-0.5 bg-cyan-500/50" />

            {/* Floating stick cap */}
            <div 
              className="absolute w-12 h-12 rounded-full border border-[#00f2ff] bg-gradient-to-br from-cyan-400/40 to-[#022e38] shadow-[0_0_15px_rgba(0,242,255,0.5),inset_0_0_10px_rgba(255,255,255,0.2)] flex items-center justify-center"
              style={{
                transform: `translate(${leftTouch.currentX - leftTouch.startX}px, ${leftTouch.currentY - leftTouch.startY}px)`,
              }}
            >
              <div className="w-4 h-4 rounded-full bg-cyan-400 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Right Touch Pad Zone */}
      <div className="flex-1 relative flex items-center justify-center">
        <div className="absolute bottom-12 right-8 font-mono text-[9px] text-cyan-500/45 tracking-widest text-right uppercase">
          [Attitude Steering Sensor Grid] <br />
          Drag to steer pitch / yaw
        </div>

        {rightTouch.active && (
          <div 
            className="absolute rounded-full pointer-events-none transition-transform duration-75 flex items-center justify-center"
            style={{
              left: rightTouch.startX - 60,
              top: rightTouch.startY - 60,
              width: 120,
              height: 120,
            }}
          >
            {/* Outer ring */}
            <div className="absolute inset-0 border border-dashed border-[#10b981]/30 rounded-full animate-spin [animation-duration:15s]" />
            <div className="absolute inset-1 border border-emerald-500/25 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.05)] bg-[#000a06]/30" />
            
            <div className="absolute w-[18px] h-[18px] border-l border-t border-emerald-500/60 left-0 top-0" />
            <div className="absolute w-[18px] h-[18px] border-r border-t border-emerald-500/60 right-0 top-0" />
            <div className="absolute w-[18px] h-[18px] border-l border-b border-emerald-500/60 left-0 bottom-0" />
            <div className="absolute w-[18px] h-[18px] border-r border-b border-emerald-500/60 right-0 bottom-0" />

            {/* Center target circle */}
            <div className="absolute w-6 h-6 rounded-full border border-emerald-500/40 border-dotted" />

            {/* Floating stick cap */}
            <div 
              className="absolute w-12 h-12 rounded-full border border-emerald-500 bg-gradient-to-br from-emerald-400/40 to-[#022d1b] shadow-[0_0_15px_rgba(16,185,129,0.5),inset_0_0_10px_rgba(255,255,255,0.2)] flex items-center justify-center"
              style={{
                transform: `translate(${rightTouch.currentX - rightTouch.startX}px, ${rightTouch.currentY - rightTouch.startY}px)`,
              }}
            >
              <div className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ==========================================
   2. DEVICE GYRO TILT PILOT (DEVICEORENTATION)
   ========================================== */
const TiltGyroControls: React.FC = () => {
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'unavailable'>('prompt');

  const pitchRef = useRef(0);
  const rollRef = useRef(0);

  const requestPermission = async () => {
    const dDeviceOrientationEvent = (window as any).DeviceOrientationEvent;
    if (dDeviceOrientationEvent && typeof dDeviceOrientationEvent.requestPermission === 'function') {
      try {
        const p = await dDeviceOrientationEvent.requestPermission();
        if (p === 'granted') {
          setPermissionState('granted');
        } else {
          setPermissionState('unavailable');
        }
      } catch (err) {
        setPermissionState('unavailable');
      }
    } else if (window.DeviceOrientationEvent) {
      setPermissionState('granted');
    } else {
      setPermissionState('unavailable');
    }
  };

  useEffect(() => {
    if (permissionState === 'granted') {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        const gw = window as any;
        const beta = e.beta || 0;  // -180 to 180 (Pitch front-to-back tilt)
        const gamma = e.gamma || 0; // -90 to 90 (Roll/steering tilt)

        // Calibrate neutral reference: sitting comfortably at around 45 degrees tilt
        const neutralPitch = 45; 
        const maxPitchRange = 25; // Deadband and tilt sensitivity
        const maxRollRange = 25;

        let deltaPitch = beta - neutralPitch;
        deltaPitch = Math.max(-maxPitchRange, Math.min(maxPitchRange, deltaPitch));
        const finalPitchInput = deltaPitch / maxPitchRange;

        let deltaRoll = gamma;
        deltaRoll = Math.max(-maxRollRange, Math.min(maxRollRange, deltaRoll));
        const finalRollInput = deltaRoll / maxRollRange;

        pitchRef.current = finalPitchInput;
        rollRef.current = finalRollInput;

        setPitch(finalPitchInput);
        setRoll(finalRollInput);

        gw.gesturePitchInput = finalPitchInput * 0.8; // map smoothly
        gw.gestureYawInput = finalRollInput * 0.8;
      };

      window.addEventListener('deviceorientation', handleOrientation);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        const gw = window as any;
        gw.gesturePitchInput = 0;
        gw.gestureYawInput = 0;
      };
    }
  }, [permissionState]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {permissionState === 'prompt' && (
        <button
          onClick={requestPermission}
          className="pointer-events-auto px-6 py-3 bg-[#000a12]/85 border border-[#00f2ff] text-[#00f2ff] font-orbitron font-bold rounded-md hover:bg-cyan-500/20 active:scale-95 transition-all text-xs tracking-widest shadow-[0_0_20px_rgba(0,242,255,0.25)]"
        >
          [INITIALIZE GYRO MATRIX]
        </button>
      )}

      {permissionState === 'unavailable' && (
        <div className="px-5 py-3 bg-red-950/80 border border-red-500/40 text-red-400 font-mono text-center rounded text-xs select-none">
          GYRO HARDWARE NOT RESPONDING <br />
          <span className="text-[10px] text-gray-500 uppercase font-bold">Please utilize mouse/touch swipe controllers</span>
        </div>
      )}

      {permissionState === 'granted' && (
        <div className="relative w-64 h-64 border border-[#00f2ff]/10 rounded-full flex items-center justify-center bg-radial from-[#000d14]/20">
          {/* Cybernetic Gyro Reticle */}
          <div className="absolute inset-0 border border-dashed border-cyan-500/20 rounded-full animate-pulse" />
          
          {/* Horizon Line */}
          <div 
            className="w-48 h-0.5 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent shadow-[0_0_8px_rgba(0,242,255,0.5)] transition-all"
            style={{
              transform: `rotate(${-roll * 35}deg) translateY(${pitch * 40}px)`,
            }}
          />

          {/* Core Reticle */}
          <div className="w-6 h-6 rounded-full border border-[#00f2ff]/50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>

          <div className="absolute bottom-6 font-mono text-[9px] text-[#00f2ff]/50 uppercase tracking-widest text-center">
            Tilt Pitch: {(pitch * 100).toFixed(0)}% <br />
            Tilt Roll: {(roll * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================
   3. WEBCAM MOTION ZONE-DIFFER CONTROLLER
   ========================================== */
const WebcamMotionControls: React.FC = () => {
  const [streamActive, setStreamActive] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [motionData, setMotionData] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  // Buffer state to calculate frame differentials
  const prevLumRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const runStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: false, 
          video: { 
            width: { ideal: 160 }, 
            height: { ideal: 120 },
            facingMode: 'user'
          } 
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
        }
      } catch (err) {
        console.error("Webcam trigger failed", err);
        setErrorText("CAMERA INGRESS DENIED. ENSURE PERMISSIONS ARE STAGED IN SETTINGS.");
      }
    };

    runStream();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      cancelAnimationFrame(requestRef.current);
      const gw = window as any;
      gw.gesturePitchInput = 0;
      gw.gestureYawInput = 0;
      gw.gestureFwdInput = 0;
    };
  }, []);

  // Frame processing loop
  useEffect(() => {
    if (!streamActive) return;

    const width = 40;
    const height = 30;
    const procCanvas = document.createElement('canvas');
    procCanvas.width = width;
    procCanvas.height = height;
    const procCtx = procCanvas.getContext('2d');

    const trackLoop = () => {
      const video = videoRef.current;
      const displayCanvas = canvasRef.current;
      if (!video || !procCtx || !displayCanvas) {
        requestRef.current = requestAnimationFrame(trackLoop);
        return;
      }

      // 1. Draw scaled frame to processing context
      try {
        procCtx.drawImage(video, 0, 0, width, height);
      } catch (e) {
        requestRef.current = requestAnimationFrame(trackLoop);
        return;
      }

      const imgData = procCtx.getImageData(0, 0, width, height);
      const pixels = imgData.data;
      const count = width * height;
      const currentLum = new Uint8Array(count);

      // 2. Grayscale luminance calculation
      for (let i = 0; i < count; i++) {
        const idx = i * 4;
        const R = pixels[idx];
        const G = pixels[idx + 1];
        const B = pixels[idx + 2];
        currentLum[i] = 0.299 * R + 0.587 * G + 0.114 * B;
      }

      const prevLum = prevLumRef.current;
      let leftMotionSum = 0;
      let rightMotionSum = 0;
      let topMotionSum = 0;
      let bottomMotionSum = 0;

      // Ensure we draw visual representation on our cockpit webcam overlay canvas
      const dCtx = displayCanvas.getContext('2d');
      if (dCtx) {
        dCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        
        // Render slightly translucent camera stream
        dCtx.save();
        dCtx.globalAlpha = 0.2;
        dCtx.translate(displayCanvas.width, 0);
        dCtx.scale(-1, 1); // Mirror for feedback sanity
        dCtx.drawImage(video, 0, 0, displayCanvas.width, displayCanvas.height);
        dCtx.restore();

        // Cyber cockpit styling
        dCtx.strokeStyle = 'rgba(0, 242, 255, 0.15)';
        dCtx.lineWidth = 1;
        // Horizontal scanlines on HUD
        for (let i = 0; i < displayCanvas.height; i += 4) {
          dCtx.beginPath();
          dCtx.moveTo(0, i);
          dCtx.lineTo(displayCanvas.width, i);
          dCtx.stroke();
        }
      }

      if (prevLum) {
        const threshold = 18;
        // Accumulate differences
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const diff = Math.abs(currentLum[idx] - prevLum[idx]);

            if (diff > threshold) {
              // Map motion pixels to quadrants
              if (x < width * 0.45) {
                leftMotionSum++;
              }
              if (x >= width * 0.55) {
                rightMotionSum++;
              }
              if (y < height * 0.45) {
                topMotionSum++;
              }
              if (y >= height * 0.55) {
                bottomMotionSum++;
              }

              // Render active motion pixels on the HUD
              if (dCtx) {
                const rx = displayCanvas.width - (x / width) * displayCanvas.width; // Mirroring
                const ry = (y / height) * displayCanvas.height;
                dCtx.fillStyle = 'rgba(0, 242, 255, 0.4)';
                dCtx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
              }
            }
          }
        }

        // Apply spatial weighting bounds
        const scalingFactor = 70; // Sensible threshold of changed pixels
        const lVal = Math.min(1.0, leftMotionSum / scalingFactor);
        const rVal = Math.min(1.0, rightMotionSum / scalingFactor);
        const tVal = Math.min(1.0, topMotionSum / scalingFactor);
        const bVal = Math.min(1.0, bottomMotionSum / scalingFactor);

        setMotionData({ left: lVal, right: rVal, top: tVal, bottom: bVal });

        // Translate quadrant weightings to logical navigation variables
        const gw = window as any;
        
        // Steering
        gw.gestureYawInput = (lVal - rVal) * 0.8;    // Tilting body left or right
        gw.gesturePitchInput = (tVal - bVal) * 0.7;  // Raise hands or move up/down
        
        // Virtual Cruise engine: rapid motion in top half maintains forward velocity
        if (tVal > 0.6 && lVal < 0.3 && rVal < 0.3) {
           gw.gestureFwdInput = 0.5;
        } else if (bVal > 0.6) {
           gw.gestureFwdInput = -0.5; // Backwards / Braking
        } else {
           gw.gestureFwdInput = 0;
        }
      }

      prevLumRef.current = currentLum;
      requestRef.current = requestAnimationFrame(trackLoop);
    };

    requestRef.current = requestAnimationFrame(trackLoop);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [streamActive]);

  return (
    <div className="absolute top-16 right-4 pointer-events-auto bg-[#000a12]/80 border border-cyan-500/30 rounded-md shadow-[0_0_15px_rgba(0,242,255,0.1)] p-1.5 flex flex-col items-center w-36 overflow-hidden">
      {/* Hidden processing components */}
      <video ref={videoRef} className="hidden" playsInline muted />

      <span className="font-mono text-[7px] text-cyan-400 font-bold tracking-widest uppercase mb-1 flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
        AI PILOT HUD FEED
      </span>

      {errorText ? (
        <div className="w-full h-24 flex items-center justify-center p-2 text-center text-[7px] font-mono text-red-400">
          {errorText}
        </div>
      ) : (
        <div className="relative w-full aspect-video border border-cyan-500/10 rounded overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full block bg-slate-950" width={112} height={84} />
          
          {/* Diagnostic Quadrants boundary markers on overlay */}
          <div className="absolute inset-0 border border-cyan-500/5 pointer-events-none flex items-center justify-center">
            <span className="absolute h-full w-[1px] bg-cyan-500/5 left-1/2" />
            <span className="absolute w-full h-[1px] bg-cyan-500/5 top-1/2" />
          </div>
        </div>
      )}

      {/* Real-time telemetry signals feedback */}
      <div className="w-full grid grid-cols-2 gap-1 mt-1.5 font-mono text-[8px] text-[#00f2ff]/65">
        <div className={`p-0.5 rounded border text-center transition-colors ${motionData.left > 0.35 ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-slate-950/40 border-cyan-950/40'}`}>
          L: {(motionData.left * 100).toFixed(0)}%
        </div>
        <div className={`p-0.5 rounded border text-center transition-colors ${motionData.right > 0.35 ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-slate-950/40 border-cyan-950/40'}`}>
          R: {(motionData.right * 100).toFixed(0)}%
        </div>
        <div className={`p-0.5 rounded border text-center transition-colors ${motionData.top > 0.35 ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-slate-950/40 border-cyan-940/40'}`}>
          U: {(motionData.top * 100).toFixed(0)}%
        </div>
        <div className={`p-0.5 rounded border text-center transition-colors ${motionData.bottom > 0.35 ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-slate-950/40 border-cyan-940/40'}`}>
          D: {(motionData.bottom * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
};
