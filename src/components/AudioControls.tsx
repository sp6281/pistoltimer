import React, { useEffect, useState } from 'react';
import { Play, Pause, Square, SkipForward, Volume2, VolumeX, Zap, Sun, Sparkles, Mic, PlayCircle } from 'lucide-react';
import { VoiceMode, SequenceConfig } from '../types/shooting';
import { soundEngine } from '../audio/soundEngine';

interface AudioControlsProps {
  loopActive: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkipPhase: () => void;
  config: SequenceConfig;
  onUpdateConfig: (newConfig: Partial<SequenceConfig>) => void;
  onSoundCheck: () => void;
  wakeLockActive: boolean;
  onToggleWakeLock: () => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  loopActive,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
  onSkipPhase,
  config,
  onUpdateConfig,
  onSoundCheck,
  wakeLockActive,
  onToggleWakeLock,
}) => {
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState<boolean>(false);

  useEffect(() => {
    const voices = soundEngine.getBrowserVoices();
    setBrowserVoices(voices);

    const onVoicesChanged = () => {
      setBrowserVoices(soundEngine.getBrowserVoices());
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      }
    };
  }, []);

  // Preload studio voice whenever studioVoiceId changes
  useEffect(() => {
    if (config.voiceMode === 'studio-ai') {
      soundEngine.preloadStudioVoices(config.studioVoiceId);
    }
  }, [config.voiceMode, config.studioVoiceId]);

  const handleTestVoice = async () => {
    setIsPlayingTestVoice(true);
    try {
      await soundEngine.speakCommand('ATTENTION', config);
    } finally {
      setTimeout(() => setIsPlayingTestVoice(false), 1200);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 w-full space-y-6">
      {/* Primary Action Buttons (Thumb friendly, min 48px height) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {!loopActive ? (
          <button
            onClick={onStart}
            className="sm:col-span-2 h-14 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>START SPEAKER LOOP</span>
          </button>
        ) : isPaused ? (
          <button
            onClick={onResume}
            className="sm:col-span-2 h-14 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>RESUME SERIES</span>
          </button>
        ) : (
          <button
            onClick={onPause}
            className="sm:col-span-2 h-14 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-base flex items-center justify-center gap-3 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Pause className="w-6 h-6 fill-current" />
            <span>PAUSE LOOP</span>
          </button>
        )}

        <button
          onClick={onStop}
          disabled={!loopActive}
          className="h-14 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/50 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <Square className="w-5 h-5" />
          <span>STOP & RESET</span>
        </button>
      </div>

      {/* Secondary Fast Drill Skip Action */}
      {loopActive && (
        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">
            Skip current phase (e.g. advance loading directly to ATTENTION)
          </div>
          <button
            onClick={onSkipPhase}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip Phase</span>
          </button>
        </div>
      )}

      {/* Voice Selection & Customization Section */}
      <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Voice System &amp; Natural Speech Engine</span>
          </span>
          <button
            onClick={handleTestVoice}
            disabled={isPlayingTestVoice}
            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            title="Hear command pronunciation"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>{isPlayingTestVoice ? 'Playing...' : 'Test Voice'}</span>
          </button>
        </div>

        {/* 4 Mode Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => onUpdateConfig({ voiceMode: 'studio-ai' })}
            className={`py-2 px-2 rounded-lg font-medium transition-colors text-center cursor-pointer flex flex-col items-center gap-0.5 ${
              config.voiceMode === 'studio-ai'
                ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Studio AI Natural</span>
            <span className="text-[10px] opacity-75">Human RO Voice</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateConfig({ voiceMode: 'browser-speech' })}
            className={`py-2 px-2 rounded-lg font-medium transition-colors text-center cursor-pointer flex flex-col items-center gap-0.5 ${
              config.voiceMode === 'browser-speech'
                ? 'bg-slate-800 text-white font-bold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>OS Speech</span>
            <span className="text-[10px] opacity-75">Device Synthesizer</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateConfig({ voiceMode: 'synth-pa' })}
            className={`py-2 px-2 rounded-lg font-medium transition-colors text-center cursor-pointer flex flex-col items-center gap-0.5 ${
              config.voiceMode === 'synth-pa'
                ? 'bg-slate-800 text-white font-bold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Range Megaphone</span>
            <span className="text-[10px] opacity-75">Electronic PA</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateConfig({ voiceMode: 'beeps-only' })}
            className={`py-2 px-2 rounded-lg font-medium transition-colors text-center cursor-pointer flex flex-col items-center gap-0.5 ${
              config.voiceMode === 'beeps-only'
                ? 'bg-slate-800 text-white font-bold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Tones Only</span>
            <span className="text-[10px] opacity-75">Pure Buzzer/Horn</span>
          </button>
        </div>

        {/* Dynamic Voice Settings based on Mode */}
        {config.voiceMode === 'studio-ai' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Select Natural Range Officer Voice:
              </label>
              <select
                value={config.studioVoiceId}
                onChange={(e) => onUpdateConfig({ studioVoiceId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Fenrir">Fenrir (Authoritative British RO - Deep &amp; Loud)</option>
                <option value="Charon">Charon (Formal Deep RO - Competition Cadence)</option>
                <option value="Puck">Puck (Crisp Sharp RO - Clear Attack)</option>
                <option value="Kore">Kore (Clear Professional - Articulate Official)</option>
                <option value="Zephyr">Zephyr (Calm Articulate - Crisp Enunciation)</option>
              </select>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center">
              Natural human speech generated with Gemini TTS, cached locally for sample-accurate zero latency timing.
            </div>
          </div>
        )}

        {config.voiceMode === 'browser-speech' && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Installed Device / Browser Voice:
              </label>
              <select
                value={config.browserVoiceUri}
                onChange={(e) => {
                  onUpdateConfig({ browserVoiceUri: e.target.value });
                  soundEngine.setBrowserVoice(e.target.value);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {browserVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Speech Rate</span>
                  <span className="font-mono">{config.speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={config.speechRate}
                  onChange={(e) => onUpdateConfig({ speechRate: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Pitch</span>
                  <span className="font-mono">{config.speechPitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={config.speechPitch}
                  onChange={(e) => onUpdateConfig({ speechPitch: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-900 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Volume & Wake Lock Controls Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-800/80">
        {/* Volume & Boost */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Range Speaker Volume</span>
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              {Math.round(config.volume * 100)}% {config.highGainBoost ? '(+6dB Boosted)' : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.volume}
              onChange={(e) => onUpdateConfig({ volume: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
            <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => onUpdateConfig({ highGainBoost: !config.highGainBoost })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 border transition-colors cursor-pointer ${
                config.highGainBoost
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Ear Defender Boost (+6dB)</span>
            </button>

            <button
              onClick={onSoundCheck}
              className="px-3 py-1.5 bg-slate-950 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Test Horn
            </button>
          </div>
        </div>

        {/* Screen Awake Lock */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Shooting Line Screen Awake</span>
            </span>
            <span className="font-mono text-slate-400">
              {wakeLockActive ? 'Active' : 'Disabled'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Keeps your phone or tablet screen from sleeping on the shooting bench during multi-round series practice.
          </p>

          <button
            onClick={onToggleWakeLock}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              wakeLockActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{wakeLockActive ? 'Screen Lock Active (Screen Will Stay Awake)' : 'Keep Screen Awake on Range Bench'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
