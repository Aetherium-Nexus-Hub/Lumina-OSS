/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { XCircleIcon, TerraformIcon, AdjustmentsIcon, SparklesIcon } from './Icons';
import { ControlConfig, Modulation, ModulationSource, ModulationTarget, ShipModulation, ShipModulationTarget } from '../types';
import { generateAudioModulation } from '../services/GeminiService';
import { v4 as uuidv4 } from 'uuid';
import { ENABLE_AI_FEATURES } from '../config';

const CANVAS_SIZES = [
    { label: 'Square (Fit Width)', value: '100%_square' },
    { label: 'Square (Fit Height)', value: '100%_height_square' },
    { label: 'Square (Fit Screen)', value: 'fit_screen_square' },
    { label: 'Full Screen', value: '100%' },
    { label: '1024px', value: '1024px' },
    { label: '512px', value: '512px' },
    { label: '256px', value: '256px' },
];

const NumberInputWithSteppers: React.FC<{
    value: number;
    onChange: (newValue: number) => void;
    step?: number;
    smallStep?: number;
    min?: number;
    max?: number;
    className?: string;
}> = ({ value, onChange, step = 0.01, smallStep = 0.0001, min = -Infinity, max = Infinity, className }) => {
    const [inputValue, setInputValue] = useState(value.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (document.activeElement !== inputRef.current) {
            setInputValue(value.toString());
        }
    }, [value]);

    const commitChange = (valStr: string) => {
        let numValue = parseFloat(valStr);
        if (!isNaN(numValue)) {
            numValue = Math.max(min, Math.min(max, numValue));
            if (numValue !== value) {
                onChange(numValue);
            }
            setInputValue(numValue.toString());
        } else {
            setInputValue(value.toString());
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleBlur = () => {
        commitChange(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            commitChange(inputValue);
            inputRef.current?.blur();
        } else if (e.key === 'Escape') {
            setInputValue(value.toString());
            inputRef.current?.blur();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleStep(step);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleStep(-step);
        }
    };

    const handleStep = (increment: number) => {
        const newValue = parseFloat((value + increment).toPrecision(15));
        onChange(Math.max(min, Math.min(max, newValue)));
    };

    return (
        <div className={`flex items-center bg-slate-950 border border-cyan-900/40 text-cyan-400 font-mono text-xs rounded shadow-[0_0_8px_rgba(0,242,255,0.03)] overflow-hidden ${className}`}>
            <button
                onClick={() => handleStep(-smallStep)}
                className="px-1.5 py-0.5 text-cyan-600 hover:text-[#00f2ff] hover:bg-cyan-950/40 font-mono text-[10px] select-none transition-colors cursor-pointer border-r border-cyan-950"
                aria-label={`Decrement by ${smallStep}`}
            >
                -
            </button>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-14 bg-transparent text-center font-mono text-[#00f2ff] text-[11px] focus:outline-none outline-none select-all"
            />
            <button
                onClick={() => handleStep(smallStep)}
                className="px-1.5 py-0.5 text-cyan-600 hover:text-[#00f2ff] hover:bg-cyan-950/40 font-mono text-[10px] select-none transition-colors cursor-pointer border-l border-cyan-950"
                aria-label={`Increment by ${smallStep}`}
            >
                +
            </button>
        </div>
    );
};

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={isActive}
    className={`relative px-3 py-2 text-[10px] font-bold uppercase font-orbitron tracking-widest transition-all duration-200 border-r border-cyan-900/15
                flex flex-col items-center justify-center min-w-[70px] h-11 cursor-pointer select-none
                ${isActive
                  ? 'bg-cyan-950/35 text-[#00f2ff] border-t-2 border-t-[#00f2ff] shadow-[inset_0_2px_8px_rgba(0,242,255,0.12)]'
                  : 'bg-slate-950/70 text-cyan-800 hover:bg-slate-900 border-t-2 border-t-transparent hover:text-cyan-400'
                }`}
  >
    <span className={`w-1 h-1 rounded-full mb-1 transition-all duration-300 ${isActive ? 'bg-[#00f2ff] shadow-[0_0_6px_#00f2ff,0_0_2px_#fff]' : 'bg-cyan-950/60'}`} />
    <span className="text-[10px] uppercase font-bold text-center">{label}</span>
  </button>
);

const SlidersPanel: React.FC = () => {
    const { sliders, uniforms, handleUniformChange, handleUniformsCommit } = useAppContext();
    return (
      <div className="space-y-4">
          {sliders.length > 0 ? (
              sliders.map((slider) => {
                const currentVal = uniforms[slider.variableName] ?? slider.defaultValue;
                const percent = Math.max(0, Math.min(100, ((currentVal - slider.min) / (slider.max - slider.min)) * 100));
                return (
                  <div key={slider.variableName} className="p-3.5 bg-slate-950/65 border border-cyan-900/20 hover:border-cyan-500/30 rounded-md transition-all relative group">
                      <div className="absolute top-1 right-1 flex gap-0.5 opacity-25 group-hover:opacity-60 transition-opacity">
                          <span className="w-1 h-1 rounded-full bg-slate-700 block">&#1.83;</span>
                      </div>
                      <div className="flex justify-between items-center mb-2.5">
                          <label 
                              htmlFor={slider.variableName}
                              className="text-xs text-cyan-400 font-orbitron font-medium tracking-wide cursor-help border-b border-dotted border-cyan-800/30"
                              title={slider.description}
                          >
                              {slider.name}
                          </label>
                          <NumberInputWithSteppers
                              value={currentVal}
                              onChange={(newValue) => handleUniformChange(slider.variableName, newValue)}
                              step={slider.step}
                              min={slider.min}
                              max={slider.max}
                          />
                      </div>
                      <input
                          type="range"
                          id={slider.variableName}
                          name={slider.variableName}
                          min={slider.min}
                          max={slider.max}
                          step={slider.step}
                          value={currentVal}
                          onChange={(e) => handleUniformChange(slider.variableName, parseFloat(e.target.value))}
                          onMouseUp={handleUniformsCommit}
                          onTouchEnd={handleUniformsCommit}
                          className="w-full bg-slate-900 rounded appearance-none cursor-pointer focus:outline-none accent-[#00f2ff] h-1.5 border border-cyan-950/60"
                          style={{
                              backgroundImage: 'linear-gradient(90deg, #10b981 0%, #00f2ff 100%)',
                              backgroundSize: `${percent}% 100%`,
                              backgroundRepeat: 'no-repeat'
                          }}
                      />
                  </div>
                );
              })
          ) : (
            <p className="text-gray-500 text-center py-8 font-mono text-xs border border-dashed border-cyan-950/30 rounded">No tweakable virtual synthesizers mapped.</p>
          )}
      </div>
    );
};

const ToggleSwitch: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  small?: boolean;
}> = ({ label, description, checked, onChange, small = false }) => (
    <label title={description} className={`flex items-center justify-between cursor-pointer transition-all duration-150 ${small ? '' : 'p-3 bg-slate-950/65 border border-cyan-900/15 hover:border-cyan-500/25 rounded-md'}`}>
        <span className={`font-orbitron tracking-wider ${small ? 'text-[10px] text-slate-400' : 'text-[11px] text-[#00f2ff] uppercase font-bold'}`}>{label}</span>
        <div className="relative flex items-center">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
            <div className={`border border-cyan-900/40 bg-slate-900 rounded transition-all duration-200 flex items-center px-1
                             peer-checked:border-[#00f2ff]/60 peer-checked:shadow-[0_0_10px_rgba(0,242,255,0.1)]
                             ${small ? 'h-5 w-11' : 'h-6.5 w-13'}`}>
                <div className={`rounded bg-slate-800 border border-slate-700 transition-all duration-200 flex items-center justify-center
                                 ${small ? 'h-3.5 w-[18px]' : 'h-4.5 w-5'} 
                                 ${checked 
                                     ? 'translate-x-[16px] bg-cyan-950 border-[#00f2ff]/75 text-[#00f2ff]' 
                                     : 'translate-x-0 text-slate-500'}`}
                >
                    <span className="text-[7px] font-bold select-none">{checked ? "ON" : "OFF"}</span>
                </div>
            </div>
        </div>
    </label>
);

