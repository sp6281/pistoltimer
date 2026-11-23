import React from 'react';
import { SequencePhase } from '../types/shooting';

interface TimerDisplayProps {
  phase: SequencePhase;
  remainingSeconds: number;
  totalPhaseDuration: number;
  currentSeries: number;
  totalSeriesTarget: number;
  loopActive: boolean;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  phase,
  remainingSeconds,
  totalPhaseDuration,
  currentSeries,
  totalSeriesTarget,
  loopActive,
}) => {
  // Format remaining time nicely
  const formattedSeconds = Math.max(0, remainingSeconds).toFixed(1);
  const percentRemaining = totalPhaseDuration > 0 
    ? Math.max(0, Math.min(100, (remainingSeconds / totalPhaseDuration) * 100))
    : 0;

  // Phase labels and styling
  const getPhaseMeta = () => {
    switch (phase) {
      case 'loading':
        return {
          title: 'PREPARATION & LOADING',
          subtitle: 'Load 5 cartridges · Rack slide · Prepare stance',
          colorClass: 'text-amber-400',
          bgClass: 'bg-amber-400',
          borderClass: 'border-amber-500/40',
        };
      case 'attention':
        return {
          title: 'ATTENTION — 45° READY',
          subtitle: 'Targets edged · Standby for start horn',
          colorClass: 'text-red-400',
          bgClass: 'bg-red-500',
          borderClass: 'border-red-500/40',
        };
      case 'firing':
        return {
          title: 'FIRE — 5 SHOTS IN 10s',
          subtitle: 'Targets facing · Discharge 5 shots',
          colorClass: 'text-emerald-400',
          bgClass: 'bg-emerald-500',
          borderClass: 'border-emerald-500/50',
        };
      case 'stopped':
        return {
          title: 'STOP · UNLOAD · MAKE SAFE',
          subtitle: 'Cease fire · Remove magazine · Insert safety flag',
          colorClass: 'text-rose-400',
          bgClass: 'bg-rose-500',
          borderClass: 'border-rose-500/40',
        };
      case 'interval':
        return {
          title: 'INTER-SERIES INTERVAL',
          subtitle: 'Patch targets / reload · Next series starting soon',
          colorClass: 'text-sky-400',
          bgClass: 'bg-sky-500',
          borderClass: 'border-sky-500/40',
        };
      case 'idle':
      default:
        return {
          title: 'STANDBY / IDLE',
          subtitle: 'Press Start Loop to begin NSRA 10s sequence',
          colorClass: 'text-slate-400',
          bgClass: 'bg-slate-500',
          borderClass: 'border-slate-800',
        };
    }
  };

  const meta = getPhaseMeta();

  return (
    <div className={`p-6 rounded-2xl bg-slate-900/60 border ${meta.borderClass} transition-colors duration-300 w-full flex flex-col justify-between`}>
      {/* Top Metadata: Series Counter & Discipline Tag */}
      <div className="flex items-center justify-between text-xs text-slate-400 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">
            {totalSeriesTarget > 0 
              ? `Series ${currentSeries} of ${totalSeriesTarget}` 
              : `Series ${currentSeries} (Continuous Loop)`}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>5 Shots / Series</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-emerald-400 font-mono">10.0s Window</span>
        </div>

        <div className="font-mono text-slate-500 text-xs">
          {loopActive ? 'SPEAKER LOOP RUNNING' : 'STANDBY'}
        </div>
      </div>

      {/* Primary Giant Countdown Clock */}
      <div className="my-6 text-center">
        <div className={`text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tighter tabular-nums ${meta.colorClass}`}>
          {phase === 'idle' ? '10.0' : formattedSeconds}
          <span className="text-2xl sm:text-3xl font-medium text-slate-500 ml-1">s</span>
        </div>

        {/* Phase Header (Clean, unboxed typography) */}
        <div className="mt-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {meta.title}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
          <div
            className={`h-full ${meta.bgClass} transition-all duration-100 ease-linear`}
            style={{ width: `${phase === 'idle' ? 0 : percentRemaining}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 mt-2">
          <span>0.0s</span>
          <span>Phase: {totalPhaseDuration}s total</span>
        </div>
      </div>
    </div>
  );
};
