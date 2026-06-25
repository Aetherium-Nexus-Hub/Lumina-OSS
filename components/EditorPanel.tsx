/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { PlayIcon, SparklesIcon, QuestionMarkCircleIcon, MagicWandIcon, LightBulbIcon, AdjustmentsIcon, XCircleIcon } from './Icons';
import { AiStage } from '../types';
import { useAppContext } from '../context/AppContext';
import { LiveAudioSession } from './LiveAudioSession';


const getAiStatusText = (stage: AiStage): string | null => {
    switch (stage) {
        case AiStage.ADJUSTING_SLIDERS:
            return 'Adjusting sliders with AI...';
        case AiStage.SMART_SLIDER_CREATION:
            return 'Designing a new control...';
        case AiStage.MODIFYING_CODE:
            return 'Modifying shader code...';
        case AiStage.ENABLE_CAMERA_CONTROLS:
            return 'Adding camera controls...';
        default:
            return null;
    }
}

export const EditorPanel: React.FC = () => {
  const {
    isSidebarVisible: isVisible,
    setIsSidebarVisible,
    shaderCode,
    handleCodeEdit: onCodeChange,
    handleRun: onRun,
    error,
    geminiPrompt,
    setGeminiPrompt: onGeminiPromptChange,
    handleAiRequest: onAiRequest,
    handleAiSliderAdjust: onAiSliderAdjust,
    aiStage,
    geminiError,
    handleExplainCode: onExplainCode,
    isGeneratingExplanation,
    explanation,
    explanationError,
    handleClearExplanation: onClearExplanation,
    isAnalyzing,
    analysisError,
    sliders,
    uniforms,
    handleUniformChange: onUniformChange,
    handleUniformsCommit,
    handleSliderConfigChange: onSliderConfigChange,
    handleResetSliders: onResetSliders,
    handleRemoveSlider: onRemoveSlider,
    handleFetchSliderSuggestions: onFetchSliderSuggestions,
    isFetchingSuggestions,
    sliderSuggestions,
    suggestionsError,
    handleClearSuggestions: onClearSuggestions,
    usedSuggestions,
    handleFixCodeWithAi: onFixCodeWithAi,
    isFixingCode,
  } = useAppContext();

  const [selectedSnippet, setSelectedSnippet] = useState<string>('');
  const [editingSlider, setEditingSlider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'controls' | 'copilot'>('code');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleSelect = () => {
    if (textareaRef.current) {
        const { selectionStart, selectionEnd, value } = textareaRef.current;
        const snippet = value.substring(selectionStart, selectionEnd).trim();
        setSelectedSnippet(snippet);
        if (!snippet) {
            onClearExplanation();
        }
    }
  };

  const isGenerating = aiStage !== AiStage.IDLE || isFixingCode;
  const aiStatusText = getAiStatusText(aiStage);

  return (
    <aside
      className={`
        glass-panel border-l border-cyan-800/20 
        flex flex-col
        fixed inset-y-0 right-0 w-full max-w-md z-40
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:inset-y-auto lg:right-auto lg:max-w-none lg:z-10 lg:transform-none
        lg:transition-all lg:duration-300 lg:ease-in-out
        ${ isVisible ? 'translate-x-0' : 'translate-x-full' }
        lg:translate-x-0
        ${ isVisible ? 'lg:w-[450px]' : 'lg:w-0' }
      `}
    >
      <div className={`overflow-hidden flex flex-col h-full ${isVisible ? 'min-w-[300px] lg:min-w-[450px]' : 'min-w-0'}`}>
        
        {/* Title Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-cyan-800/20 bg-slate-950/40">
          <h2 className="text-xs font-bold text-cyan-400 font-orbitron tracking-widest uppercase">
            {activeTab === 'code' ? 'Quantum Code Engine' : activeTab === 'controls' ? 'Tactical Flight Parameters' : 'Quantum AI Co-Pilot'}
          </h2>
          <button 
            onClick={() => setIsSidebarVisible(false)} 
            className="p-1.5 rounded hover:bg-cyan-500/10 text-cyan-400 lg:hidden"
            aria-label="Close editor"
          >
            <svg xmlns="http://www.w3.org/2050/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className="flex-shrink-0 flex gap-1 border-b border-cyan-800/20 bg-slate-950/20 p-2">
            <button 
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-1.5 px-2 rounded text-center text-[10px] font-bold font-orbitron tracking-wider transition-all duration-200 border ${
                    activeTab === 'code' 
                    ? 'bg-cyan-500/10 text-[#00f2ff] border-cyan-500/20 font-bold shadow-[0_0_8px_rgba(0,242,255,0.15)]' 
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
                }`}
            >
                CODE
            </button>
            <button 
                onClick={() => setActiveTab('controls')}
                className={`flex-1 py-1.5 px-2 rounded text-center text-[10px] font-bold font-orbitron tracking-wider transition-all duration-200 border ${
                    activeTab === 'controls' 
                    ? 'bg-cyan-500/10 text-[#00f2ff] border-cyan-500/20 font-bold shadow-[0_0_8px_rgba(0,242,255,0.15)]' 
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
                }`}
            >
                SLIDERS & AI
            </button>
            <button 
                onClick={() => setActiveTab('copilot')}
                className={`flex-1 py-1.5 px-2 rounded text-center text-[10px] font-bold font-orbitron tracking-wider transition-all duration-200 border ${
                    activeTab === 'copilot' 
                    ? 'bg-cyan-500/10 text-[#00f2ff] border-cyan-500/20 font-bold shadow-[0_0_8px_rgba(0,242,255,0.15)]' 
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300 animate-pulse'
                }`}
            >
                CO-PILOT AI
            </button>
        </div>

        {/* Dynamic Tab Content Scroll Container */}
        <div className="flex-grow overflow-y-auto">
            {activeTab === 'code' && (
                <div className="animate-fadeIn">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <label htmlFor="shader-editor" className="block text-xs font-semibold text-cyan-400 font-orbitron tracking-widest uppercase">
                          Fragment Shader (GLSL)
                        </label>
                        {selectedSnippet && (
                            <button
                                onClick={() => onExplainCode(selectedSnippet)}
                                disabled={isGeneratingExplanation}
                                className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/20 text-xs font-semibold rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <QuestionMarkCircleIcon className={`text-sm ${isGeneratingExplanation ? 'animate-spin' : ''}`} />
                                {isGeneratingExplanation ? 'Explaining...' : 'Explain Selection'}
                            </button>
                        )}
                      </div>
                      <div className="relative">
                        <textarea
                          id="shader-editor"
                          ref={textareaRef}
                          onSelect={handleSelect}
                          value={shaderCode}
                          onChange={(e) => onCodeChange(e.target.value)}
                          className="notebook-textarea rounded-md h-72 outline-none"
                          spellCheck="false"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                        />
                      </div>
                      <div className="mt-2.5 flex justify-end">
                        <button
                            onClick={onRun}
                            className="flex items-center gap-2 px-5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-400 font-orbitron font-bold rounded shadow-[0_0_10px_rgba(0,242,255,0.2)] transition-all duration-200 cursor-pointer"
                        >
                            <PlayIcon className="text-base" />
                            Run Shader
                        </button>
                      </div>
                    </div>
                    
                    <div className="px-4 pb-4 min-h-[24px]">
                      {error ? (
                        <div className="bg-red-900/40 border border-red-700/60 text-red-300 text-xs font-mono p-3 rounded-md whitespace-pre-wrap max-h-48 overflow-y-auto">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold mb-1 text-red-200">Compilation Error:</p>
                              {error}
                            </div>
                            <button
                              onClick={onFixCodeWithAi}
                              disabled={isFixingCode}
                              className="flex items-center gap-1.5 ml-4 px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
                            >
                              <MagicWandIcon className={`text-sm ${isFixingCode ? 'animate-spin' : ''}`} />
                              {isFixingCode ? 'Fixing...' : 'Fix with AI'}
                            </button>
                          </div>
                        </div>
                      ) : (explanation || explanationError || isGeneratingExplanation) && (
                          <div className="relative bg-gray-800/40 border border-gray-700/60 p-3 rounded-md text-sm">
                              <button 
                                  onClick={() => {
                                      onClearExplanation();
                                      setSelectedSnippet('');
                                  }} 
                                  className="absolute top-2 right-2 text-gray-400 hover:text-white"
                                  aria-label="Close explanation"
                              >
                                  <svg xmlns="http://www.w3.org/2050/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                              <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2 text-base font-orbitron text-xs uppercase tracking-wider">
                                  <QuestionMarkCircleIcon className="text-lg" />
                                  Code Explanation
                              </h3>
                              {isGeneratingExplanation && !explanation && !explanationError && (
                                  <p className="text-gray-300 animate-pulse text-xs">Thinking...</p>
                              )}
                              {explanationError && (
                                  <div className="text-red-400 text-xs">
                                      <p><span className="font-bold">Error:</span> {explanationError}</p>
                                  </div>
                              )}
                              {explanation && (
                                  <p className="text-gray-200 text-xs whitespace-pre-wrap font-sans leading-relaxed">{explanation}</p>
                              )}
                          </div>
                      )}
                    </div>
                </div>
            )}

            {activeTab === 'controls' && (
                <div className="p-4 space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold font-orbitron text-cyan-400 uppercase tracking-widest">Shader Controls</h3>
                        {sliders.length > 0 && (
                            <button 
                                onClick={onResetSliders}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="Remove all sliders"
                            >
                                <XCircleIcon className="text-sm" />
                                Reset Sliders
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-4 pt-2 border-t border-cyan-900/20">
                        <button
                            onClick={onFetchSliderSuggestions}
                            disabled={isFetchingSuggestions || isAnalyzing || isGenerating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-cyan-800/20 text-white font-semibold text-sm rounded-md transition-all duration-200 shadow-md disabled:bg-gray-800 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <LightBulbIcon className={`text-xl ${isFetchingSuggestions ? 'animate-pulse' : ''}`} />
                            {isFetchingSuggestions ? 'Querying suggestions...' : 'Suggest Control Ideas'}
                        </button>

                        {suggestionsError && (
                            <div className="text-red-400 text-xs p-2 rounded-md bg-red-900/50 border border-red-700">
                                <p><span className="font-bold">Suggestion Error:</span> {suggestionsError}</p>
                            </div>
                        )}
                        
                        {sliderSuggestions.length > 0 && !isFetchingSuggestions && (
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] text-gray-400">Apply idea to code with AI:</p>
                                    <button onClick={onClearSuggestions} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-md hover:bg-gray-700 transition-colors cursor-pointer">&times; Clear</button>
                                </div>
                            
                                <div className="flex flex-wrap gap-2">
                                    {sliderSuggestions.map((suggestion) => {
                                        const isSafe = suggestion.type === 'safe';
                                        const isUsed = usedSuggestions.has(suggestion.suggestion);
                                        const buttonClass = isSafe
                                            ? "bg-teal-950/40 hover:bg-teal-900/60 border border-teal-850/40 text-teal-300"
                                            : "bg-purple-950/40 hover:bg-purple-900/60 border border-purple-850/40 text-purple-300";
                                        
                                        const usedClass = isUsed
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'transition-all transform hover:scale-105 cursor-pointer';

                                        return (
                                            <button
                                                key={suggestion.suggestion}
                                                onClick={() => {
                                                    onGeminiPromptChange(suggestion.suggestion);
                                                    setTimeout(onAiRequest, 50); 
                                                }}
                                                disabled={isUsed}
                                                className={`px-3 py-1 text-[11px] font-semibold rounded-full ${buttonClass} ${usedClass}`}
                                            >
                                                {suggestion.suggestion}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {isAnalyzing && (
                        <p className="text-xs text-cyan-400 animate-pulse text-center py-2">
                            {sliders.length > 0 ? 'Improving slider diagnostics...' : 'Analyzing code matrices for controllers...'}
                        </p>
                    )}

                    {analysisError && (
                        <div className="text-red-400 text-xs p-2 rounded-md bg-red-900/50 border border-red-700">
                            <p><span className="font-bold">Analysis Error:</span> {analysisError}</p>
                        </div>
                    )}
                    
                    {sliders.length > 0 ? (
                        <div className="space-y-4 pt-4 border-t border-cyan-900/20 max-h-[40vh] overflow-y-auto pr-1">
                            {sliders.map((slider) => {
                              const isEditing = editingSlider === slider.variableName;
                              return (
                                <div key={slider.variableName} className="space-y-2 group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <label 
                                                htmlFor={slider.variableName}
                                                className="text-xs text-gray-300 cursor-help border-b border-dotted border-gray-500 font-sans font-medium"
                                                title={slider.description}
                                            >
                                                {slider.name}
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-cyan-400 w-12 text-right">
                                                {uniforms[slider.variableName]?.toFixed(2)}
                                            </span>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingSlider(isEditing ? null : slider.variableName)}
                                                    title={isEditing ? "Finish Editing" : "Edit Range"}
                                                    className={`p-1 rounded transition-colors ${isEditing ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white hover:bg-slate-800'}`}
                                                >
                                                    <AdjustmentsIcon className="text-sm" />
                                                </button>
                                                <button
                                                    onClick={() => onRemoveSlider(slider.variableName)}
                                                    title="Remove Slider"
                                                    className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                                >
                                                    <XCircleIcon className="text-sm" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEditing && (
                                            <input
                                                type="number"
                                                value={slider.min}
                                                onChange={(e) => {
                                                    const value = parseFloat(e.target.value);
                                                    if (!isNaN(value)) {
                                                        onSliderConfigChange(slider.variableName, 'min', value);
                                                    }
                                                }}
                                                step={slider.step}
                                                className="w-16 p-1 bg-gray-900 border border-gray-700 rounded-md text-xs text-white text-center focus:ring-1 focus:ring-cyan-500 outline-none"
                                                aria-label={`${slider.name} min value`}
                                            />
                                        )}
                                        <input
                                            type="range"
                                            id={slider.variableName}
                                            name={slider.variableName}
                                            min={slider.min}
                                            max={slider.max}
                                            step={slider.step}
                                            value={uniforms[slider.variableName] ?? slider.defaultValue}
                                            onChange={(e) => onUniformChange(slider.variableName, parseFloat(e.target.value))}
                                            onMouseUp={handleUniformsCommit}
                                            onTouchEnd={handleUniformsCommit}
                                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00f2ff]"
                                        />
                                        {isEditing && (
                                            <input
                                                type="number"
                                                value={slider.max}
                                                onChange={(e) => {
                                                    const value = parseFloat(e.target.value);
                                                    if (!isNaN(value)) {
                                                        onSliderConfigChange(slider.variableName, 'max', value);
                                                    }
                                                }}
                                                step={slider.step}
                                                className="w-16 p-1 bg-gray-900 border border-gray-700 rounded-md text-xs text-white text-center focus:ring-1 focus:ring-cyan-500 outline-none"
                                                aria-label={`${slider.name} max value`}
                                            />
                                        )}
                                    </div>
                                </div>
                              )
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-cyan-900/10 rounded bg-slate-950/20">
                            No active code parameters mapped. Talk to the shader or request control suggestions to map variable sliders!
                        </p>
                    )}
                </div>
            )}

            {activeTab === 'copilot' && (
                <div className="h-full flex flex-col animate-fadeIn">
                    <LiveAudioSession />
                </div>
            )}
        </div>
        
        {/* Absolute Bottom AI Toolbar, hidden during full intercom com-link sessions */}
        {activeTab !== 'copilot' && (
            <div className="p-4 bg-slate-950/80 border-t border-cyan-800/20 flex-shrink-0 animate-fadeIn">
              <div className="relative space-y-3 mb-4">
                  <label htmlFor="ai-prompt" className="block text-[11px] font-semibold text-cyan-400 font-orbitron tracking-widest uppercase">
                    Talk to shader:
                  </label>
                  <input 
                    id="ai-prompt"
                    type="text"
                    value={geminiPrompt}
                    onChange={(e) => onGeminiPromptChange(e.target.value)}
                    placeholder="e.g., make it more blue"
                    className="w-full p-2 bg-slate-950/95 border border-cyan-850/40 text-sm text-[#00f2ff] placeholder-cyan-950 rounded focus:outline-none focus:border-[#00f2ff] transition-all outline-none"
                    disabled={isGenerating}
                  />
                  <div className="h-4 text-xs text-center text-cyan-400 font-semibold font-sans">
                      {aiStatusText}
                  </div>
                    {geminiError && (
                    <div className="text-red-400 text-xs p-2 rounded-md bg-red-950/40 border border-red-900/40">
                      <p><span className="font-bold">AI Error:</span> {geminiError}</p>
                    </div>
                  )}
              </div>
              <div className="flex gap-2">
                <button
                    onClick={onAiRequest}
                    disabled={isGenerating || !geminiPrompt}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/30 text-[#00f2ff] font-bold font-orbitron text-xs tracking-wider border border-[#00f2ff]/30 rounded shadow-[0_0_8px_rgba(0,242,255,0.1)] transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Use AI to generate new shader code or controls"
                >
                    <SparklesIcon className={`text-base ${aiStage !== AiStage.IDLE && isGenerating ? 'animate-spin border-cyan-400 text-[#00f2ff]' : ''}`} />
                    {aiStage !== AiStage.IDLE && isGenerating ? 'Thinking...' : 'Create Control'}
                </button>
                 {sliders.length > 0 && (
                    <button
                        onClick={onAiSliderAdjust}
                        disabled={isGenerating || !geminiPrompt}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/35 text-yellow-400 font-bold font-orbitron text-xs tracking-wider border border-yellow-500/30 rounded shadow-[0_0_8px_rgba(255,204,0,0.1)] transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Use AI to adjust existing sliders"
                    >
                        <AdjustmentsIcon className={`text-base ${aiStage === AiStage.ADJUSTING_SLIDERS ? 'animate-spin' : ''}`} />
                        {aiStage === AiStage.ADJUSTING_SLIDERS ? 'Adjusting...' : 'Adjust Values'}
                    </button>
                )}
              </div>
            </div>
        )}
      </div>
    </aside>
  );
};