const ControlSlider: React.FC<{
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  mini?: boolean;
}> = ({ label, description, value, min = 0, max = 3, step = 0.05, onChange, mini = false }) => {
    const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    return (
        <div className={mini ? '' : "p-3.5 bg-slate-950/65 border border-cyan-900/20 hover:border-cyan-500/30 rounded-md transition-all relative group"}>
            {!mini && (
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-25 group-hover:opacity-60 transition-opacity">
                    <span className="w-1 h-1 rounded-full bg-slate-700 block">&#1.83;</span>
                </div>
            )}
            <div className="flex justify-between items-center mb-2">
                <label
                    htmlFor={`control-slider-${label}`}
                    className={`${mini ? 'text-[11px]' : 'text-xs'} text-cyan-400 font-orbitron font-medium tracking-wide cursor-help border-b border-dotted border-cyan-800/30`}
                    title={description}
                >
                    {label}
                </label>
                <NumberInputWithSteppers
                    value={value}
                    onChange={onChange}
                    step={step}
                    min={min}
                    max={max}
                />
            </div>
            <input
                type="range"
                id={`control-slider-${label}`}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={`w-full bg-slate-900 rounded appearance-none cursor-pointer focus:outline-none accent-[#00f2ff] border border-cyan-950/60 ${mini ? 'h-1' : 'h-1.5'}`}
                style={{
                    backgroundImage: 'linear-gradient(90deg, #10b981 0%, #00f2ff 100%)',
                    backgroundSize: `${percent}% 100%`,
                    backgroundRepeat: 'no-repeat'
                }}
            />
        </div>
    );
};

