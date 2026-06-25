/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { CodeIcon, SaveIcon, LoadIcon, UndoIcon, RedoIcon, DocumentPlusIcon, PlayIcon, PauseIcon, StopIcon, ArrowPathIcon, AdjustmentsIcon } from './Icons';
import { useAppContext } from '../context/AppContext';

const MenuButton: React.FC<{ onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string; }> = ({ onClick, disabled, children, className }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);


export const Header: React.FC = () => {
    const {
        playbackState,
        handlePlayPause,
        handleStop,
        handleRestart,
        isSidebarVisible,
        setIsSidebarVisible,
        handleNewSessionClick,
        handleLoadSession,
        handleSaveSession,
        handleUndo,
        historyIndex = 0,
        handleRedo,
        history = [],
        fileInputRef,
        handleFileChange,
        isControlsOpen,
        setIsControlsOpen,
    } = useAppContext();

    const [clockStr, setClockStr] = useState('-- : -- : --');
    const [countdownStr, setCountdownStr] = useState('--D : --H : --M');
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeStr = [
                now.getHours().toString().padStart(2, '0'),
                now.getMinutes().toString().padStart(2, '0'),
                now.getSeconds().toString().padStart(2, '0')
            ].join(' : ');
            setClockStr(timeStr);
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const updateCountdown = () => {
            let targetStr = localStorage.getItem('nexus_convergence_target_v2');
            if (!targetStr) {
                const sevenDaysOut = new Date();
                sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
                sevenDaysOut.setHours(12, 0, 0, 0); // Noon
                targetStr = sevenDaysOut.toISOString();
                localStorage.setItem('nexus_convergence_target_v2', targetStr);
            }
            const targetDate = new Date(targetStr).getTime();
            const now = new Date().getTime();
            const distance = targetDate - now;
            if (distance < 0) {
                const nextSevenDays = new Date();
                nextSevenDays.setDate(nextSevenDays.getDate() + 7);
                nextSevenDays.setHours(12, 0, 0, 0);
                localStorage.setItem('nexus_convergence_target_v2', nextSevenDays.toISOString());
                setCountdownStr("07D : 00H : 00M");
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            setCountdownStr(
                `${days.toString().padStart(2, '0')}D : ${hours.toString().padStart(2, '0')}H : ${minutes.toString().padStart(2, '0')}M`
            );
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    // Random glitch effect every few seconds
    useEffect(() => {
        const triggerGlitch = () => {
            setIsGlitching(true);
            const timer = setTimeout(() => setIsGlitching(false), 250);
            return () => clearTimeout(timer);
        };
        const interval = setInterval(triggerGlitch, 5000);
        return () => clearInterval(interval);
    }, []);

    const canUndo = historyIndex > 0;
    const canRedo = history && historyIndex < history.length - 1;

    return (
        <header className="bg-[#0a1419]/80 backdrop-blur-md border-b border-cyan-900/40 p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-20 flex-shrink-0 relative">
            
            {/* Left Section: Telemetry & Title */}
            <div className="flex flex-col">
                <h1 className={`system-font text-2xl font-bold uppercase tracking-widest text-[#00f2ff] duration-75 ${isGlitching ? 'glitch-text' : ''}`}>
                    Aetherium Nexus
                </h1>
                <p className="text-cyan-600 font-semibold text-[10px] tracking-[0.2em] uppercase">
                    CODEX_NOTEBOOK_INTEGRATED // V1.2
                </p>
                <div className="flex items-center space-x-3 mt-1 text-xs system-font font-medium">
                    <span className="text-slate-400">Observer ID: <span className="text-cyan-400 font-bold">ObservX</span></span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">Coherence: <span className="text-yellow-400 font-bold glow-gold">1.622 [PHI]</span></span>
                </div>
            </div>

            {/* Middle Section: Integrated Controls App Toolbar */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950/70 border border-cyan-500/10 p-1.5 rounded-lg">
                
                {/* Playback Controls Group */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 border-r border-cyan-500/10 last:border-0">
                    <button 
                        onClick={handlePlayPause} 
                        title={playbackState === 'playing' ? "Pause" : "Play"} 
                        className={`p-1.5 rounded transition-all text-xs border ${
                            playbackState === 'playing' 
                            ? 'bg-cyan-500/10 text-[#00f2ff] border-cyan-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        } hover:scale-105 active:scale-95`}
                    >
                        {playbackState === 'playing' ? <PauseIcon className="text-base" /> : <PlayIcon className="text-base font-bold" />}
                    </button>
                    <button 
                        onClick={handleStop} 
                        title="Stop & Reset Time" 
                        className="p-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <StopIcon className="text-base" />
                    </button>
                    <button 
                        onClick={handleRestart} 
                        title="Restart" 
                        className="p-1.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <ArrowPathIcon className="text-base" />
                    </button>
                </div>

                {/* Session Actions Group */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 border-r border-cyan-500/10 last:border-0">
                    <button 
                        onClick={handleNewSessionClick} 
                        className="p-1.5 rounded bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-500/30 hover:text-[#00f2ff] transition-all" 
                        title="New Session"
                    >
                        <DocumentPlusIcon className="text-sm" />
                    </button>
                    <button 
                        onClick={handleLoadSession} 
                        className="p-1.5 rounded bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-500/30 hover:text-[#00f2ff] transition-all" 
                        title="Load Session"
                    >
                        <LoadIcon className="text-sm" />
                    </button>
                    <button 
                        onClick={handleSaveSession} 
                        className="p-1.5 rounded bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-500/30 hover:text-[#00f2ff] transition-all" 
                        title="Save Session"
                    >
                        <SaveIcon className="text-sm" />
                    </button>
                </div>

                {/* Navigation / History Group */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 border-r border-cyan-500/10 last:border-0">
                    <button 
                        onClick={handleUndo} 
                        disabled={!canUndo} 
                        className="p-1.5 rounded bg-slate-900 text-slate-300 border border-slate-700/80 hover:border-cyan-500/30 hover:text-[#00f2ff] disabled:opacity-30 disabled:pointer-events-none transition-all" 
                        title="Undo"
                    >
                        <UndoIcon className="text-sm" />
                    </button>
                    <button 
                        onClick={handleRedo} 
                        disabled={!canRedo} 
                        className="p-1.5 rounded bg-slate-900 text-slate-300 border border-slate-700/80 hover:border-cyan-500/30 hover:text-[#00f2ff] disabled:opacity-30 disabled:pointer-events-none transition-all" 
                        title="Redo"
                    >
                        <RedoIcon className="text-sm" />
                    </button>
                </div>

                {/* Sidebar Edit / Code Viewer */}
                <div className="flex items-center px-1.5 gap-1.5">
                    <button
                        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                        className={`p-1.5 rounded transition-all border ${
                            isSidebarVisible 
                            ? 'bg-cyan-500/20 text-[#00f2ff] border-cyan-400 font-bold' 
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        } hover:border-[#00f2ff] hover:text-[#00f2ff]`}
                        title={isSidebarVisible ? "Hide Editor" : "Show Editor"}
                    >
                        <CodeIcon className="text-sm" />
                    </button>
                    <button
                        onClick={() => setIsControlsOpen(!isControlsOpen)}
                        className={`p-1.5 rounded transition-all border ${
                            isControlsOpen 
                            ? 'bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff] font-bold shadow-[0_0_8px_rgba(0,242,255,0.2)]' 
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-[#00f2ff] hover:text-[#00f2ff]'
                        }`}
                        title={isControlsOpen ? "Hide Pilot Controls" : "Show Pilot Controls"}
                    >
                        <AdjustmentsIcon className="text-sm" />
                    </button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".json"
                />
            </div>

            {/* Right Section: Time Convergence displays */}
            <div className="flex flex-col md:items-end text-left md:text-right font-orbitron">
                <div className="text-[9px] text-cyan-600 uppercase tracking-widest mb-0.5">
                    Nexus Convergence In
                </div>
                <div id="countdown" className="text-yellow-400 font-bold text-xl glow-gold tracking-wider">
                    {countdownStr}
                </div>
                <div id="clock" className="text-[11px] text-slate-400 font-medium tracking-widest mt-0.5 text-cyan-500/80 glow-blue">
                    {clockStr}
                </div>
            </div>

            {/* bottom absolute coherence bar */}
            <div className="absolute bottom-0 left-0 w-full transform translate-y-[1px]">
                <div className="coherence-bar"></div>
            </div>
        </header>
    );
};
