import React from 'react';
import { X, Sliders, Sparkles } from 'lucide-react';
import { SequenceConfig, DisciplineMode } from '../types/shooting';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SequenceConfig;
  onUpdateConfig: (newConfig: Partial<SequenceConfig>) => void;
  onApplyPreset: (mode: DisciplineMode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onApplyPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Timer &amp; Voice Configuration</h2>
              <p className="text-xs text-slate-400">
                Adjust natural voice options, preparation time, and training cadence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Discipline Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Discipline &amp; Training Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onApplyPreset('nsra-10s')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-emerald-400">NSRA Official 10s</div>
              <div className="text-[11px] text-slate-400 mt-0.5">60s Prep · 7.0s Attention · 10s Fire</div>
            </button>

            <button
              onClick={() => onApplyPreset('nsra-fast')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-white">Rapid Practice Drill</div>
              <div className="text-[11px] text-slate-400 mt-0.5">30s Prep · 7.0s Attention · 10s Fire</div>
            </button>

            <button
              onClick={() => onApplyPreset('issf-random')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-white">ISSF 25m Random Delay</div>
              <div className="text-[11px] text-slate-400 mt-0.5">60s Prep · 3–7s Random · 10s Fire</div>
            </button>

            <button
              onClick={() => onApplyPreset('custom')}
              className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-white">Fast Dry-Fire Drill</div>
              <div className="text-[11px] text-slate-400 mt-0.5">15s Prep · 7.0s Attention · 10s Fire</div>
            </button>
          </div>
        </div>

        {/* Natural Voice Persona Selection */}
        <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Range Officer Natural Voice</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Voice Mode:</label>
              <select
                value={config.voiceMode}
                onChange={(e) => onUpdateConfig({ voiceMode: e.target.value as SequenceConfig['voiceMode'] })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white cursor-pointer"
              >
                <option value="studio-ai">Studio AI Natural (Gemini TTS)</option>
                <option value="browser-speech">OS / Browser Speech</option>
                <option value="synth-pa">Range Megaphone (Electronic PA)</option>
                <option value="beeps-only">Tones Only (No Voice)</option>
              </select>
            </div>

            {config.voiceMode === 'studio-ai' && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Range Officer Tone:</label>
                <select
                  value={config.studioVoiceId}
                  onChange={(e) => onUpdateConfig({ studioVoiceId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-medium cursor-pointer"
                >
                  <option value="Fenrir">Fenrir (Authoritative British RO - Deep &amp; Loud)</option>
                  <option value="Charon">Charon (Formal Deep RO - Competition Cadence)</option>
                  <option value="Puck">Puck (Crisp Sharp RO - Clear Attack)</option>
                  <option value="Kore">Kore (Clear Professional - Articulate)</option>
                  <option value="Zephyr">Zephyr (Calm Articulate - Crisp)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Timing parameters */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>Preparation &amp; Loading Time</span>
              <span className="font-mono text-emerald-400 font-semibold">{config.prepTimeSeconds} seconds</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={config.prepTimeSeconds}
              onChange={(e) => onUpdateConfig({ prepTimeSeconds: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>10s (Fast)</span>
              <span>60s (NSRA Official)</span>
              <span>120s (Extended)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>Pre-Fire Delay after &quot;ATTENTION&quot;</span>
              <span className="font-mono text-emerald-400 font-semibold">{config.attentionDelaySeconds} seconds</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              step="0.5"
              value={config.attentionDelaySeconds}
              onChange={(e) => onUpdateConfig({ attentionDelaySeconds: parseFloat(e.target.value), randomizeAttention: false })}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>3.0s</span>
              <span>7.0s (NSRA / ISSF Standard)</span>
              <span>10.0s</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>Inter-Series Rest Interval (Loop Repeat Delay)</span>
              <span className="font-mono text-emerald-400 font-semibold">{config.intervalSeconds} seconds</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={config.intervalSeconds}
              onChange={(e) => onUpdateConfig({ intervalSeconds: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>10s</span>
              <span>30s (Default)</span>
              <span>90s</span>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableTenSecWarning}
              onChange={(e) => onUpdateConfig({ enableTenSecWarning: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 accent-emerald-500 cursor-pointer"
            />
            <span>Announce &quot;10 SECONDS&quot; warning call prior to Attention</span>
          </label>

          <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableCadenceTicks}
              onChange={(e) => onUpdateConfig({ enableCadenceTicks: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 accent-emerald-500 cursor-pointer"
            />
            <span>Audible 2.0s cadence ticks (5 shots pacer during 10s fire)</span>
          </label>

          <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.randomizeAttention}
              onChange={(e) => onUpdateConfig({ randomizeAttention: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 accent-emerald-500 cursor-pointer"
            />
            <span>Randomize delay after Attention (3.0s to 7.0s ISSF style)</span>
          </label>
        </div>

        {/* Target Series Limit */}
        <div className="pt-2 border-t border-slate-800">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Auto-Stop After Series Count
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { count: 0, label: 'Continuous' },
              { count: 4, label: '4 Series' },
              { count: 6, label: '6 Series' },
              { count: 12, label: '12 Series' },
            ].map((item) => (
              <button
                key={item.count}
                type="button"
                onClick={() => onUpdateConfig({ totalSeriesTarget: item.count })}
                className={`py-2 px-2 text-xs rounded-lg font-medium border transition-colors cursor-pointer text-center ${
                  config.totalSeriesTarget === item.count
                    ? 'bg-emerald-500/15 border-emerald-500 text-white font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Apply &amp; Done
          </button>
        </div>
      </div>
    </div>
  );
};