const ModulationRow: React.FC<{
    mod: Modulation;
    onUpdate: (id: string, config: Partial<Modulation>) => void;
    onRemove: (id: string) => void;
}> = ({ mod, onUpdate, onRemove }) => {
    const sources: ModulationSource[] = [
        'speed', 'acceleration', 'altitude', 'descent', 
        'turning', 'turningSigned', 'heading', 'pitch', 'proximity', 'time'
    ];
    const targets: ModulationTarget[] = [
        'masterVolume', 
        'drone.gain', 'drone.filter', 'drone.pitch',
        'atmosphere.gain', 
        'arp.gain', 'arp.speed', 'arp.filter', 'arp.octaves', 'arp.direction',
        'rhythm.gain', 'rhythm.filter', 'rhythm.bpm',
        'melody.gain', 'melody.density',
        'reverb.mix', 'reverb.tone'
    ];

    return (
        <div className={`p-3 rounded-lg border ${mod.enabled ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-900/30 border-gray-800 opacity-60'}`}>
            <div className="flex items-center gap-2 mb-3">
                <input
                    type="checkbox"
                    checked={mod.enabled}
                    onChange={(e) => onUpdate(mod.id, { enabled: e.target.checked })}
                     className="w-4 h-4 bg-gray-700 border-gray-500 rounded text-cyan-500 focus:ring-offset-gray-800"
                />
                <select
                    value={mod.source}
                    onChange={(e) => onUpdate(mod.id, { source: e.target.value as ModulationSource })}
                    className="bg-gray-900 text-xs text-white p-1 rounded border border-gray-700 outline-none"
                >
                    {sources.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
                <span className="text-gray-500 text-xs">→</span>
                <select
                    value={mod.target}
                    onChange={(e) => onUpdate(mod.id, { target: e.target.value as ModulationTarget })}
                    className="bg-gray-900 text-xs text-white p-1 rounded border border-gray-700 outline-none flex-grow"
                >
                    {targets.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={() => onRemove(mod.id)} className="text-gray-500 hover:text-red-400">
                    <XCircleIcon className="w-4 h-4" />
                </button>
            </div>
            {mod.enabled && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12">Amount</span>
                    <input
                        type="range"
                        min={-1.0} max={1.0} step={0.01}
                        value={mod.amount}
                        onChange={(e) => onUpdate(mod.id, { amount: parseFloat(e.target.value) })}
                        className="flex-grow h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-xs font-mono text-cyan-400 w-10 text-right">
                        {(mod.amount * 100).toFixed(0)}%
                    </span>
                </div>
            )}
        </div>
    );
};

const ShipModulationRow: React.FC<{
    mod: ShipModulation;
    onUpdate: (id: string, config: Partial<ShipModulation>) => void;
    onRemove: (id: string) => void;
}> = ({ mod, onUpdate, onRemove }) => {
    const sources: ModulationSource[] = [
        'speed', 'acceleration', 'altitude', 'descent', 
        'turning', 'turningSigned', 'heading', 'pitch', 'proximity', 'time'
    ];
    const targets: {value: ShipModulationTarget, label: string}[] = [
        { value: 'complexity', label: 'Complexity' },
        { value: 'fold1', label: 'Fold A (Body)' },
        { value: 'fold1AsymX', label: 'Fold A Asym X (L/R Bias)' },
        { value: 'fold2', label: 'Fold B (Wings)' },
        { value: 'fold2AsymX', label: 'Fold B Asym X (L/R Bias)' },
        { value: 'fold3', label: 'Twist' },
        { value: 'scale', label: 'Scale' },
        { value: 'scaleAsymX', label: 'Scale Asym X (L/R Bias)' },
        { value: 'stretch', label: 'Stretch' },
        { value: 'taper', label: 'Taper' },
        { value: 'twist', label: 'Fractal Twist (Spiral)' },
        { value: 'twistAsymX', label: 'Twist Asym X (L/R Bias)' },
        { value: 'asymmetryX', label: 'Space Asymmetry X (L/R)' },
        { value: 'asymmetryY', label: 'Space Asymmetry Y (T/B)' },
        { value: 'asymmetryZ', label: 'Space Asymmetry Z (F/B)' },
    ];

    return (
        <div className={`p-3 rounded-lg border ${mod.enabled ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-900/30 border-gray-800 opacity-60'}`}>
            <div className="flex items-center gap-2 mb-3">
                <input
                    type="checkbox"
                    checked={mod.enabled}
                    onChange={(e) => onUpdate(mod.id, { enabled: e.target.checked })}
                     className="w-4 h-4 bg-gray-700 border-gray-500 rounded text-cyan-500 focus:ring-offset-gray-800"
                />
                <select
                    value={mod.source}
                    onChange={(e) => onUpdate(mod.id, { source: e.target.value as ModulationSource })}
                    className="bg-gray-900 text-xs text-white p-1 rounded border border-gray-700 outline-none"
                >
                    {sources.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
                <span className="text-gray-500 text-xs">→</span>
                <select
                    value={mod.target}
                    onChange={(e) => onUpdate(mod.id, { target: e.target.value as ShipModulationTarget })}
                    className="bg-gray-900 text-xs text-white p-1 rounded border border-gray-700 outline-none flex-grow"
                >
                    {targets.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button onClick={() => onRemove(mod.id)} className="text-gray-500 hover:text-red-400">
                    <XCircleIcon className="w-4 h-4" />
                </button>
            </div>
            {mod.enabled && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-12">Amount</span>
                    <input
                        type="range"
                        min={-1.0} max={1.0} step={0.01}
                        value={mod.amount}
                        onChange={(e) => onUpdate(mod.id, { amount: parseFloat(e.target.value) })}
                        className="flex-grow h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-xs font-mono text-cyan-400 w-10 text-right">
                        {(mod.amount * 100).toFixed(0)}%
                    </span>
                </div>
            )}
        </div>
    );
};

const SoundPanel: React.FC = () => {
    const { soundConfig, handleSoundConfigChange, addSoundModulation, updateSoundModulation, removeSoundModulation } = useAppContext();
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingPatch, setIsGeneratingPatch] = useState(false);
    const [patchError, setPatchError] = useState<string | null>(null);

    const handleAiPatch = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingPatch(true);
        setPatchError(null);
        try {
            const newMods = await generateAudioModulation(aiPrompt);
            newMods.forEach(mod => addSoundModulation(mod));
            setAiPrompt('');
        } catch (e: any) {
            setPatchError(e.message || 'Failed to generate patch');
        } finally {
            setIsGeneratingPatch(false);
        }
    };

    return (
        <div className="space-y-8">
            <ToggleSwitch
                label="Enable Soundtrack"
                description="Toggles the Vangelis-style audio engine."
                checked={soundConfig.enabled}
                onChange={(checked) => handleSoundConfigChange('enabled', checked)}
            />

            <div className={`space-y-8 transition-opacity duration-500 ${soundConfig.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                
                 {/* --- PATCH BAY (Modulations) --- */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Patch Bay</h4>
                         <button
                            onClick={() => addSoundModulation({ id: uuidv4(), enabled: true, source: 'speed', target: 'drone.filter', amount: 0.25 })}
                            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white transition-colors"
                         >
                            + Add Patch
                         </button>
                    </div>

                    {/* AI Patcher */}
                    {ENABLE_AI_FEATURES && (
                        <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g., faster drums when I dive down"
                                    className="flex-grow p-2 bg-gray-900/80 border border-purple-500/50 rounded-md text-sm text-gray-200 focus:ring-1 focus:ring-purple-500 outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiPatch()}
                                />
                                <button
                                    onClick={handleAiPatch}
                                    disabled={isGeneratingPatch || !aiPrompt}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-3 rounded-md disabled:opacity-50 flex items-center justify-center"
                                >
                                    <SparklesIcon className={`w-5 h-5 ${isGeneratingPatch ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {patchError && <p className="text-xs text-red-400">{patchError}</p>}
                        </div>
                    )}

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {soundConfig.modulations && soundConfig.modulations.length > 0 ? (
                            soundConfig.modulations.map(mod => (
                                <ModulationRow
                                    key={mod.id}
                                    mod={mod}
                                    onUpdate={updateSoundModulation}
                                    onRemove={removeSoundModulation}
                                />
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 text-center py-4">No active patches.</p>
                        )}
                    </div>
                </div>

                <ControlSlider
                    label="Master Volume"
                    value={soundConfig.masterVolume}
                    min={0} max={1} step={0.01}
                    onChange={(v) => handleSoundConfigChange('masterVolume', v)}
                />

                {/* --- MELODY --- */}
                <div className="pt-4 border-t border-gray-700 space-y-4">
                    <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Melody (CS-80)</h4>
                     <ToggleSwitch
                        label="Active"
                        checked={soundConfig.melody.enabled}
                        onChange={(c) => handleSoundConfigChange('melody.enabled', c)}
                        small
                    />
                    <div className={soundConfig.melody.enabled ? '' : 'opacity-50 pointer-events-none'}>
                         <ControlSlider
                            label="Volume"
                            value={soundConfig.melody.gain}
                            min={0} max={1} step={0.01}
                            onChange={(v) => handleSoundConfigChange('melody.gain', v)}
                            mini
                        />
                        <ControlSlider
                            label="Density"
                            description="How frequently notes play."
                            value={soundConfig.melody.density}
                            min={0.1} max={1.0} step={0.1}
                            onChange={(v) => handleSoundConfigChange('melody.density', v)}
                            mini
                        />
                         <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Musical Scale</label>
                            <select
                                value={soundConfig.melody.scale}
                                onChange={e => handleSoundConfigChange('melody.scale', e.target.value)}
                                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-xs text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            >
                                <option value="dorian">Dorian (Blade Runner)</option>
                                <option value="phrygian">Phrygian (Darker)</option>
                                <option value="lydian">Lydian (Dreamy)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- ARPEGGIATOR --- */}
                <div className="pt-4 border-t border-gray-700 space-y-4">
                    <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Arp (Pulse)</h4>
                     <ToggleSwitch
                        label="Active"
                        checked={soundConfig.arp.enabled}
                        onChange={(c) => handleSoundConfigChange('arp.enabled', c)}
                        small
                    />
                    <div className={`space-y-3 ${soundConfig.arp.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                         <ControlSlider
                            label="Volume"
                            value={soundConfig.arp.gain}
                            min={0} max={1} step={0.01}
                            onChange={(v) => handleSoundConfigChange('arp.gain', v)}
                            mini
                        />
                        <ControlSlider
                            label="Speed"
                            value={soundConfig.arp.speed}
                            min={0.5} max={2.0} step={0.1}
                            onChange={(v) => handleSoundConfigChange('arp.speed', v)}
                            mini
                        />
                         <ControlSlider
                            label="Range (Octaves)"
                            value={soundConfig.arp.octaves}
                            min={1} max={3} step={1}
                            onChange={(v) => handleSoundConfigChange('arp.octaves', v)}
                            mini
                        />
                        <ControlSlider
                            label="Brightness (Filter)"
                            value={soundConfig.arp.filter}
                            min={100} max={4000} step={50}
                            onChange={(v) => handleSoundConfigChange('arp.filter', v)}
                            mini
                        />
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Direction</label>
                            <select
                                value={soundConfig.arp.direction ?? 'up'}
                                onChange={e => handleSoundConfigChange('arp.direction', e.target.value)}
                                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-xs text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            >
                                <option value="up">Up (Ascending)</option>
                                <option value="down">Down (Descending)</option>
                                <option value="updown">Up & Down (Ping-Pong)</option>
                                <option value="random">Random</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- DRONE --- */}
                <div className="pt-4 border-t border-gray-700 space-y-4">
                    <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Drone (Bass)</h4>
                     <ToggleSwitch
                        label="Active"
                        checked={soundConfig.drone.enabled}
                        onChange={(c) => handleSoundConfigChange('drone.enabled', c)}
                        small
                    />
                    <div className={soundConfig.drone.enabled ? '' : 'opacity-50 pointer-events-none'}>
                         <ControlSlider
                            label="Volume"
                            value={soundConfig.drone.gain}
                            min={0} max={1} step={0.01}
                            onChange={(v) => handleSoundConfigChange('drone.gain', v)}
                            mini
                        />
                        <ControlSlider
                            label="Brightness (Filter)"
                            description="Opens the lowpass filter."
                            value={soundConfig.drone.filter}
                            min={50} max={1000} step={10}
                            onChange={(v) => handleSoundConfigChange('drone.filter', v)}
                            mini
                        />
                         <ControlSlider
                            label="Pitch Tune"
                            description="Semitone offset from base note."
                            value={soundConfig.drone.pitch}
                            min={-12} max={12} step={0.5}
                            onChange={(v) => handleSoundConfigChange('drone.pitch', v)}
                            mini
                        />
                    </div>
                </div>

                {/* --- RHYTHM --- */}
                <div className="pt-4 border-t border-gray-700 space-y-4">
                    <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Rhythm (Tom)</h4>
                     <ToggleSwitch
                        label="Active"
                        checked={soundConfig.rhythm.enabled}
                        onChange={(c) => handleSoundConfigChange('rhythm.enabled', c)}
                        small
                    />
                    <div className={soundConfig.rhythm.enabled ? '' : 'opacity-50 pointer-events-none'}>
                         <ControlSlider
                            label="Volume"
                            value={soundConfig.rhythm.gain}
                            min={0} max={1} step={0.01}
                            onChange={(v) => handleSoundConfigChange('rhythm.gain', v)}
                            mini
                        />
                        <ControlSlider
                            label="Tempo (BPM)"
                            value={soundConfig.rhythm.bpm}
                            min={30} max={200} step={1}
                            onChange={(v) => handleSoundConfigChange('rhythm.bpm', v)}
                            mini
                        />
                        <ControlSlider
                            label="Tone (Filter)"
                            value={soundConfig.rhythm.filter}
                            min={50} max={500} step={10}
                            onChange={(v) => handleSoundConfigChange('rhythm.filter', v)}
                            mini
                        />
                    </div>
                </div>

                 {/* --- ATMOSPHERE --- */}
                 <div className="pt-4 border-t border-gray-700 space-y-4">
                    <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Atmosphere (Wind)</h4>
                     <ToggleSwitch
                        label="Active"
                        checked={soundConfig.atmosphere.enabled}
                        onChange={(c) => handleSoundConfigChange('atmosphere.enabled', c)}
                        small
                    />
                    <div className={soundConfig.atmosphere.enabled ? '' : 'opacity-50 pointer-events-none'}>
                         <ControlSlider
                            label="Volume"
                            value={soundConfig.atmosphere.gain}
                            min={0} max={1} step={0.01}
                            onChange={(v) => handleSoundConfigChange('atmosphere.gain', v)}
                            mini
                        />
                    </div>
                </div>

                {/* --- REVERB --- */}
                 <div className="pt-4 border-t border-gray-700 space-y-4">
                    <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Space (Reverb)</h4>
                     <ToggleSwitch
                        label="Active"
                        checked={soundConfig.reverb.enabled}
                        onChange={(c) => handleSoundConfigChange('reverb.enabled', c)}
                        small
                    />
                    <div className={soundConfig.reverb.enabled ? '' : 'opacity-50 pointer-events-none'}>
                         <ControlSlider
                            label="Mix"
                            value={soundConfig.reverb.mix}
                            min={0} max={1} step={0.01}
                            onChange={(v) => handleSoundConfigChange('reverb.mix', v)}
                            mini
                        />
                         <ControlSlider
                            label="Decay Time (s)"
                            description="Requires session reload to fully take effect."
                            value={soundConfig.reverb.decay}
                            min={2} max={10} step={0.5}
                            onChange={(v) => handleSoundConfigChange('reverb.decay', v)}
                            mini
                        />
                        <ControlSlider
                            label="Damping Tone"
                            value={soundConfig.reverb.tone}
                            min={500} max={5000} step={100}
                            onChange={(v) => handleSoundConfigChange('reverb.tone', v)}
                            mini
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const TerraformPanel: React.FC = () => {
    const { sliders, terraformConfig, handleTerraformConfigChange } = useAppContext();
    const targets = terraformConfig?.targets ?? [];

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                <TerraformIcon className="w-8 h-8 text-cyan-400 mt-1 flex-shrink-0" />
                <p className="text-xs text-gray-400">
                    Enable sliders to be affected by the 'Terraform' button. 'Magnitude' controls the strength of the change, and 'Probability' controls how often it's applied.
                </p>
            </div>
            {sliders.map(slider => {
                const target = targets.find(t => t.variableName === slider.variableName);
                const isEnabled = !!target;

                return (
                    <div key={slider.variableName} className={`p-3 rounded-lg transition-colors ${isEnabled ? 'bg-gray-800/70' : 'bg-gray-800/30'}`}>
                        <div className="flex justify-between items-center">
                            <label className="flex items-center gap-3 text-sm font-medium text-gray-200 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isEnabled} 
                                    onChange={(e) => handleTerraformConfigChange(slider.variableName, 'enabled', e.target.checked)} 
                                    className="w-5 h-5 bg-gray-700 border-gray-500 rounded text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
                                />
                                <span>{slider.name}</span>
                            </label>
                        </div>

                        {isEnabled && target && (
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Magnitude</label>
                                    <NumberInputWithSteppers
                                        value={target.magnitude}
                                        onChange={(newValue) => handleTerraformConfigChange(slider.variableName, 'magnitude', newValue)}
                                        step={0.01}
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Probability</label>
                                    <NumberInputWithSteppers
                                        value={target.probability ?? 1.0}
                                        onChange={(newValue) => handleTerraformConfigChange(slider.variableName, 'probability', newValue)}
                                        step={0.1}
                                        min={0}
                                        max={1}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const ControlsConfigPanel: React.FC = () => {
    const { controlConfig, handleControlConfigChange } = useAppContext();

    const inversionControls: { key: keyof ControlConfig; label: string; description: string }[] = [
        { key: 'invertForward', label: 'Forward / Backward', description: "Invert W/S keys for camera movement." },
        { key: 'invertStrafe', label: 'Strafe Left / Right', description: "Invert A/D keys for camera movement." },
        { key: 'invertAscend', label: 'Ascend / Descend', description: "Invert Space/Shift keys for camera movement." },
        { key: 'invertPitch', label: 'Look Up / Down', description: "Invert Up/Down arrow keys for camera look." },
        { key: 'invertYaw', label: 'Look Left / Right', description: "Invert Left/Right arrow keys for camera look." },
    ];
    
    const velocityControls: { key: keyof ControlConfig; label: string; description: string }[] = [
        { key: 'forwardVelocity', label: 'Forward Speed', description: 'Controls speed of W/S keys.' },
        { key: 'strafeVelocity', label: 'Strafe Speed', description: 'Controls speed of A/D keys.' },
        { key: 'ascendVelocity', label: 'Ascend Speed', description: 'Controls speed of Space/Shift keys.' },
        { key: 'pitchVelocity', label: 'Look Up/Down Speed', description: 'Controls speed of Up/Down arrow keys.' },
        { key: 'yawVelocity', label: 'Look L/R Speed', description: 'Controls speed of Left/Right arrow keys.' },
    ];

    const gestureMode = controlConfig.gestureMode || 'touch';

    return (
        <div className="space-y-4">
            {/* Gestural Control Deck */}
            <div className="p-4 bg-slate-950/75 border border-cyan-500/20 rounded-md space-y-3 shadow-[0_0_15px_rgba(0,242,255,0.03)]">
                <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                    <h3 className="text-xs font-bold text-gray-200 uppercase font-orbitron tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                        Gesture Flight deck
                    </h3>
                </div>

                <ToggleSwitch
                    label="Enable Gesture Pilots"
                    description="Activate hands-free / touchscreen gesture flight navigation."
                    checked={!!controlConfig.enableGestureControls}
                    onChange={(checked) => handleControlConfigChange('enableGestureControls', checked)}
                />

                {controlConfig.enableGestureControls && (
                  <div className="space-y-3 pt-2">
                      {/* Gestural Steering Mode Selection */}
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-orbitron text-cyan-500 font-bold uppercase tracking-wider block">Targeting Matrix Mode</label>
                          <div className="grid grid-cols-3 gap-1 bg-slate-900 border border-cyan-950 p-0.5 rounded">
                              {(['touch', 'tilt', 'webcam'] as const).map(m => (
                                  <button
                                      key={m}
                                      onClick={() => handleControlConfigChange('gestureMode', m)}
                                      className={`py-1.5 rounded text-[10px] uppercase font-bold tracking-widest transition-all ${gestureMode === m ? 'bg-cyan-500/25 text-white border border-[#00f2ff]/30 font-extrabold shadow-[0_0_8px_rgba(0,242,255,0.15)]' : 'text-slate-500 border border-transparent hover:text-slate-300'}`}
                                  >
                                      {m}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Gestural Motion Description Panel */}
                      <div className="bg-[#000d14]/70 border border-cyan-500/10 p-2.5 rounded text-[10px] font-mono text-cyan-200/80 leading-relaxed uppercase select-none">
                          {gestureMode === 'touch' && (
                            <span>Dual visual joystick touchpads will draw directly on screen. Direct pointer/finger drags mapped to real-time thrust vectors and attitude steering matrix.</span>
                          )}
                          {gestureMode === 'tilt' && (
                            <span>Hardware dynamic Gyroscope calibration. Comfortably tilt your phone up/down and left/right to steer the spaceship.</span>
                          )}
                          {gestureMode === 'webcam' && (
                            <span>Client-side AI motion capture camera matrix. Wave your hands/move in cockpit sectors (L, R, U, D) to steer. Zero cloud latency.</span>
                          )}
                      </div>

                      <ControlSlider
                          label="Gesture Sensitivity"
                          description="Fine-tune translation and steering rotational speeds from gestural input."
                          value={controlConfig.gestureSensitivity ?? 1.0}
                          min={0.1}
                          max={3.0}
                          step={0.1}
                          onChange={(v) => handleControlConfigChange('gestureSensitivity', v)}
                      />
                  </div>
                )}
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-400 px-1 mb-2">Inversions</h3>
                <div className="space-y-2">
                    {inversionControls.map(control => (
                        <ToggleSwitch
                            key={control.key}
                            label={control.label}
                            description={control.description}
                            checked={!!controlConfig[control.key]}
                            onChange={(checked) => handleControlConfigChange(control.key, checked)}
                        />
                    ))}
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-400 px-1 mb-2">Velocities</h3>
                <div className="space-y-2">
                    {velocityControls.map(control => (
                        <ControlSlider
                            key={control.key}
                            label={control.label}
                            description={control.description}
                            value={(controlConfig[control.key] as number) ?? 0.3}
                            onChange={(value) => handleControlConfigChange(control.key, value)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const ShipConfigPanel: React.FC = () => {
    const { shipConfig, handleShipConfigChange, addShipModulation, updateShipModulation, removeShipModulation } = useAppContext();

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400">
                        Mutate the fractal DNA of your ship. Changes update in real-time.
                    </p>
                </div>
                <ControlSlider
                    label="Complexity"
                    description="Number of folding iterations. Higher is more detailed but slower."
                    value={shipConfig.complexity}
                    min={1} max={12} step={1}
                    onChange={(v) => handleShipConfigChange('complexity', v)}
                />
                 <ControlSlider
                    label="Scale Factor"
                    description="Determines the overall size and spacing of fractal elements."
                    value={shipConfig.scale}
                    min={1.0} max={3.0} step={0.01}
                    onChange={(v) => handleShipConfigChange('scale', v)}
                />
                <ControlSlider
                    label="Fold Mutation A"
                    description="Alters the primary folding angle."
                    value={shipConfig.fold1}
                    min={0.0} max={2.0} step={0.01}
                    onChange={(v) => handleShipConfigChange('fold1', v)}
                />
                <ControlSlider
                    label="Fold Mutation B"
                    description="Alters the secondary folding angle."
                    value={shipConfig.fold2}
                    min={0.0} max={2.0} step={0.01}
                    onChange={(v) => handleShipConfigChange('fold2', v)}
                />
                 <ControlSlider
                    label="Twist Mutation"
                    description="Adds a twist to the fractal structure."
                    value={shipConfig.fold3}
                    min={-1.0} max={1.0} step={0.01}
                    onChange={(v) => handleShipConfigChange('fold3', v)}
                />
                 <ControlSlider
                    label="Longitudinal Stretch"
                    description="Stretches the ship along its forward axis."
                    value={shipConfig.stretch}
                    min={0.5} max={3.0} step={0.01}
                    onChange={(v) => handleShipConfigChange('stretch', v)}
                />
                <ControlSlider
                    label="Taper"
                    description="Cones the ship's shape from front to back. Positive values narrow the front."
                    value={shipConfig.taper}
                    min={-1.0} max={1.0} step={0.01}
                    onChange={(v) => handleShipConfigChange('taper', v)}
                />
                <ControlSlider
                    label="Fractal Twist"
                    description="Spirals the ship's body along its length."
                    value={shipConfig.twist}
                    min={-2.0} max={2.0} step={0.01}
                    onChange={(v) => handleShipConfigChange('twist', v)}
                />
                
                <div className="pt-2 border-t border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Asymmetry Controls</p>
                    <ControlSlider
                        label="Asymmetry X (L/R)"
                        description="Distorts the ship asymmetrically Left vs Right. Use with signed turning modulation."
                        value={shipConfig.asymmetryX}
                        min={-1.0} max={1.0} step={0.01}
                        onChange={(v) => handleShipConfigChange('asymmetryX', v)}
                    />
                    <ControlSlider
                        label="Asymmetry Z (F/B)"
                        description="Distorts the ship asymmetrically Front vs Back."
                        value={shipConfig.asymmetryZ}
                        min={-1.0} max={1.0} step={0.01}
                        onChange={(v) => handleShipConfigChange('asymmetryZ', v)}
                    />
                </div>

                <div className="pt-2 border-t border-gray-700/50">
                    <ControlSlider
                        label="General Scale"
                        description="Controls the overall size of the entire ship."
                        value={shipConfig.generalScale ?? 1.0}
                        min={0.1} max={3.0} step={0.01}
                        onChange={(v) => handleShipConfigChange('generalScale', v)}
                    />
                    <ControlSlider
                        label="Chase Camera Distance"
                        description="How far the camera is behind the ship."
                        value={shipConfig.chaseDistance ?? 6.5}
                        min={2.0} max={20.0} step={0.01}
                        onChange={(v) => handleShipConfigChange('chaseDistance', v)}
                    />
                    <ControlSlider
                        label="Material Opacity"
                        description="Controls the translucency of the ship's material. Lower values make it see-through."
                        value={shipConfig.translucency ?? 1.0}
                        min={0.0} max={1.0} step={0.01}
                        onChange={(v) => handleShipConfigChange('translucency', v)}
                    />
                </div>
            </div>

            {/* --- SHIP SHAPE-SHIFTING PATCH BAY --- */}
            <div className="pt-4 border-t border-gray-700 space-y-4">
                 <div className="flex items-center justify-between">
                     <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Shape-Shifting</h4>
                     <button
                        onClick={() => addShipModulation({ id: uuidv4(), enabled: true, source: 'turningSigned', target: 'asymmetryX', amount: 0.5 })}
                        className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white transition-colors"
                     >
                        + Add Patch
                     </button>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400">
                        Link flight dynamics (like speed or turning) to ship parameters to make it procedurally animate.
                    </p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {shipConfig.modulations && shipConfig.modulations.length > 0 ? (
                        shipConfig.modulations.map(mod => (
                            <ShipModulationRow
                                key={mod.id}
                                mod={mod}
                                onUpdate={updateShipModulation}
                                onRemove={removeShipModulation}
                            />
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 text-center py-4">No active shape-shifting patches.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const SettingsPanel: React.FC = () => {
    const {
        sessionSource, handleSourceChange,
        canvasSize, setCanvasSize,
        isHdEnabled, setIsHdEnabled,
        isFpsEnabled, setIsFpsEnabled,
        isHudEnabled, setIsHudEnabled,
        cameraControlsEnabled,
        EDITMODE,
        handleSaveSessionToFile,
        fileInputRef,
        getSessionStateJson
    } = useAppContext();

    const [isJsonCopied, setIsJsonCopied] = useState(false);

    const handleCopyJson = () => {
        navigator.clipboard.writeText(getSessionStateJson()).then(() => {
            setIsJsonCopied(true);
            setTimeout(() => setIsJsonCopied(false), 2500);
        }).catch(err => {
            console.error('Failed to copy session JSON:', err);
        });
    };

    return (
        <div className="space-y-6">
             {/* Display Settings Group */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 px-1">Display</h3>
                <div>
                    <label htmlFor="canvas-size" className="block text-xs text-gray-400 mb-1 ml-1">Canvas Size</label>
                    <select
                        id="canvas-size"
                        value={canvasSize}
                        onChange={(e) => setCanvasSize(e.target.value)}
                        className="w-full p-2 bg-gray-900/80 border border-gray-600 rounded-md text-sm text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    >
                        {CANVAS_SIZES.map(({ label, value }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
                <ToggleSwitch
                     label="High Performance Mode"
                     description="Caps resolution for better performance on high-DPI displays."
                     checked={isHdEnabled}
                     onChange={setIsHdEnabled}
                />
                <ToggleSwitch
                     label="Show FPS"
                     description="Display a frames-per-second counter."
                     checked={isFpsEnabled}
                     onChange={setIsFpsEnabled}
                />
                {cameraControlsEnabled && (
                    <ToggleSwitch
                        label="Show HUD in cockpit"
                        description="Display horizon, heading, and altitude information."
                        checked={isHudEnabled}
                        onChange={setIsHudEnabled}
                    />
                )}
            </div>

             {/* Session Data Group */}
             {EDITMODE && (
                <div className="space-y-4 border-t border-gray-700 pt-4">
                     <h3 className="text-sm font-semibold text-gray-400 px-1">Session Data</h3>
                     <div className="grid grid-cols-3 gap-2">
                        <button onClick={handleSaveSessionToFile} className="flex items-center justify-center px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-semibold text-sm rounded-md transition-colors" title="Download Session JSON">
                            Export
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-semibold text-sm rounded-md transition-colors" title="Upload Session JSON">
                            Import
                        </button>
                         <button 
                            onClick={handleCopyJson}
                            className="flex items-center justify-center px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-semibold text-sm rounded-md transition-colors relative"
                            title="Copy Session JSON to Clipboard"
                        >
                            {isJsonCopied ? 'Copied!' : 'Copy JSON'}
                        </button>
                     </div>
                </div>
            )}

            {/* Meta Group */}
            <div className="space-y-4 border-t border-gray-700 pt-4">
                 <h3 className="text-sm font-semibold text-gray-400 px-1">Metadata</h3>
                <div>
                    <label htmlFor="source-url" className="block text-xs text-gray-400 mb-1 ml-1">
                        World URL evolved from:
                    </label>
                    <input
                        id="source-url"
                        type="text"
                        value={sessionSource ?? ''}
                        onChange={(e) => handleSourceChange(e.target.value)}
                        placeholder="e.g., https://x.com/..."
                        className="w-full p-2 bg-gray-900/80 border border-gray-600 rounded-md text-sm text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

const CollisionPanel: React.FC = () => {
    const { collisionThresholdRed, setCollisionThresholdRed, collisionThresholdYellow, setCollisionThresholdYellow } = useAppContext();

    return (
        <div className="space-y-4">
             <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400">
                    Adjust the sensitivity of the collision detection. 'Red Alert' stops movement, while 'Yellow Warning' just shows an indicator.
                </p>
            </div>
            <ControlSlider
                label="Red Alert Distance"
                description="Distance to surface that triggers a full collision and stops movement."
                value={collisionThresholdRed}
                min={0.001}
                max={0.1}
                step={0.001}
                onChange={setCollisionThresholdRed}
            />
            <ControlSlider
                label="Yellow Warning Distance"
                description="Distance to surface that triggers the warning indicator."
                value={collisionThresholdYellow}
                min={0.001}
                max={0.2}
                step={0.001}
                onChange={setCollisionThresholdYellow}
            />
        </div>
    );
};


const LandmarksPanel: React.FC = () => {
    const { 
        landmarks, 
        activeLandmarkId, 
        setActiveLandmarkId, 
        isWarping, 
        handleTriggerWarp, 
        handleSaveLandmark, 
        handleDeleteLandmark,
        cameraRef
    } = useAppContext();

    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const activeLandmarks = landmarks; 
    const currentCoords = cameraRef?.current ? cameraRef.current.position : [0, 0, 0];

    const onAdd = (e: React.FormEvent) => {
        e.preventDefault();
        handleSaveLandmark(newName.trim(), newDesc.trim());
        setNewName('');
        setNewDesc('');
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3 p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg">
                <SparklesIcon className="w-8 h-8 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-cyan-400 space-y-1">
                    <p className="font-semibold uppercase tracking-wider font-orbitron">Navigation Telemeters</p>
                    <p className="text-slate-400 leading-relaxed font-mono">
                        Register current coordinates as a permanent waypoint or warp directly to predefined nodes.
                    </p>
                </div>
            </div>

            {/* Save Current Position Card */}
            {!isSaving ? (
                <button 
                    onClick={() => setIsSaving(true)}
                    className="w-full py-3 px-4 bg-cyan-950/40 border border-cyan-800/40 rounded-lg font-orbitron text-[10px] text-cyan-400 font-bold uppercase tracking-widest hover:bg-[#00f2ff]/10 hover:text-white hover:border-[#00f2ff]/60 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,242,255,0.05)]"
                >
                    + Register Current Waypoint
                </button>
            ) : (
                <form onSubmit={onAdd} className="bg-slate-950/80 border border-cyan-900/40 p-4 rounded-lg space-y-3 shadow-inner">
                    <div className="flex justify-between items-center pb-2 border-b border-cyan-950">
                        <span className="text-[10px] font-bold text-[#00f2ff] uppercase font-orbitron tracking-widest">Waypoint Registration</span>
                        <button type="button" onClick={() => setIsSaving(false)} className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-mono">Cancel</button>
                    </div>
                    
                    <div className="text-[10px] font-mono text-cyan-600 space-y-1 py-1">
                        <div>LOC X: <span className="text-cyan-400">{currentCoords[0].toFixed(3)}</span></div>
                        <div>LOC Y: <span className="text-cyan-400">{currentCoords[1].toFixed(3)}</span></div>
                        <div>LOC Z: <span className="text-cyan-400">{currentCoords[2].toFixed(3)}</span></div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono text-cyan-500 uppercase">Telemeter Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Spiral Abyss"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/90 border border-cyan-900/40 rounded text-xs text-white placeholder-slate-600 focus:border-[#00f2ff]/75 outline-none font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono text-cyan-500 uppercase">Telemeter Core Log</label>
                        <input
                            type="text"
                            placeholder="e.g. Deep recursive fissure..."
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/90 border border-cyan-900/40 rounded text-xs text-white placeholder-slate-600 focus:border-[#00f2ff]/75 outline-none font-mono"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-950 to-cyan-950 border border-cyan-500/50 hover:border-cyan-400 rounded font-orbitron font-bold text-[10px] text-[#00f2ff] uppercase tracking-widest cursor-pointer shadow-md hover:shadow-cyan-950"
                    >
                        Initialize Coordinate Lock
                    </button>
                </form>
            )}

            {/* Landmarks List */}
            <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-cyan-500/70 uppercase tracking-widest font-orbitron flex items-center justify-between">
                    <span>Registered Waypoints</span>
                    <span className="font-mono text-[9px]">{activeLandmarks.length} Total</span>
                </h4>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {activeLandmarks.map((landmark) => {
                        const isActive = activeLandmarkId === landmark.id;
                        const dist = cameraRef?.current ? Math.sqrt(
                            Math.pow(landmark.position[0] - cameraRef.current.position[0], 2) +
                            Math.pow(landmark.position[1] - cameraRef.current.position[1], 2) +
                            Math.pow(landmark.position[2] - cameraRef.current.position[2], 2)
                        ) : 0;

                        return (
                            <div 
                                key={landmark.id} 
                                className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group
                                            ${isActive 
                                              ? 'bg-cyan-950/25 border-cyan-500/50 shadow-[0_0_15px_rgba(0,242,255,0.08)]' 
                                              : 'bg-slate-950/60 border-cyan-950 hover:border-cyan-700/45 hover:bg-slate-900/40'}`}
                            >
                                {isActive && <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#00f2ff]" />}

                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h5 className="text-[12px] font-orbitron font-semibold text-white tracking-wide uppercase flex items-center gap-1.5">
                                            {landmark.name}
                                            {landmark.isCustom && (
                                                <span className="text-[8px] px-1.5 py-0.2 bg-purple-950/80 border border-purple-500/40 text-purple-300 rounded uppercase font-mono tracking-normal scale-90">Custom</span>
                                            )}
                                        </h5>
                                        <p className="text-[11px] text-slate-400 font-mono mt-1 leading-relaxed">{landmark.description}</p>
                                    </div>

                                    {!landmark.isCustom ? (
                                        <span className="text-[8px] border border-cyan-900 px-1.5 py-0.5 rounded font-mono text-cyan-600 bg-slate-950 select-none">PRESET</span>
                                    ) : (
                                        <button 
                                            onClick={() => handleDeleteLandmark(landmark.id)}
                                            className="text-slate-600 hover:text-rose-400 p-1.5 rounded transition-colors cursor-pointer"
                                            title="Delete waypoint"
                                        >
                                            <XCircleIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-cyan-950/55 text-[10px] font-mono">
                                    <div className="text-cyan-700 font-mono text-[9px] flex gap-2">
                                        <span>DIST: <strong className="text-cyan-400">{dist.toFixed(1)}m</strong></span>
                                        <span className="text-slate-600">|</span>
                                        <span>XYZ: <strong className="text-cyan-500">{landmark.position.map(n => Math.round(n)).join(',')}</strong></span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActiveLandmarkId(isActive ? null : landmark.id)}
                                            className={`px-2.5 py-1 rounded font-orbitron uppercase text-[9px] font-bold tracking-widest transition-all cursor-pointer
                                                        ${isActive 
                                                          ? 'bg-cyan-900/35 text-[#00f2ff] border border-[#00f2ff]/40 hover:bg-[#00f2ff]/20' 
                                                          : 'bg-transparent border border-cyan-900/60 text-cyan-600 hover:text-cyan-400 hover:border-cyan-700/50'}`}
                                        >
                                            {isActive ? 'TRACKING ON' : 'TRACK WAYPOINT'}
                                        </button>

                                        <button
                                            onClick={() => handleTriggerWarp(landmark)}
                                            disabled={isWarping}
                                            className="px-3.5 py-1 bg-[#00f2ff] hover:bg-cyan-300 text-slate-950 font-orbitron font-bold uppercase rounded text-[9px] tracking-widest shadow-[0_0_10px_rgba(0,242,255,0.25)] hover:shadow-[0_0_15px_rgba(0,242,255,0.45)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                                        >
                                            {isWarping ? 'WARPING...' : 'HYPERJUMP'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


export const ControlsPanel: React.FC = () => {
  const { 
    isControlsOpen, 
    setIsControlsOpen,
    cameraControlsEnabled,
    EDITMODE,
    sessionSource,
    fileInputRef,
    handleSaveSessionToFile,
    setIsInteracting,
    getSessionStateJson,
    landmarks,
    activeLandmarkId,
    setActiveLandmarkId,
    isWarping,
    warpTargetName,
    warpProgress,
    handleTriggerWarp,
    handleSaveLandmark,
    handleDeleteLandmark
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<'sliders' | 'terraform' | 'controls' | 'settings' | 'sound' | 'collision' | 'ship' | 'landmarks'>('sliders');
  const [sourceAuthor, setSourceAuthor] = useState<string | null>(null);

  // State for dragging functionality
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });

  // State for resizing functionality
  const [size, setSize] = useState({ width: 450, height: 600 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with the main button (e.g., left-click)
    if (e.button !== 0) return;
    
    // Prevent default behaviors like text selection
    e.preventDefault();
    const target = e.target as HTMLElement;
    
    // Capture pointer events to ensure we get move/up events even if the cursor leaves the element
    target.setPointerCapture(e.pointerId);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panelX: position.x,
      panelY: position.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.x;
      const deltaY = moveEvent.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.panelX + deltaX,
        y: dragStartRef.current.panelY + deltaY,
      });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      // Ensure we're handling the same pointer that started the drag
      if (upEvent.pointerId !== e.pointerId) return;
      
      target.releasePointerCapture(e.pointerId);
      
      // Clean up the global listeners
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
    
    // Attach the listeners to the window to track movement anywhere on the screen
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height
    };
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - resizeStartRef.current.x;
        const deltaY = moveEvent.clientY - resizeStartRef.current.y;
        
        setSize({
            width: Math.max(320, resizeStartRef.current.width + deltaX),
            height: Math.max(400, resizeStartRef.current.height + deltaY)
        });
    };
    
    const handlePointerUp = (upEvent: PointerEvent) => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  useEffect(() => {
    // When EDITMODE is off, we restrict access to complex tabs, but allow Ship and Sound.
    // We force switch to Sliders ONLY if the current tab is one of the restricted ones.
    const restrictedTabs = ['terraform', 'collision', 'controls', 'settings'];
    if (!EDITMODE && restrictedTabs.includes(activeTab)) {
      setActiveTab('sliders');
    }
  }, [EDITMODE, activeTab]);

  useEffect(() => {
    if (sessionSource) {
        try {
            const url = new URL(sessionSource);
            // Handle both x.com and twitter.com
            const pathParts = url.pathname.split('/');
            const author = pathParts[1] && pathParts[1] !== 'status' ? pathParts[1] : null;
            if (author) {
                setSourceAuthor(author);
            } else {
                 setSourceAuthor(null);
            }
        } catch (e) {
            setSourceAuthor(null);
            console.error("Invalid source URL:", sessionSource);
        }
    } else {
        setSourceAuthor(null);
    }
}, [sessionSource]);

  const handlePointerDownCapture = () => setIsInteracting(true);
  const handlePointerUpCapture = () => setIsInteracting(false);

  if (!isControlsOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={() => setIsControlsOpen(false)}
        aria-hidden="true"
      ></div>
      
      {/* Modal panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#061014]/98 border-t-2 border-t-cyan-500/50 shadow-[0_0_30px_rgba(0,242,255,0.2)] rounded-t-xl
                   sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:rounded-xl sm:border sm:border-cyan-500/30
                   flex flex-col max-h-[70vh] font-sans overflow-hidden"
        style={{
            // On small screens, CSS classes handle the fixed bottom position.
            // On larger screens, this style is used to enable dragging and resizing.
            ...(window.matchMedia('(min-width: 640px)').matches ? { 
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                maxHeight: '95vh',
                maxWidth: '95vw'
            } : {})
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="controls-heading"
        onPointerDownCapture={handlePointerDownCapture}
        onPointerUpCapture={handlePointerUpCapture}
        onLostPointerCapture={handlePointerUpCapture}
      >
        {/* Drag Handle for Desktop */}
        <div
            onPointerDown={handlePointerDown}
            className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 pt-2 rounded-b-lg cursor-grab z-10"
            title="Drag to move"
        >
            <div className="w-10 h-1 bg-cyan-500/35 rounded-full mx-auto hover:bg-[#00f2ff] transition-colors" />
        </div>

        {/* Resize Handle */}
        <div
            onPointerDown={handleResizePointerDown}
            className="hidden sm:flex absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 items-end justify-end pb-1 pr-1"
            title="Drag to resize"
        >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none opacity-50 text-[#00f2ff]">
                <path d="M11 15L15 11M7 15L15 7M3 15L15 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b-2 border-cyan-500/30 bg-[#0c1e24] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00f2ff]" />
          <h2 id="controls-heading" className="text-sm font-bold text-white flex items-center gap-2 ml-1.5">
              <AdjustmentsIcon className="w-5 h-5 text-[#00f2ff] animate-pulse" />
              <span className="font-orbitron tracking-widest text-[#00f2ff] uppercase text-xs">Aetherium Pilot Controller</span>
              <span className="text-[9px] font-mono text-cyan-600 uppercase tracking-wider ml-2 hidden sm:inline-block">
                  [SYS_VER: 80.8]
              </span>
          </h2>
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsControlsOpen(false)}
                className="text-cyan-400 hover:text-white transition-colors p-1 rounded-full hover:bg-cyan-500/10 cursor-pointer"
                aria-label="Close controls"
            >
                <XCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex overflow-x-auto bg-slate-950/90 border-b border-cyan-900/30 no-scrollbar">
            <TabButton label="World" isActive={activeTab === 'sliders'} onClick={() => setActiveTab('sliders')} />
            {cameraControlsEnabled && <TabButton label="Ship" isActive={activeTab === 'ship'} onClick={() => setActiveTab('ship')} />}
            <TabButton label="Sound" isActive={activeTab === 'sound'} onClick={() => setActiveTab('sound')} />
            {cameraControlsEnabled && <TabButton label="Landmarks" isActive={activeTab === 'landmarks'} onClick={() => setActiveTab('landmarks')} />}
            
            {EDITMODE && (
                <>
                    <TabButton label="Terraform" isActive={activeTab === 'terraform'} onClick={() => setActiveTab('terraform')} />
                    {cameraControlsEnabled && <TabButton label="Collision" isActive={activeTab === 'collision'} onClick={() => setActiveTab('collision')} />}
                    {cameraControlsEnabled && <TabButton label="Controls" isActive={activeTab === 'controls'} onClick={() => setActiveTab('controls')} />}
                    <TabButton label="System" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </>
            )}
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'sliders' && <SlidersPanel />}
            {activeTab === 'ship' && <ShipConfigPanel />}
            {activeTab === 'sound' && <SoundPanel />}
            {activeTab === 'landmarks' && <LandmarksPanel />}
            {activeTab === 'terraform' && <TerraformPanel />}
            {activeTab === 'collision' && <CollisionPanel />}
            {activeTab === 'controls' && <ControlsConfigPanel />}
            {activeTab === 'settings' && <SettingsPanel />}
        </div>
        
         {/* Footer */}
        {sourceAuthor && activeTab === 'sliders' && (
            <div className="flex-shrink-0 px-4 py-2 border-t border-gray-700 text-center">
                <a 
                    href={sessionSource!} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-cyan-400 hover:text-white transition-colors"
                >
                    World Shader evolved from @{sourceAuthor}
                </a>
            </div>
        )}
      </div>
    </>
  );
};
