/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RangeHeader } from './components/RangeHeader';
import { TargetVisualizer } from './components/TargetVisualizer';
import { TimerDisplay } from './components/TimerDisplay';
import { AudioControls } from './components/AudioControls';
import { WavExporterModal } from './components/WavExporterModal';
import { NsraRulesGuide } from './components/NsraRulesGuide';
import { SettingsModal } from './components/SettingsModal';
import { HardwareTriggerModal } from './components/HardwareTriggerModal';
import { soundEngine } from './audio/soundEngine';
import { hardwareTriggerService } from './services/hardwareTrigger';
import { SequencePhase, SequenceConfig, DisciplineMode } from './types/shooting';
import { Target, Download, Shield, Sliders, Award, Repeat, Sparkles, Cpu, Zap, Cable } from 'lucide-react';

export default function App() {
  // Configuration state with official NSRA defaults, Studio Voice & Hardware Triggers
  const [config, setConfig] = useState<SequenceConfig>({
    prepTimeSeconds: 60,         // NSRA standard 1 minute
    attentionDelaySeconds: 7.0,  // NSRA standard 7 seconds
    firingTimeSeconds: 10.0,     // 10.0 seconds
    intervalSeconds: 30,         // Rest between series
    enableTenSecWarning: true,
    enableCadenceTicks: false,
    randomizeAttention: false,
    voiceMode: 'studio-ai',      // Default to Studio AI Natural Range Officer!
    studioVoiceId: 'Fenrir',     // Deep, authoritative British RO
    browserVoiceUri: '',
    speechRate: 0.95,
    speechPitch: 0.9,
    volume: 0.85,
    highGainBoost: true,
    totalSeriesTarget: 0,        // 0 = continuous loop
    hardwareTriggers: {
      enabled: false,
      protocol: 'serial',
      baudRate: 9600,
      isConnected: false,
      portDescription: '',
      webhookUrl: '',
      audioSplitEnabled: false,
      invertRelay: false,
      lastDispatchedCommand: '',
      targetMotorType: 'servo',
    },
  });

  // State of the shooting sequence
  const [phase, setPhase] = useState<SequencePhase>('idle');
  const [loopActive, setLoopActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentSeries, setCurrentSeries] = useState<number>(1);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(10.0);
  const [phaseDuration, setPhaseDuration] = useState<number>(10.0);
  const [elapsedInPhase, setElapsedInPhase] = useState<number>(0);

  // Session Statistics
  const [completedSeriesCount, setCompletedSeriesCount] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Wake lock
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Modals
  const [isExporterOpen, setIsExporterOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHardwareOpen, setIsHardwareOpen] = useState<boolean>(false);

  // Refs for loop execution without stale state
  const phaseRef = useRef<SequencePhase>('idle');
  phaseRef.current = phase;

  const configRef = useRef<SequenceConfig>(config);
  configRef.current = config;

  const loopActiveRef = useRef<boolean>(false);
  loopActiveRef.current = loopActive;

  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;

  const currentSeriesRef = useRef<number>(1);
  currentSeriesRef.current = currentSeries;

  const phaseStartTimeRef = useRef<number>(0);
  const phaseTotalDurationRef = useRef<number>(0);
  const tenSecWarningFiredRef = useRef<boolean>(false);
  const lastCadenceTickRef = useRef<number>(0);

  // Keep volume in sync
  useEffect(() => {
    soundEngine.setVolume(config.volume, config.highGainBoost);
  }, [config.volume, config.highGainBoost]);

  // Preload natural studio voice on startup
  useEffect(() => {
    if (config.voiceMode === 'studio-ai') {
      soundEngine.preloadStudioVoices(config.studioVoiceId);
    }
  }, [config.voiceMode, config.studioVoiceId]);

  // Request screen wake lock to keep screen on while shooting
  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      if (!wakeLockActive) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          wakeLockRef.current.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        } catch (err) {
          console.warn('Wake Lock error:', err);
        }
      } else {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
        setWakeLockActive(false);
      }
    }
  };

  // Switch to a new phase
  const transitionToPhase = useCallback((nextPhase: SequencePhase) => {
    const now = performance.now();
    phaseStartTimeRef.current = now;
    tenSecWarningFiredRef.current = false;
    lastCadenceTickRef.current = 0;

    const currentConf = configRef.current;
    let duration = 0;

    // Dispatch hardware trigger command (turning target motor & red/green lamps)
    hardwareTriggerService.dispatchPhase(nextPhase, currentConf.hardwareTriggers);

    switch (nextPhase) {
      case 'loading':
        duration = currentConf.prepTimeSeconds;
        soundEngine.speakCommand('LOAD', currentConf);
        break;

      case 'attention':
        duration = currentConf.randomizeAttention
          ? 3.0 + Math.random() * 4.0
          : currentConf.attentionDelaySeconds;
        soundEngine.speakCommand('ATTENTION', currentConf);
        break;

      case 'firing':
        duration = currentConf.firingTimeSeconds;
        soundEngine.playStartHorn();
        break;

      case 'stopped':
        duration = 3.5;
        soundEngine.playStopHorn();
        setTimeout(() => {
          soundEngine.speakCommand('STOP, UNLOAD, MAKE SAFE', currentConf);
        }, 600);
        break;

      case 'interval':
        duration = currentConf.intervalSeconds;
        setCompletedSeriesCount((prev) => prev + 1);
        break;

      case 'idle':
        duration = 0;
        break;
    }

    phaseTotalDurationRef.current = duration;
    setPhaseDuration(duration);
    setRemainingSeconds(duration);
    setElapsedInPhase(0);
    setPhase(nextPhase);
  }, []);

  // Main High-Precision Timer Ticker (runs every 40ms)
  useEffect(() => {
    if (!loopActive || isPaused || phase === 'idle') return;

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - phaseStartTimeRef.current) / 1000;
      const totalDur = phaseTotalDurationRef.current;
      const remaining = Math.max(0, totalDur - elapsed);

      setElapsedInPhase(elapsed);
      setRemainingSeconds(remaining);

      const curPhase = phaseRef.current;
      const curConf = configRef.current;

      // 1. Check for "10 SECONDS" warning during loading phase
      if (
        curPhase === 'loading' &&
        curConf.enableTenSecWarning &&
        curConf.prepTimeSeconds >= 20 &&
        !tenSecWarningFiredRef.current &&
        remaining <= 10.0
      ) {
        tenSecWarningFiredRef.current = true;
        soundEngine.speakCommand('TEN SECONDS', curConf);
      }

      // 2. Check for Cadence ticks during firing phase (every 2.0s)
      if (curPhase === 'firing' && curConf.enableCadenceTicks) {
        const nextTickTarget = Math.floor(elapsed / 2.0) * 2.0;
        if (nextTickTarget > lastCadenceTickRef.current && nextTickTarget <= 10.0 && nextTickTarget > 0) {
          lastCadenceTickRef.current = nextTickTarget;
          soundEngine.playCadenceTick();
        }
      }

      // 3. Phase Completion Transition
      if (remaining <= 0.05) {
        if (curPhase === 'loading') {
          transitionToPhase('attention');
        } else if (curPhase === 'attention') {
          transitionToPhase('firing');
        } else if (curPhase === 'firing') {
          transitionToPhase('stopped');
        } else if (curPhase === 'stopped') {
          if (
            curConf.totalSeriesTarget > 0 &&
            currentSeriesRef.current >= curConf.totalSeriesTarget
          ) {
            setCompletedSeriesCount((prev) => prev + 1);
            setLoopActive(false);
            setPhase('idle');
            soundEngine.speakCommand('MATCH COMPLETE, STAND DOWN', curConf);
          } else {
            transitionToPhase('interval');
          }
        } else if (curPhase === 'interval') {
          setCurrentSeries((prev) => prev + 1);
          transitionToPhase('loading');
        }
      }
    }, 40);

    return () => clearInterval(interval);
  }, [loopActive, isPaused, phase, transitionToPhase]);

  // Handle Start
  const handleStart = () => {
    soundEngine.getAudioContext();
    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }
    setLoopActive(true);
    setIsPaused(false);
    transitionToPhase('loading');
    toggleWakeLock();
  };

  // Handle Pause
  const handlePause = () => {
    setIsPaused(true);
  };

  // Handle Resume
  const handleResume = () => {
    phaseStartTimeRef.current = performance.now() - elapsedInPhase * 1000;
    setIsPaused(false);
  };

  // Handle Stop & Reset
  const handleStop = () => {
    setLoopActive(false);
    setIsPaused(false);
    setPhase('idle');
    setRemainingSeconds(10.0);
    setPhaseDuration(10.0);
    setElapsedInPhase(0);
    soundEngine.stopAll();
    hardwareTriggerService.dispatchPhase('idle', config.hardwareTriggers);
  };

  // Handle Skip Current Phase
  const handleSkipPhase = () => {
    if (!loopActive) return;
    if (phase === 'loading') {
      transitionToPhase('attention');
    } else if (phase === 'attention') {
      transitionToPhase('firing');
    } else if (phase === 'firing') {
      transitionToPhase('stopped');
    } else if (phase === 'stopped' || phase === 'interval') {
      setCurrentSeries((prev) => prev + 1);
      transitionToPhase('loading');
    }
  };

  // Apply Presets
  const handleApplyPreset = (mode: DisciplineMode) => {
    if (mode === 'nsra-10s') {
      setConfig((prev) => ({
        ...prev,
        prepTimeSeconds: 60,
        attentionDelaySeconds: 7.0,
        intervalSeconds: 30,
        randomizeAttention: false,
        enableTenSecWarning: true,
      }));
    } else if (mode === 'nsra-fast') {
      setConfig((prev) => ({
        ...prev,
        prepTimeSeconds: 30,
        attentionDelaySeconds: 7.0,
        intervalSeconds: 20,
        randomizeAttention: false,
        enableTenSecWarning: true,
      }));
    } else if (mode === 'issf-random') {
      setConfig((prev) => ({
        ...prev,
        prepTimeSeconds: 60,
        attentionDelaySeconds: 7.0,
        intervalSeconds: 30,
        randomizeAttention: true,
        enableTenSecWarning: true,
      }));
    } else if (mode === 'custom') {
      setConfig((prev) => ({
        ...prev,
        prepTimeSeconds: 15,
        attentionDelaySeconds: 7.0,
        intervalSeconds: 15,
        randomizeAttention: false,
        enableTenSecWarning: false,
      }));
    }
  };

  const totalShots = completedSeriesCount * 5;

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Bar following Top Bar Contract */}
      <RangeHeader
        onOpenExporter={() => setIsExporterOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSoundCheck={() => soundEngine.playSoundCheck()}
        onOpenHardware={() => setIsHardwareOpen(true)}
        isHardwareConnected={config.hardwareTriggers.isConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Discipline Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-emerald-400">NSRA &amp; ISSF Standard Pistol</span>
              <span aria-hidden="true">·</span>
              <span>10-Second Rapid Fire Series</span>
              <span aria-hidden="true">·</span>
              <span>5 Shots / Round</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Natural Human RO Voice</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Rapid Fire 10s Pistol Speaker Loop
            </h1>
          </div>

          {/* Quick Preset Selector Buttons (Interactive tabs) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => handleApplyPreset('nsra-10s')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                config.prepTimeSeconds === 60 && !config.randomizeAttention
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              NSRA Official (60s)
            </button>
            <button
              onClick={() => handleApplyPreset('nsra-fast')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                config.prepTimeSeconds === 30
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rapid Drill (30s)
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="More timer settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary 2-Column Responsive Dashboard Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Big Timer & Audio Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <TimerDisplay
              phase={phase}
              remainingSeconds={remainingSeconds}
              totalPhaseDuration={phaseDuration}
              currentSeries={currentSeries}
              totalSeriesTarget={config.totalSeriesTarget}
              loopActive={loopActive}
            />

            <AudioControls
              loopActive={loopActive}
              isPaused={isPaused}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onSkipPhase={handleSkipPhase}
              config={config}
              onUpdateConfig={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
              onSoundCheck={() => soundEngine.playSoundCheck()}
              wakeLockActive={wakeLockActive}
              onToggleWakeLock={toggleWakeLock}
            />
          </div>

          {/* Right Column: Target Visualizer & Range Status (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <TargetVisualizer
              phase={phase}
              elapsedInPhase={elapsedInPhase}
              phaseDuration={phaseDuration}
              cadenceTicksEnabled={config.enableCadenceTicks}
            />

            {/* Target Motor & Light Box Physical Status Card */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>Physical Target Motor &amp; Light Box</span>
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                  config.hardwareTriggers.isConnected 
                    ? 'text-emerald-400 bg-emerald-500/10' 
                    : config.hardwareTriggers.enabled
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-slate-500'
                }`}>
                  {config.hardwareTriggers.isConnected 
                    ? 'USB Hardware Online' 
                    : config.hardwareTriggers.enabled 
                    ? 'Triggers Active' 
                    : 'Hardware Standby'}
                </span>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between">
                <div>
                  <span className="text-slate-300 font-medium">Motor Position:</span>{' '}
                  <span className="font-mono text-white">{phase === 'firing' ? 'FACING (90°)' : 'EDGED (0°)'}</span>
                </div>
                <div>
                  <span className="text-slate-300 font-medium">Light Signal:</span>{' '}
                  <span className={`font-mono font-bold ${phase === 'firing' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {phase === 'firing' ? 'GREEN ON' : 'RED ON'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsHardwareOpen(true)}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-700"
              >
                <Cable className="w-3.5 h-3.5 text-amber-400" />
                <span>Configure Motor, Light Box &amp; Arduino Sketch</span>
              </button>
            </div>

            {/* Session Stats Card */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Practice Session Summary</span>
                </span>
                <span className="text-slate-500 font-mono">
                  {completedSeriesCount > 0 ? `${completedSeriesCount} Series Logged` : 'No series completed yet'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                    {completedSeriesCount}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Series Done</div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    {totalShots}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Total Shots</div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                    {Math.round((completedSeriesCount * (config.prepTimeSeconds + 7 + 10 + config.intervalSeconds)) / 60)}m
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Range Time</div>
                </div>
              </div>

              {/* Action: Open WAV exporter */}
              <button
                onClick={() => setIsExporterOpen(true)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-700"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export this sequence as .WAV file for range audio system</span>
              </button>
            </div>
          </div>
        </div>

        {/* Informational NSRA Discipline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Repeat className="w-4 h-4" />
              <span>1. Official Preparation (60s)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              NSRA rules mandate 1 full minute of loading time after the &quot;LOAD&quot; command. Shooters charge 5 rounds into magazine, assume stance, and receive a &quot;10 SECONDS&quot; standby call.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
              <Shield className="w-4 h-4" />
              <span>2. Attention &amp; 45° Ready (7.0s)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upon &quot;ATTENTION&quot;, targets edge away. Shooters lower pistol to 45 degrees below horizontal without touching the bench. After 7.0 seconds, green light turns on and horn sounds.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Target className="w-4 h-4" />
              <span>3. Firing &amp; Cease Fire (10.0s)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Shooters raise arm and fire 5 shots within 10.00s. At 10.0s (+0.2s turn allowance), double buzzer sounds and command &quot;STOP, UNLOAD, MAKE SAFE&quot; is issued immediately.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 px-6 bg-slate-950/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>NSRA Rapid Fire 10s Pistol Audio Engine</span>
            <span aria-hidden="true">·</span>
            <span>UK National Small-bore Rifle Association &amp; ISSF Standard Pistol Compliance</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsHardwareOpen(true)} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Motor &amp; Lights Interface</span>
            </button>
            <button onClick={() => setIsRulesOpen(true)} className="hover:text-slate-300 transition-colors cursor-pointer">
              Rules &amp; Safety Guide
            </button>
            <button onClick={() => setIsExporterOpen(true)} className="hover:text-slate-300 transition-colors cursor-pointer">
              Download .WAV File
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <WavExporterModal
        isOpen={isExporterOpen}
        onClose={() => setIsExporterOpen(false)}
        defaultPrepTime={config.prepTimeSeconds}
        defaultAttentionDelay={config.attentionDelaySeconds}
        currentStudioVoiceId={config.studioVoiceId}
      />

      <NsraRulesGuide
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateConfig={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
        onApplyPreset={handleApplyPreset}
      />

      <HardwareTriggerModal
        isOpen={isHardwareOpen}
        onClose={() => setIsHardwareOpen(false)}
        config={config.hardwareTriggers}
        onUpdateConfig={(hwUpdates) => setConfig((prev) => ({
          ...prev,
          hardwareTriggers: { ...prev.hardwareTriggers, ...hwUpdates },
        }))}
        currentPhase={phase}
      />
    </div>
  );
}
