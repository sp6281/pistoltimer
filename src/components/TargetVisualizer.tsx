import React from 'react';
import { SequencePhase } from '../types/shooting';
import { ShieldAlert, Crosshair, ArrowDownRight } from 'lucide-react';

interface TargetVisualizerProps {
  phase: SequencePhase;
  elapsedInPhase: number;
  phaseDuration: number;
  cadenceTicksEnabled: boolean;
}

export const TargetVisualizer: React.FC<TargetVisualizerProps> = ({
  phase,
  elapsedInPhase,
  phaseDuration,
}) => {
  const isFacing = phase === 'firing';
  const isAttention = phase === 'attention';
  const isLoad = phase === 'loading';
  const isStopped = phase === 'stopped';

  // Calculate current shot progress (1 to 5) during 10s fire
  const currentShotIndex = phase === 'firing' 
    ? Math.min(5, Math.floor(elapsedInPhase / 2.0) + 1)
    : phase === 'stopped' ? 5 : 0;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-slate-900/60 rounded-2xl border border-slate-800/80 w-full overflow-hidden">
      {/* Range Light Bar (Red / Green) matching electronic turning target systems */}
      <div className="flex items-center justify-between w-full max-w-md px-6 py-2.5 mb-6 bg-slate-950/90 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded-full transition-all duration-300 ${
              isFacing
                ? 'bg-slate-800 border border-slate-700 opacity-30'
                : 'bg-red-600 shadow-[0_0_16px_rgba(220,38,38,0.85)] border border-red-400'
            }`}
          />
          <span className={`text-xs font-semibold tracking-wider uppercase ${!isFacing ? 'text-red-400' : 'text-slate-600'}`}>
            Red Light (Hold / Stop)
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold tracking-wider uppercase ${isFacing ? 'text-emerald-400' : 'text-slate-600'}`}>
            Green Light (Targets Face)
          </span>
          <div
            className={`w-5 h-5 rounded-full transition-all duration-300 ${
              isFacing
                ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.95)] border border-emerald-300'
                : 'bg-slate-800 border border-slate-700 opacity-30'
            }`}
          />
        </div>
      </div>

      {/* Target Canvas / Turning Frame Simulator */}
      <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center [perspective:1000px]">
        {/* Physical Turning Target frame */}
        <div
          className="w-56 h-56 md:w-64 md:h-64 rounded-full flex items-center justify-center transition-transform duration-300 ease-out shadow-2xl relative"
          style={{
            transform: isFacing ? 'rotateY(0deg)' : 'rotateY(88deg)',
            transformOrigin: 'center center',
          }}
        >
          {/* Target Face (ISSF / NSRA 25m Rapid Fire Target replica) */}
          <div className="w-full h-full rounded-full bg-slate-900 border-4 border-slate-600 flex items-center justify-center relative shadow-inner overflow-hidden">
            {/* Outer rings (5, 6, 7, 8, 9, 10) */}
            <div className="w-[88%] h-[88%] rounded-full border border-slate-700 flex items-center justify-center">
              <div className="w-[74%] h-[74%] rounded-full border border-slate-700 flex items-center justify-center">
                <div className="w-[60%] h-[60%] rounded-full border border-slate-700 flex items-center justify-center">
                  <div className="w-[46%] h-[46%] rounded-full border border-slate-600 flex items-center justify-center">
                    {/* 10 Ring & Inner 10 / X */}
                    <div className="w-[30%] h-[30%] rounded-full border border-slate-500 flex items-center justify-center bg-slate-950">
                      <div className="w-[12%] h-[12%] rounded-full bg-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* White Aiming Guide Lines (horizontal white lines on rapid fire targets) */}
            <div className="absolute left-0 right-0 h-1 bg-white/40 top-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-0 bottom-0 w-1 bg-white/20 left-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Target Label */}
            <span className="absolute bottom-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              25m Rapid Fire
            </span>
          </div>
        </div>

        {/* Edge Indicator when target is turned away (Edge-On) */}
        {!isFacing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-3 h-60 bg-slate-700 rounded-sm shadow-lg border border-slate-500/50 flex items-center justify-center">
              <div className="w-0.5 h-48 bg-slate-400/50" />
            </div>
            <span className="mt-3 text-xs font-mono text-slate-400 tracking-wider">
              {isAttention ? 'TARGETS EDGED (7.0s)' : 'TARGETS EDGED'}
            </span>
          </div>
        )}
      </div>

      {/* 45° Ready Position Alert Banner during Attention phase */}
      {isAttention && (
        <div className="mt-4 w-full max-w-md p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-amber-200">
              Assume Ready Position (NSRA Rule 8.7.6.2)
            </div>
            <div className="text-[11px] text-amber-400/80">
              Arm pointing downwards at ≤ 45° angle until start signal sounds.
            </div>
          </div>
        </div>
      )}

      {/* 5-Shot Series Cadence Indicators */}
      <div className="mt-6 w-full max-w-md">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>5-Shot Cadence (2.0s / shot)</span>
          <span className="font-mono tabular-nums text-slate-300">
            {phase === 'firing' ? `Shot ${currentShotIndex} of 5` : phase === 'stopped' ? '5 of 5 Complete' : '5 Shots / 10.0s'}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((shotNum) => {
            const isFired = currentShotIndex >= shotNum;
            const isNext = phase === 'firing' && currentShotIndex === shotNum;
            return (
              <div
                key={shotNum}
                className={`py-2 px-1 rounded-lg text-center border text-xs font-mono transition-all duration-200 ${
                  isFired
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold'
                    : isNext
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 animate-pulse'
                    : 'bg-slate-950/40 border-slate-800 text-slate-600'
                }`}
              >
                <span>#{shotNum}</span>
                <div className="text-[9px] text-slate-500 font-normal mt-0.5">
                  {shotNum * 2}s
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
