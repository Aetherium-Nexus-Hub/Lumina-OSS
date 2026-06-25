/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/









import React, { useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

// Independent high-performance 2D renderer for HUD overlay
// Bypasses React state for 60fps updates
export const Hud: React.FC = () => {
    const { 
        cameraRef, 
        renderCameraRef, 
        cameraVelocityRef, 
        isHudEnabled, 
        collisionState, 
        viewModeTransition,
        landmarks,
        activeLandmarkId,
        isWarping,
        warpTargetName,
        warpProgress
    } = useAppContext();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Use ref to access latest collision state in render loop without re-triggering effect
    const collisionStateRef = useRef(collisionState);
    useEffect(() => {
        collisionStateRef.current = collisionState;
    }, [collisionState]);

    const landmarksRef = useRef(landmarks);
    useEffect(() => {
        landmarksRef.current = landmarks;
    }, [landmarks]);

    const activeLandmarkIdRef = useRef(activeLandmarkId);
    useEffect(() => {
        activeLandmarkIdRef.current = activeLandmarkId;
    }, [activeLandmarkId]);

    const isWarpingRef = useRef(isWarping);
    useEffect(() => {
        isWarpingRef.current = isWarping;
    }, [isWarping]);

    const warpTargetNameRef = useRef(warpTargetName);
    useEffect(() => {
        warpTargetNameRef.current = warpTargetName;
    }, [warpTargetName]);

    const warpProgressRef = useRef(warpProgress);
    useEffect(() => {
        warpProgressRef.current = warpProgress;
    }, [warpProgress]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isHudEnabled) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        
        const render = () => {
            // Handle resize
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;

            // Opacity for cockpit elements, which fade out in chase view
            const hudAlpha = 1.0 - viewModeTransition;

            // Read mutable refs directly for max speed
            const cam = renderCameraRef.current; // Use renderCamera for correct perspective
            const pitch = cam.rotation[0];
            const yaw = cam.rotation[1];
            const altitude = cameraRef.current.position[1] + 1.49; // Offset by 1.49 so 0 is roughly "ground" level
            const velocity = cameraVelocityRef.current;
            const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) * 120; // Scale speed to knots/kph
            const vY = velocity[1];

            // --- STYLES & COLORS based on Collision State ---
            const currentState = collisionStateRef.current;
            let baseColorStr = '0, 242, 255'; // Cyan (Default)
            if (currentState === 'approaching') {
                baseColorStr = '255, 204, 0'; // Yellow Warning (var(--animus-gold))
            } else if (currentState === 'colliding') {
                baseColorStr = '255, 50, 50'; // Red Alert
            }

            if (hudAlpha > 0.01) {
                ctx.strokeStyle = `rgba(${baseColorStr}, ${0.5 * hudAlpha})`;
                ctx.fillStyle = `rgba(${baseColorStr}, ${0.8 * hudAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.font = 'bold 11px Orbitron, Rajdhani, monospace';

                // --- HORIZON LINE ---
                const fovY = Math.PI / 2; // Assume 90 deg FOV
                const horizonOffsetY = -(pitch / (fovY / 2)) * (h / 2);
                const horizonY = cy + horizonOffsetY;

                if (horizonY > -100 && horizonY < h + 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${baseColorStr}, ${0.5 * hudAlpha})`;
                    ctx.lineWidth = 2;
                    const gap = 120;
                    ctx.moveTo(cx - 300, horizonY); ctx.lineTo(cx - gap, horizonY);
                    ctx.moveTo(cx + gap, horizonY); ctx.lineTo(cx + 300, horizonY);
                    ctx.stroke();

                    // Tiny horizon tag markings
                    ctx.fillStyle = `rgba(${baseColorStr}, ${0.7 * hudAlpha})`;
                    ctx.font = '9px Orbitron, monospace';
                    ctx.fillText('00', cx - gap - 18, horizonY + 3);
                    ctx.fillText('00', cx + gap + 6, horizonY + 3);
                }

                // --- PITCH LADDER LADDERS ---
                const pitchDeg = pitch * (180 / Math.PI);
                const spacing = 45; // Pixels per 10 degrees of pitch
                const pitchLineInterval = 10;
                const startPitch = Math.floor((pitchDeg - 30) / pitchLineInterval) * pitchLineInterval;
                const endPitch = Math.ceil((pitchDeg + 30) / pitchLineInterval) * pitchLineInterval;

                ctx.font = 'bold 9px Orbitron, monospace';
                for (let p = startPitch; p <= endPitch; p += pitchLineInterval) {
                    if (p === 0) continue; // Horizon line drawn separately
                    const relativePitch = p - pitchDeg;
                    const tickY = cy - (relativePitch * (spacing / 10));

                    if (tickY > cy - 180 && tickY < cy + 180) {
                        ctx.strokeStyle = `rgba(${baseColorStr}, ${0.35 * hudAlpha})`;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();

                        const tickWidth = 45;
                        const tickGap = 50;
                        const hookHeight = p > 0 ? 6 : -6;

                        // Left bracket hook
                        ctx.moveTo(cx - tickGap - tickWidth, tickY);
                        ctx.lineTo(cx - tickGap, tickY);
                        ctx.lineTo(cx - tickGap, tickY + hookHeight);

                        // Right bracket hook
                        ctx.moveTo(cx + tickGap + tickWidth, tickY);
                        ctx.lineTo(cx + tickGap, tickY);
                        ctx.lineTo(cx + tickGap, tickY + hookHeight);
                        ctx.stroke();

                        // Draw labels
                        ctx.fillStyle = `rgba(${baseColorStr}, ${0.75 * hudAlpha})`;
                        ctx.textAlign = 'right';
                        ctx.fillText(`${p}`, cx - tickGap - tickWidth - 6, tickY + 3);
                        ctx.textAlign = 'left';
                        ctx.fillText(`${p}`, cx + tickGap + tickWidth + 6, tickY + 3);
                    }
                }

                // --- SLIDING HEADING TAPE (Top Center) ---
                const headingDeg = (((-yaw * 180 / Math.PI) % 360) + 360) % 360;
                const headingTapeY = 55;
                const tapeWidth = 360;
                const pixelsPerDeg = 2.0;

                ctx.strokeStyle = `rgba(${baseColorStr}, ${0.45 * hudAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx - tapeWidth / 2, headingTapeY);
                ctx.lineTo(cx + tapeWidth / 2, headingTapeY);
                ctx.stroke();

                // Center Indicator Cursor
                ctx.fillStyle = `rgba(${baseColorStr}, ${0.95 * hudAlpha})`;
                ctx.beginPath();
                ctx.moveTo(cx, headingTapeY + 4);
                ctx.lineTo(cx - 5, headingTapeY - 2);
                ctx.lineTo(cx + 5, headingTapeY - 2);
                ctx.fill();

                ctx.font = 'bold 9px Orbitron, monospace';
                const startDeg = Math.floor(headingDeg - 60) - (Math.floor(headingDeg - 60) % 5);
                const endDeg = Math.ceil(headingDeg + 60);

                for (let d = startDeg; d <= endDeg; d += 5) {
                    const normD = ((d % 360) + 360) % 360;
                    const x = cx + (d - headingDeg) * pixelsPerDeg;

                    if (x >= cx - tapeWidth / 2 && x <= cx + tapeWidth / 2) {
                        const isMajor = normD % 30 === 0;
                        const tickHeight = isMajor ? 8 : 4;

                        ctx.strokeStyle = `rgba(${baseColorStr}, ${(isMajor ? 0.7 : 0.35) * hudAlpha})`;
                        ctx.beginPath();
                        ctx.moveTo(x, headingTapeY);
                        ctx.lineTo(x, headingTapeY - tickHeight);
                        ctx.stroke();

                        if (isMajor) {
                            let label = normD.toString().padStart(3, '0');
                            if (normD === 0 || normD === 360) label = 'N';
                            else if (normD === 90) label = 'E';
                            else if (normD === 180) label = 'S';
                            else if (normD === 270) label = 'W';

                            ctx.fillStyle = `rgba(${baseColorStr}, ${0.9 * hudAlpha})`;
                            ctx.textAlign = 'center';
                            ctx.fillText(label, x, headingTapeY - 12);
                        }
                    }
                }

                // Digital Heading Display Box above cursor
                ctx.fillStyle = 'rgba(10, 20, 25, 0.9)';
                ctx.strokeStyle = `rgba(${baseColorStr}, ${0.8 * hudAlpha})`;
                ctx.lineWidth = 1;
                ctx.fillRect(cx - 24, headingTapeY + 8, 48, 18);
                ctx.strokeRect(cx - 24, headingTapeY + 8, 48, 18);

                ctx.fillStyle = `rgba(${baseColorStr}, ${0.95 * hudAlpha})`;
                ctx.font = 'bold 11px Orbitron, monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${headingDeg.toFixed(0)}°`, cx, headingTapeY + 21);


                // --- SLIDING ALTITUDE TAPE (Right Side) ---
                const altTapeX = cx + 220;
                const altTapeHeight = 220;
                const altPixelsPerUnit = 22; // Pixels per meter

                // Tape frame outline
                ctx.strokeStyle = `rgba(${baseColorStr}, ${0.35 * hudAlpha})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(altTapeX, cy - altTapeHeight / 2, 45, altTapeHeight);

                ctx.font = '8px Orbitron, monospace';
                const startAlt = Math.max(0, Math.floor(altitude - 5));
                const endAlt = Math.floor(altitude + 5);

                for (let a = startAlt; a <= endAlt; a++) {
                    const y = cy - (a - altitude) * altPixelsPerUnit;
                    if (y >= cy - altTapeHeight / 2 && y <= cy + altTapeHeight / 2) {
                        ctx.strokeStyle = `rgba(${baseColorStr}, ${0.4 * hudAlpha})`;
                        ctx.beginPath();
                        ctx.moveTo(altTapeX, y);
                        ctx.lineTo(altTapeX + 7, y);
                        ctx.stroke();

                        ctx.fillStyle = `rgba(${baseColorStr}, ${0.7 * hudAlpha})`;
                        ctx.textAlign = 'left';
                        ctx.fillText(a.toString(), altTapeX + 11, y + 3);
                    }
                }

                // Current digital altitude display box overlayed
                ctx.fillStyle = 'rgba(10, 20, 25, 0.95)';
                ctx.strokeStyle = `rgba(${baseColorStr}, ${0.9 * hudAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.fillRect(altTapeX - 8, cy - 10, 53, 20);
                ctx.strokeRect(altTapeX - 8, cy - 10, 53, 20);

                ctx.fillStyle = `rgba(${baseColorStr}, ${0.99 * hudAlpha})`;
                ctx.font = 'bold 11px Orbitron, Rajdhani, monospace';
                ctx.textAlign = 'center';
                ctx.fillText(altitude.toFixed(1), altTapeX + 18, cy + 4);


                // --- SLIDING SPEED TAPE (Left Side) ---
                const speedTapeX = cx - 265;
                const speedTapeHeight = 220;
                const speedPixelsPerUnit = 3.5;

                // Tape frame outline
                ctx.strokeStyle = `rgba(${baseColorStr}, ${0.35 * hudAlpha})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(speedTapeX, cy - speedTapeHeight / 2, 45, speedTapeHeight);

                ctx.font = '8px Orbitron, monospace';
                const startSpd = Math.max(0, Math.floor((speed - 30) / 10) * 10);
                const endSpd = Math.floor((speed + 30) / 10) * 10;

                for (let s = startSpd; s <= endSpd; s += 10) {
                    const y = cy + (s - speed) * speedPixelsPerUnit;
                    if (y >= cy - speedTapeHeight / 2 && y <= cy + speedTapeHeight / 2) {
                        ctx.strokeStyle = `rgba(${baseColorStr}, ${0.4 * hudAlpha})`;
                        ctx.beginPath();
                        ctx.moveTo(speedTapeX + 38, y);
                        ctx.lineTo(speedTapeX + 45, y);
                        ctx.stroke();

                        ctx.fillStyle = `rgba(${baseColorStr}, ${0.7 * hudAlpha})`;
                        ctx.textAlign = 'right';
                        ctx.fillText(s.toString(), speedTapeX + 34, y + 3);
                    }
                }

                // Current digital speed indicator box overlayed
                ctx.fillStyle = 'rgba(10, 20, 25, 0.95)';
                ctx.strokeStyle = `rgba(${baseColorStr}, ${0.9 * hudAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.fillRect(speedTapeX, cy - 10, 53, 20);
                ctx.strokeRect(speedTapeX, cy - 10, 53, 20);

                ctx.fillStyle = `rgba(${baseColorStr}, ${0.99 * hudAlpha})`;
                ctx.font = 'bold 11px Orbitron, Rajdhani, monospace';
                ctx.textAlign = 'center';
                ctx.fillText(speed.toFixed(0), speedTapeX + 26, cy + 4);


                // --- CENTER CROSSHAIR (Waterline) ---
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * hudAlpha})`;
                ctx.beginPath();
                ctx.lineWidth = 1.5;
                ctx.moveTo(cx - 22, cy); ctx.lineTo(cx - 6, cy);
                ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 22, cy);
                ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy - 6);
                ctx.stroke();
                ctx.fillStyle = `rgba(255,255,255,${0.65 * hudAlpha})`;
                ctx.fillRect(cx - 1, cy - 1, 2, 2);


                // --- CLIMB RATE INDICATOR ---
                const crHeight = 100;
                const crY = cy;
                const crX = cx + 290;
                ctx.strokeStyle = `rgba(${baseColorStr}, ${0.25 * hudAlpha})`;
                ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * hudAlpha})`;
                ctx.fillRect(crX - 3, crY - crHeight / 2, 6, crHeight);
                ctx.strokeRect(crX - 3, crY - crHeight / 2, 6, crHeight);

                const vYClamped = Math.max(-0.5, Math.min(0.5, vY));
                const indicatorY = crY - (vYClamped / 0.5) * (crHeight / 2);

                ctx.fillStyle = `rgba(${baseColorStr}, ${0.9 * hudAlpha})`;
                ctx.fillRect(crX - 4, indicatorY - 2, 8, 4);

                // Small vertical speed digital tag
                ctx.font = 'bold 8px Orbitron, monospace';
                ctx.fillStyle = `rgba(${baseColorStr}, ${0.8 * hudAlpha})`;
                ctx.textAlign = 'left';
                const vsText = `V/S: ${(vY * 10).toFixed(1)}`;
                ctx.fillText(vsText, crX + 8, cy + 3);


                // --- SCIFI COCKPIT TACTICAL LOCK BRACKETS ---
                ctx.strokeStyle = `rgba(${baseColorStr}, ${0.15 * hudAlpha})`;
                ctx.lineWidth = 1;
                const pad = 45;
                const cornerSize = 25;

                // Top-Left Corners
                ctx.beginPath();
                ctx.moveTo(pad, pad + cornerSize); ctx.lineTo(pad, pad); ctx.lineTo(pad + cornerSize, pad);
                // Top-Right Corners
                ctx.moveTo(w - pad, pad + cornerSize); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad - cornerSize, pad);
                // Bottom-Left Corners
                ctx.moveTo(pad, h - pad - cornerSize); ctx.lineTo(pad, h - pad); ctx.lineTo(pad + cornerSize, h - pad);
                // Bottom-Right Corners
                ctx.moveTo(w - pad, h - pad - cornerSize); ctx.lineTo(w - pad, h - pad); ctx.lineTo(w - pad - cornerSize, h - pad);
                ctx.stroke();

                // --- WAYPOINT BEARING BUG ---
                const activeId = activeLandmarkIdRef.current;
                const currentLandmarks = landmarksRef.current || [];
                const activeLandmark = currentLandmarks.find(l => l.id === activeId);

                if (activeLandmark) {
                    const landmarkPos = activeLandmark.position;
                    const camPos = cameraRef.current.position;
                    const dx = landmarkPos[0] - camPos[0];
                    const dz = landmarkPos[2] - camPos[2];
                    const dy = landmarkPos[1] - camPos[1];
                    
                    const targetHeadingRad = Math.atan2(dx, dz);
                    const targetHeadingDeg = (((targetHeadingRad * 180 / Math.PI) % 360) + 360) % 360;
                    const distanceVal = Math.sqrt(dx * dx + dy * dy + dz * dz) * 100;

                    let diffDeg = targetHeadingDeg - headingDeg;
                    while (diffDeg < -180) diffDeg += 360;
                    while (diffDeg > 180) diffDeg -= 360;

                    const bugX = cx + diffDeg * pixelsPerDeg;

                    if (bugX >= cx - tapeWidth / 2 && bugX <= cx + tapeWidth / 2) {
                        ctx.fillStyle = '#00f2ff';
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 1;
                        
                        ctx.beginPath();
                        ctx.moveTo(bugX, headingTapeY + 1);
                        ctx.lineTo(bugX - 6, headingTapeY + 7);
                        ctx.lineTo(bugX + 6, headingTapeY + 7);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();

                        ctx.font = 'bold 8px Orbitron, monospace';
                        ctx.fillStyle = '#fff';
                        ctx.textAlign = 'center';
                        ctx.fillText('WPT', bugX, headingTapeY + 16);
                    }

                    // Render Digital Waypoint Stats Card (Top Left)
                    ctx.fillStyle = 'rgba(5, 15, 20, 0.85)';
                    ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
                    ctx.lineWidth = 1.5;
                    ctx.fillRect(45, 120, 180, 70);
                    ctx.strokeRect(45, 120, 180, 70);

                    ctx.fillStyle = 'rgba(0, 242, 255, 0.15)';
                    ctx.fillRect(45, 120, 180, 22);
                    ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
                    ctx.beginPath();
                    ctx.moveTo(45, 142); ctx.lineTo(225, 142);
                    ctx.stroke();

                    const pulsePeriod = Date.now() % 1000;
                    ctx.fillStyle = pulsePeriod > 500 ? '#00f2ff' : 'rgba(0, 242, 255, 0.3)';
                    ctx.beginPath();
                    ctx.arc(58, 131, 3, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#00f2ff';
                    ctx.font = 'bold 9px Orbitron, monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(`NAV_TRACKING: ${activeLandmark.name.slice(0, 14).toUpperCase()}`, 68, 134);

                    ctx.font = '9px monospace';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillText(`RNG: ${(distanceVal / 1000).toFixed(3)} KM`, 55, 157);
                    ctx.fillText(`BRG: ${targetHeadingDeg.toFixed(1)}°`, 55, 171);
                    ctx.fillText(`POS: ${landmarkPos.map(v => Math.round(v)).join(',')}`, 55, 184);
                }
            }

            // --- WARP SEQUENCE OVERLAY LAYER ---
            if (isWarpingRef.current) {
                const targetName = warpTargetNameRef.current || 'HYPERSPACE';
                const progress = warpProgressRef.current || 0;

                const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h));
                grad.addColorStop(0, 'rgba(0, 10, 15, 0.45)');
                grad.addColorStop(0.5, 'rgba(0, 242, 255, 0.12)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);

                ctx.strokeStyle = `rgba(0, 242, 255, ${0.1 + progress * 0.4})`;
                ctx.lineWidth = 1 + progress * 2.5;
                const lineCount = 30;
                const timeSeed = Date.now() * 0.003;
                for (let i = 0; i < lineCount; i++) {
                    const angle = (i / lineCount) * Math.PI * 2 + timeSeed;
                    const rStart = Math.max(50, (i % 3) * 50);
                    const rEnd = rStart + 150 + progress * 800;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * rStart, cy + Math.sin(angle) * rStart);
                    ctx.lineTo(cx + Math.cos(angle) * rEnd, cy + Math.sin(angle) * rEnd);
                    ctx.stroke();
                }

                const panelW = 420;
                const panelH = 140;
                const panelX = cx - panelW / 2;
                const panelY = cy - panelH / 2;

                ctx.fillStyle = 'rgba(5, 12, 16, 0.98)';
                ctx.strokeStyle = '#00f2ff';
                ctx.lineWidth = 2;
                ctx.fillRect(panelX, panelY, panelW, panelH);
                ctx.strokeRect(panelX, panelY, panelW, panelH);

                ctx.fillStyle = 'rgba(0, 242, 255, 0.2)';
                ctx.fillRect(panelX, panelY, panelW, 35);
                ctx.beginPath();
                ctx.moveTo(panelX, panelY + 35); ctx.lineTo(panelX + panelW, panelY + 35);
                ctx.stroke();

                ctx.font = 'bold 13px Orbitron, monospace';
                ctx.fillStyle = '#00f2ff';
                ctx.textAlign = 'center';
                ctx.fillText('CRITICAL OPERATION: HYPERJUMP ACTIVE', cx, panelY + 23);

                ctx.font = 'bold 11px Orbitron, monospace';
                ctx.fillStyle = '#fff';
                ctx.fillText(`DESTINATION: ${targetName.toUpperCase()}`, cx, panelY + 68);

                const barW = 340;
                const barH = 16;
                const barX = cx - barW / 2;
                const barY = panelY + 84;

                ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
                ctx.strokeRect(barX, barY, barW, barH);
                ctx.fillStyle = 'rgba(0, 242, 255, 0.15)';
                ctx.fillRect(barX, barY, barW, barH);

                const fillW = barW * progress;
                ctx.fillStyle = '#00f2ff';
                ctx.fillRect(barX, barY, fillW, barH);

                ctx.strokeStyle = 'rgba(10, 20, 25, 0.6)';
                ctx.lineWidth = 1.5;
                for (let step = 1; step < 10; step++) {
                    const stepX = barX + (barW * step) / 10;
                    ctx.beginPath();
                    ctx.moveTo(stepX, barY);
                    ctx.lineTo(stepX, barY + barH);
                    ctx.stroke();
                }

                ctx.font = 'bold 10px monospace';
                ctx.fillStyle = '#00f2ff';
                ctx.textAlign = 'center';
                ctx.fillText(`LOCK ALIGNMENT: ${(progress * 100).toFixed(1)}%`, cx, panelY + 120);

                ctx.strokeStyle = '#00f2ff';
                ctx.lineWidth = 3;
                const bLength = 18;
                ctx.beginPath();
                ctx.moveTo(panelX - 12 + bLength, panelY - 12); ctx.lineTo(panelX - 12, panelY - 12); ctx.lineTo(panelX - 12, panelY - 12 + bLength);
                ctx.moveTo(panelX - 12 + bLength, panelY + panelH + 12); ctx.lineTo(panelX - 12, panelY + panelH + 12); ctx.lineTo(panelX - 12, panelY + panelH + 12 - bLength);
                ctx.moveTo(panelX + panelW + 12 - bLength, panelY - 12); ctx.lineTo(panelX + panelW + 12, panelY - 12); ctx.lineTo(panelX + panelW + 12, panelY - 12 + bLength);
                ctx.moveTo(panelX + panelW + 12 - bLength, panelY + panelH + 12); ctx.lineTo(panelX + panelW + 12, panelY + panelH + 12); ctx.lineTo(panelX + panelW + 12, panelY + panelH + 12 - bLength);
                ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isHudEnabled, cameraRef, renderCameraRef, cameraVelocityRef, viewModeTransition]);

    if (!isHudEnabled) return null;

    return (
        <canvas 
            ref={canvasRef} 
            className="fixed inset-0 z-20 pointer-events-none"
        />
    );
};