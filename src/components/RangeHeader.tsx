import React from 'react';
import { Target, Download, Volume2, Shield, Cpu } from 'lucide-react';

interface RangeHeaderProps {
  onOpenExporter: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onSoundCheck: () => void;
  onOpenHardware: () => void;
  isHardwareConnected?: boolean;
}

export const RangeHeader: React.FC<RangeHeaderProps> = ({
  onOpenExporter,
  onOpenRules,
  onOpenSettings,
  onSoundCheck,
  onOpenHardware,
  isHardwareConnected,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Target className="w-5 h-5" />
        </div>
        <a href="/" className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          NSRA RapidFire 10s
        </a>
      </div>

      {/* Zone 2: Clean single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={onOpenExporter}
          className="hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>WAV Audio File</span>
        </button>
        <button
          onClick={onOpenHardware}
          className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>Motor &amp; Lights Interface</span>
          {isHardwareConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Connected" />
          )}
        </button>
        <button
          onClick={onOpenRules}
          className="hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Shield className="w-4 h-4" />
          <span>NSRA Rules</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Timer Settings</span>
        </button>
        <button
          onClick={onSoundCheck}
          className="hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
          <span>Sound Test</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenExporter}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Audio Loop</span>
        </button>
      </div>
    </header>
  );
};
