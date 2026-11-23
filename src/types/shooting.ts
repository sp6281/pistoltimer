/**
 * Type definitions for NSRA 10s Rapid Fire Pistol Audio Loop & Timer
 */

export type DisciplineMode = 'nsra-10s' | 'nsra-fast' | 'issf-random' | 'custom';

export type SequencePhase = 
  | 'idle' 
  | 'loading' 
  | 'attention' 
  | 'firing' 
  | 'stopped' 
  | 'interval';

export type VoiceMode = 'studio-ai' | 'browser-speech' | 'synth-pa' | 'beeps-only';

export type HardwareProtocol = 'serial' | 'audio-pulse' | 'webhook';

export interface HardwareTriggerConfig {
  enabled: boolean;
  protocol: HardwareProtocol;
  baudRate: number;              // 9600 or 115200
  isConnected: boolean;
  portDescription: string;
  webhookUrl: string;
  audioSplitEnabled: boolean;    // Left = Audio/Voice, Right = Motor/Light pulse
  invertRelay: boolean;
  lastDispatchedCommand: string;
  targetMotorType: 'servo' | 'wiper-relay' | 'solenoid';
}

export interface StudioVoiceOption {
  id: string;
  name: string;
  desc: string;
}

export interface SequenceConfig {
  prepTimeSeconds: number;       // Official NSRA: 60s
  attentionDelaySeconds: number; // Official NSRA: 7.0s
  firingTimeSeconds: number;     // Official: 10.0s
  intervalSeconds: number;       // Rest between series in loop (e.g. 30s)
  enableTenSecWarning: boolean;  // "10 Seconds" call at t = prep - 10
  enableCadenceTicks: boolean;   // Subtle ticks at 2s intervals during 10s fire
  randomizeAttention: boolean;   // Random 3.0s - 7.0s delay (ISSF Rapid Fire)
  voiceMode: VoiceMode;          // Speech type: studio-ai (Gemini natural), browser-speech, synth-pa, beeps-only
  studioVoiceId: string;         // 'Fenrir' | 'Charon' | 'Puck' | 'Kore' | 'Zephyr'
  browserVoiceUri: string;       // Chosen system speech voice URI
  speechRate: number;            // 0.8 to 1.2
  speechPitch: number;           // 0.8 to 1.2
  volume: number;                // 0.0 - 1.0
  highGainBoost: boolean;        // +6dB boost for ear defenders
  totalSeriesTarget: number;     // 0 = infinite loop, or 4, 6, 12 series
  hardwareTriggers: HardwareTriggerConfig;
}

export interface SessionStats {
  completedSeries: number;
  totalShotsExpected: number;
  elapsedSeconds: number;
  startTime: number | null;
}

export interface WavExportOptions {
  seriesCount: number;           // 1 for single repeating track, or 4, 6, 12
  prepTimeSeconds: number;
  attentionDelaySeconds: number;
  firingTimeSeconds: number;
  intervalSeconds: number;
  enableTenSecWarning: boolean;
  enableCadenceTicks: boolean;
  voiceStyle: 'studio-ai' | 'pa-announcer' | 'tones-only';
  studioVoiceId?: string;
  includeAudioTriggerTrack?: boolean; // Stereo: Left = Voice/Horn, Right = Motor/Lights relay pulses
  studioAudioBuffers?: {
    load?: AudioBuffer;
    tenSec?: AudioBuffer;
    attention?: AudioBuffer;
    stopUnload?: AudioBuffer;
  };
}
