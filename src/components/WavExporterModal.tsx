import React, { useState } from 'react';
import { X, Download, Disc, CheckCircle2, Info, Loader2, Sparkles } from 'lucide-react';
import { generateShootingWavFile } from '../audio/soundEngine';
import { WavExportOptions } from '../types/shooting';

interface WavExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPrepTime: number;
  defaultAttentionDelay: number;
  currentStudioVoiceId?: string;
}

export const WavExporterModal: React.FC<WavExporterModalProps> = ({
  isOpen,
  onClose,
  defaultPrepTime,
  defaultAttentionDelay,
  currentStudioVoiceId = 'Fenrir',
}) => {
  const [seriesCount, setSeriesCount] = useState<number>(1);
  const [prepTime, setPrepTime] = useState<number>(defaultPrepTime || 60);
  const [attentionDelay, setAttentionDelay] = useState<number>(defaultAttentionDelay || 7.0);
  const [intervalTime, setIntervalTime] = useState<number>(30);
  const [includeWarning, setIncludeWarning] = useState<boolean>(true);
  const [includeCadence, setIncludeCadence] = useState<boolean>(false);
  const [includeAudioTriggerTrack, setIncludeAudioTriggerTrack] = useState<boolean>(false);
  const [voiceStyle, setVoiceStyle] = useState<'studio-ai' | 'pa-announcer' | 'tones-only'>('studio-ai');
  const [studioVoiceId, setStudioVoiceId] = useState<string>(currentStudioVoiceId);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const singleDuration = prepTime + attentionDelay + 10.0 + 3.5 + (seriesCount > 1 ? intervalTime : 3.0);
  const totalEstimatedSec = Math.round(singleDuration * seriesCount);
  const mins = Math.floor(totalEstimatedSec / 60);
  const secs = totalEstimatedSec % 60;
  const timeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setDownloadUrl(null);
    try {
      const options: WavExportOptions = {
        seriesCount,
        prepTimeSeconds: prepTime,
        attentionDelaySeconds: attentionDelay,
        firingTimeSeconds: 10.0,
        intervalSeconds: intervalTime,
        enableTenSecWarning: includeWarning,
        enableCadenceTicks: includeCadence,
        voiceStyle,
        studioVoiceId,
        includeAudioTriggerTrack,
      };

      const result = await generateShootingWavFile(options);
      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
    } catch (err) {
      console.error('WAV generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const filename = `nsra_10s_pistol_${seriesCount}series_${prepTime}sprep_${voiceStyle}_${totalEstimatedSec}s.wav`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Export Audio File (.WAV)</h2>
              <p className="text-xs text-slate-400">
                Rule-compliant uncompressed 44.1 kHz 16-bit audio file for range speakers
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

        {/* Options */}
        <div className="space-y-5">
          {/* 1. Track Structure / Repetitions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Track Structure &amp; Series Count
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { count: 1, label: 'Single Series', desc: 'Repeat One' },
                { count: 4, label: '4 Series', desc: '20 shots' },
                { count: 6, label: '6 Series', desc: '30-shot stage' },
                { count: 12, label: '12 Series', desc: '60-shot match' },
              ].map((item) => (
                <button
                  key={item.count}
                  type="button"
                  onClick={() => {
                    setSeriesCount(item.count);
                    setDownloadUrl(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    seriesCount === item.count
                      ? 'bg-emerald-500/15 border-emerald-500 text-white font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-medium text-slate-200">{item.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Tip: Choose &quot;Single Series&quot; to loop endlessly on any Bluetooth speaker or music app by enabling track repeat.
            </p>
          </div>

          {/* 2. Preparation & Loading Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Preparation &amp; Loading Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { time: 60, label: '60s (NSRA Official)', desc: 'Full 1-minute prep' },
                { time: 30, label: '30s (Training)', desc: 'Standard practice' },
                { time: 15, label: '15s (Rapid Drill)', desc: 'Fast turnaround' },
              ].map((item) => (
                <button
                  key={item.time}
                  type="button"
                  onClick={() => {
                    setPrepTime(item.time);
                    setDownloadUrl(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    prepTime === item.time
                      ? 'bg-emerald-500/15 border-emerald-500 text-white font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-medium text-slate-200">{item.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Audio Voice Mode */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Voice Style in WAV Audio File
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setVoiceStyle('studio-ai');
                  setDownloadUrl(null);
                }}
                className={`py-2 px-2 text-xs rounded-lg font-medium cursor-pointer flex items-center justify-center gap-1.5 ${
                  voiceStyle === 'studio-ai'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm font-semibold border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Natural Studio Voice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVoiceStyle('pa-announcer');
                  setDownloadUrl(null);
                }}
                className={`py-2 px-2 text-xs rounded-lg font-medium cursor-pointer ${
                  voiceStyle === 'pa-announcer'
                    ? 'bg-slate-800 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Range Megaphone
              </button>

              <button
                type="button"
                onClick={() => {
                  setVoiceStyle('tones-only');
                  setDownloadUrl(null);
                }}
                className={`py-2 px-2 text-xs rounded-lg font-medium cursor-pointer ${
                  voiceStyle === 'tones-only'
                    ? 'bg-slate-800 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pure Horns
              </button>
            </div>

            {voiceStyle === 'studio-ai' && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span className="font-medium">Studio Range Officer Voice:</span>
                  <select
                    value={studioVoiceId}
                    onChange={(e) => {
                      setStudioVoiceId(e.target.value);
                      setDownloadUrl(null);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-emerald-400 font-semibold cursor-pointer"
                  >
                    <option value="Fenrir">Fenrir (Authoritative British RO)</option>
                    <option value="Charon">Charon (Formal Deep RO)</option>
                    <option value="Puck">Puck (Crisp Sharp RO)</option>
                    <option value="Kore">Kore (Clear Professional)</option>
                    <option value="Zephyr">Zephyr (Calm Articulate)</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  Generates natural human vocal commands recorded at 24/44.1 kHz, seamlessly mixed with the 1000 Hz start horn and 650 Hz cease fire buzzer.
                </p>
              </div>
            )}

            {/* Rest Interval for Multi-series */}
            {seriesCount > 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Rest Interval Between Series
                </label>
                <select
                  value={intervalTime}
                  onChange={(e) => {
                    setIntervalTime(parseInt(e.target.value));
                    setDownloadUrl(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds (Standard)</option>
                  <option value={45}>45 seconds</option>
                  <option value={60}>60 seconds (Full reset)</option>
                </select>
              </div>
            )}
          </div>

          {/* 4. Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeWarning}
                onChange={(e) => {
                  setIncludeWarning(e.target.checked);
                  setDownloadUrl(null);
                }}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 accent-emerald-500 cursor-pointer"
              />
              <span>Include &quot;10 Seconds&quot; warning call during preparation</span>
            </label>

            <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCadence}
                onChange={(e) => {
                  setIncludeCadence(e.target.checked);
                  setDownloadUrl(null);
                }}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 accent-emerald-500 cursor-pointer"
              />
              <span>Include subtle cadence ticks (every 2.0s during the 10s firing period)</span>
            </label>

            <label className="flex items-start gap-3 text-xs text-amber-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeAudioTriggerTrack}
                onChange={(e) => {
                  setIncludeAudioTriggerTrack(e.target.checked);
                  setDownloadUrl(null);
                }}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 accent-amber-500 cursor-pointer mt-0.5"
              />
              <div>
                <span className="font-semibold text-white">Hardware Motor &amp; Light Relay Trigger (Stereo Track)</span>
                <p className="text-[11px] text-slate-400">
                  Left channel outputs Range Voice &amp; Horns to PA speaker; Right channel outputs a 1 kHz relay pulse for 10.0s to turn your motor and green light via a 3.5mm splitter cable.
                </p>
              </div>
            </label>
          </div>

          {/* Track Summary Banner */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Track Duration:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {timeFormatted} ({totalEstimatedSec}s)
            </span>
          </div>

          {/* Generate Button */}
          {!downloadUrl ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Synthesizing Natural 44.1kHz WAV Audio...</span>
                </>
              ) : (
                <>
                  <Disc className="w-5 h-5" />
                  <span>Build Audio File (.WAV)</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Audio File Ready for Download!</span>
                </div>

                {/* In-browser Audio Preview */}
                <div className="w-full">
                  <div className="text-[11px] text-slate-400 mb-1">Preview generated audio with natural voice:</div>
                  <audio controls src={downloadUrl} className="w-full h-10 accent-emerald-500" />
                </div>

                <a
                  href={downloadUrl}
                  download={filename}
                  className="w-full h-12 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>Download {filename}</span>
                </a>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-400 p-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  Load this file onto your phone, mp3 player, or USB drive connected to a portable speaker at the range.
                  Set player to &quot;Repeat One&quot; to run continuous series loops.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
