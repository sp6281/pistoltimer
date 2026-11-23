/**
 * Audio Engine for NSRA Rapid Fire Pistol Timer & WAV Generator
 * Features Natural Studio Audio, Speech Synthesis, Hardware Audio Triggers, and 16-bit 44.1kHz WAV encoding.
 */

import { VoiceMode, WavExportOptions, SequenceConfig } from '../types/shooting';

const COMMAND_FILE_MAP: Record<string, string> = {
  'LOAD': '/audio/load.wav',
  'TEN SECONDS': '/audio/ten_sec.wav',
  'ATTENTION': '/audio/attention.wav',
  'STOP, UNLOAD, MAKE SAFE': '/audio/stop_unload.wav',
  'MATCH COMPLETE, STAND DOWN': '/audio/match_complete.wav',
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;

  // Hardware audio-pulse trigger nodes
  private triggerOsc: OscillatorNode | null = null;
  private triggerGain: GainNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;
  
  // Natural Studio AI Audio Buffer cache
  private studioAudioBuffers: Map<string, AudioBuffer> = new Map();
  private pendingFetches: Map<string, Promise<AudioBuffer | null>> = new Map();

  // Browser speech synthesis state
  private availableBrowserVoices: SpeechSynthesisVoice[] = [];
  private selectedBrowserVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        this.availableBrowserVoices = window.speechSynthesis.getVoices();
        if (!this.selectedBrowserVoice) {
          this.selectedBrowserVoice = 
            this.availableBrowserVoices.find(v => (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Enhanced')) && (v.lang.includes('en-GB') || v.lang.includes('en_GB')))
            || this.availableBrowserVoices.find(v => v.lang.includes('en-GB') || v.lang.includes('en_GB'))
            || this.availableBrowserVoices.find(v => v.lang.startsWith('en'))
            || this.availableBrowserVoices[0] 
            || null;
        }
      };
      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }

  public getBrowserVoices(): SpeechSynthesisVoice[] {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.availableBrowserVoices.length === 0) {
      this.availableBrowserVoices = window.speechSynthesis.getVoices();
    }
    return this.availableBrowserVoices;
  }

  public setBrowserVoice(voiceUri: string) {
    const found = this.availableBrowserVoices.find(v => v.voiceURI === voiceUri);
    if (found) {
      this.selectedBrowserVoice = found;
    }
  }

  public getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass({ sampleRate: 44100 });
      
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      try {
        this.keepAliveOsc = this.ctx.createOscillator();
        this.keepAliveGain = this.ctx.createGain();
        this.keepAliveGain.gain.value = 0.0001;
        this.keepAliveOsc.frequency.value = 40;
        this.keepAliveOsc.connect(this.keepAliveGain);
        this.keepAliveGain.connect(this.ctx.destination);
        this.keepAliveOsc.start();
      } catch (e) {
        console.warn('Keepalive oscillator notice:', e);
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public setVolume(volume: number, highGainBoost: boolean) {
    if (!this.masterGain || !this.ctx) return;
    const finalGain = highGainBoost ? Math.min(1.5, volume * 1.4) : volume;
    this.masterGain.gain.setValueAtTime(finalGain, this.ctx.currentTime);
  }

  /**
   * Preload Natural Studio Audio clips into memory
   */
  public async preloadStudioVoices(voiceId = 'Fenrir'): Promise<void> {
    const commands = ['LOAD', 'TEN SECONDS', 'ATTENTION', 'STOP, UNLOAD, MAKE SAFE'];
    for (const cmd of commands) {
      await this.fetchStudioAudio(cmd, voiceId);
    }
  }

  /**
   * Fetch Natural Studio Voice clip with guaranteed direct audio fallback
   */
  public async fetchStudioAudio(text: string, voiceId = 'Fenrir'): Promise<AudioBuffer | null> {
    const cleanCmd = text.trim().toUpperCase();
    const cacheKey = `${voiceId}:${cleanCmd}`;
    if (this.studioAudioBuffers.has(cacheKey)) {
      return this.studioAudioBuffers.get(cacheKey)!;
    }
    if (this.pendingFetches.has(cacheKey)) {
      return this.pendingFetches.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      const ctx = this.getAudioContext();

      // 1. Try static natural audio file first (instant, reliable, no quota)
      const staticUrl = COMMAND_FILE_MAP[cleanCmd];
      if (staticUrl) {
        try {
          const resp = await fetch(staticUrl);
          if (resp.ok) {
            const arrayBuf = await resp.arrayBuffer();
            const decoded = await ctx.decodeAudioData(arrayBuf);
            this.studioAudioBuffers.set(cacheKey, decoded);
            return decoded;
          }
        } catch (err) {
          console.warn(`Direct fetch from ${staticUrl} failed, trying API route:`, err);
        }
      }

      // 2. Fallback to API route /api/tts
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanCmd, voice: voiceId }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.audioBase64) {
            const binaryStr = atob(data.audioBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
            this.studioAudioBuffers.set(cacheKey, audioBuffer);
            return audioBuffer;
          }
        }
      } catch (err) {
        console.warn('API route audio fetch failed:', err);
      }

      return null;
    })();

    this.pendingFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  public getCachedStudioBuffer(text: string, voiceId = 'Fenrir'): AudioBuffer | undefined {
    const key = `${voiceId}:${text.trim().toUpperCase()}`;
    return this.studioAudioBuffers.get(key);
  }

  /**
   * Play official piercing Start Horn (1000Hz + 1250Hz dual harmonic, 0.35s)
   */
  public playStartHorn(volumeMultiplier = 1.0) {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const hornGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(1000, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1250, now);

    hornGain.gain.setValueAtTime(0, now);
    hornGain.gain.linearRampToValueAtTime(0.7 * volumeMultiplier, now + 0.015);
    hornGain.gain.setValueAtTime(0.7 * volumeMultiplier, now + 0.28);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(hornGain);
    osc2.connect(hornGain);
    hornGain.connect(this.masterGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  /**
   * Play official Stop Buzzer / Horn (650Hz dual pulse, 0.5s)
   */
  public playStopHorn(volumeMultiplier = 1.0) {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const playPulse = (startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const pulseGain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(650, now + startOffset);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now + startOffset);

      pulseGain.gain.setValueAtTime(0, now + startOffset);
      pulseGain.gain.linearRampToValueAtTime(0.65 * volumeMultiplier, now + startOffset + 0.01);
      pulseGain.gain.setValueAtTime(0.65 * volumeMultiplier, now + startOffset + duration - 0.02);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

      osc.connect(filter);
      filter.connect(pulseGain);
      pulseGain.connect(this.masterGain!);

      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    playPulse(0, 0.16);
    playPulse(0.22, 0.26);
  }

  /**
   * Play subtle cadence pacer tick
   */
  public playCadenceTick() {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Spoken commands for live speaker loop
   */
  public async speakCommand(text: string, config: SequenceConfig) {
    const { voiceMode, studioVoiceId, browserVoiceUri, speechRate, speechPitch } = config;

    if (voiceMode === 'beeps-only') return;

    // 1. Natural Studio Voice
    if (voiceMode === 'studio-ai') {
      const ctx = this.getAudioContext();
      let buffer = this.getCachedStudioBuffer(text, studioVoiceId);
      if (!buffer) {
        buffer = (await this.fetchStudioAudio(text, studioVoiceId)) || undefined;
      }

      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.masterGain!);
        source.start();
        return;
      }
    }

    // 2. Synthesized PA Megaphone Chime
    if (voiceMode === 'synth-pa') {
      this.playSynthPaAnnouncement(text);
      return;
    }

    // 3. Browser Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (browserVoiceUri) {
        const found = this.availableBrowserVoices.find(v => v.voiceURI === browserVoiceUri);
        if (found) utterance.voice = found;
      } else if (this.selectedBrowserVoice) {
        utterance.voice = this.selectedBrowserVoice;
      }

      utterance.rate = speechRate || 0.95;
      utterance.pitch = speechPitch || 0.9;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      this.playSynthPaAnnouncement(text);
    }
  }

  public playSynthPaAnnouncement(text: string) {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.frequency.setValueAtTime(587.33, now);
    chime.frequency.setValueAtTime(880, now + 0.08);
    chimeGain.gain.setValueAtTime(0, now);
    chimeGain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    chime.connect(chimeGain);
    chimeGain.connect(this.masterGain!);
    chime.start(now);
    chime.stop(now + 0.3);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.selectedBrowserVoice) utterance.voice = this.selectedBrowserVoice;
        utterance.rate = 1.0;
        utterance.pitch = 0.95;
        window.speechSynthesis.speak(utterance);
      }, 150);
    }
  }

  public playSoundCheck() {
    this.playStartHorn(0.8);
    setTimeout(() => {
      this.playStopHorn(0.8);
    }, 500);
  }

  public stopAll() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundEngine = new SoundEngine();

// ============================================================================
// OFFLINE WAV FILE GENERATOR (44.1 kHz, 16-bit PCM RIFF) - MONO & STEREO
// ============================================================================

export function encodeWavBlob(
  samplesLeft: Float32Array,
  samplesRight?: Float32Array,
  sampleRate = 44100
): Blob {
  const isStereo = !!samplesRight;
  const numChannels = isStereo ? 2 : 1;
  const numFrames = samplesLeft.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  if (!isStereo) {
    // Mono
    for (let i = 0; i < numFrames; i++) {
      const s = Math.max(-1, Math.min(1, samplesLeft[i]));
      const val = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, val, true);
      offset += 2;
    }
  } else {
    // Stereo Interleaved: Left (PA Audio), Right (Hardware Relay Trigger Tone)
    for (let i = 0; i < numFrames; i++) {
      // Channel 0 (Left)
      const sL = Math.max(-1, Math.min(1, samplesLeft[i]));
      const valL = sL < 0 ? sL * 0x8000 : sL * 0x7fff;
      view.setInt16(offset, valL, true);
      offset += 2;

      // Channel 1 (Right)
      const sR = Math.max(-1, Math.min(1, samplesRight![i]));
      const valR = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
      view.setInt16(offset, valR, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function mixAudioBufferIntoOutput(
  destBuffer: Float32Array,
  sourceAudioBuffer: AudioBuffer,
  destStartSample: number,
  destSampleRate: number,
  volumeScale = 0.95
) {
  const srcChannel = sourceAudioBuffer.getChannelData(0);
  const srcRate = sourceAudioBuffer.sampleRate;
  const ratio = srcRate / destSampleRate;
  const destLength = Math.floor(sourceAudioBuffer.duration * destSampleRate);

  for (let i = 0; i < destLength; i++) {
    const destIdx = destStartSample + i;
    if (destIdx >= destBuffer.length) break;

    const srcPos = i * ratio;
    const srcIndexInt = Math.floor(srcPos);
    const frac = srcPos - srcIndexInt;

    if (srcIndexInt < srcChannel.length - 1) {
      const s0 = srcChannel[srcIndexInt];
      const s1 = srcChannel[srcIndexInt + 1];
      const interpolated = s0 + frac * (s1 - s0);
      destBuffer[destIdx] += interpolated * volumeScale;
    } else if (srcIndexInt < srcChannel.length) {
      destBuffer[destIdx] += srcChannel[srcIndexInt] * volumeScale;
    }
  }
}

/**
 * Generates an uncompressed high-fidelity WAV file according to NSRA pistol rules
 * Supports optional Dual-Channel Hardware Trigger track on Right channel
 */
export async function generateShootingWavFile(options: WavExportOptions): Promise<{ blob: Blob; durationSeconds: number }> {
  const sampleRate = 44100;
  const {
    seriesCount,
    prepTimeSeconds,
    attentionDelaySeconds,
    firingTimeSeconds,
    intervalSeconds,
    enableTenSecWarning,
    enableCadenceTicks,
    voiceStyle,
    studioVoiceId = 'Fenrir',
    includeAudioTriggerTrack = false,
  } = options;

  let studioBuffers: {
    load?: AudioBuffer;
    tenSec?: AudioBuffer;
    attention?: AudioBuffer;
    stopUnload?: AudioBuffer;
  } = {};

  if (voiceStyle !== 'tones-only') {
    const [loadBuf, tenSecBuf, attBuf, stopBuf] = await Promise.all([
      soundEngine.fetchStudioAudio('LOAD', studioVoiceId),
      enableTenSecWarning ? soundEngine.fetchStudioAudio('TEN SECONDS', studioVoiceId) : Promise.resolve(null),
      soundEngine.fetchStudioAudio('ATTENTION', studioVoiceId),
      soundEngine.fetchStudioAudio('STOP, UNLOAD, MAKE SAFE', studioVoiceId),
    ]);

    studioBuffers = {
      load: loadBuf || undefined,
      tenSec: tenSecBuf || undefined,
      attention: attBuf || undefined,
      stopUnload: stopBuf || undefined,
    };
  }

  const stopCommandDuration = 3.5;
  const singleSeriesDuration = prepTimeSeconds + attentionDelaySeconds + firingTimeSeconds + stopCommandDuration + (seriesCount > 1 ? intervalSeconds : 3.0);
  const totalDuration = singleSeriesDuration * seriesCount;
  const totalSamples = Math.ceil(totalDuration * sampleRate);

  const bufferLeft = new Float32Array(totalSamples);
  const bufferRight = includeAudioTriggerTrack ? new Float32Array(totalSamples) : undefined;

  const renderStartHorn = (startSample: number) => {
    const hornDuration = 0.35;
    const hornSamples = Math.floor(hornDuration * sampleRate);
    for (let i = 0; i < hornSamples; i++) {
      const idx = startSample + i;
      if (idx >= bufferLeft.length) break;
      const t = i / sampleRate;
      const wave1 = 2 * ((t * 1000) % 1) - 1;
      const wave2 = Math.sin(2 * Math.PI * 1250 * t);
      const attack = Math.min(1, t / 0.015);
      const decay = t > 0.25 ? Math.exp(-(t - 0.25) * 25) : 1.0;
      bufferLeft[idx] += 0.65 * (0.6 * wave1 + 0.4 * wave2) * attack * decay;
    }
  };

  const renderStopHorn = (startSample: number) => {
    const renderPulse = (pulseOffsetSample: number, durationSec: number) => {
      const pulseSamples = Math.floor(durationSec * sampleRate);
      for (let i = 0; i < pulseSamples; i++) {
        const idx = pulseOffsetSample + i;
        if (idx >= bufferLeft.length) break;
        const t = i / sampleRate;
        const wave = Math.sin(2 * Math.PI * 650 * t) > 0 ? 1 : -1;
        const attack = Math.min(1, t / 0.01);
        const decay = Math.min(1, (durationSec - t) / 0.02);
        bufferLeft[idx] += 0.55 * wave * attack * decay;
      }
    };
    renderPulse(startSample, 0.16);
    renderPulse(startSample + Math.floor(sampleRate * 0.22), 0.26);
  };

  const renderTick = (tickSample: number) => {
    const tickLen = Math.floor(sampleRate * 0.04);
    for (let i = 0; i < tickLen; i++) {
      const idx = tickSample + i;
      if (idx >= bufferLeft.length) break;
      const t = i / sampleRate;
      bufferLeft[idx] += 0.2 * Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 100);
    }
  };

  for (let s = 0; s < seriesCount; s++) {
    const seriesBaseTime = s * singleSeriesDuration;
    const seriesBaseSample = Math.floor(seriesBaseTime * sampleRate);

    // 1. "LOAD"
    if (studioBuffers.load) {
      mixAudioBufferIntoOutput(bufferLeft, studioBuffers.load, seriesBaseSample, sampleRate);
    }

    // 2. "10 SECONDS"
    if (enableTenSecWarning && prepTimeSeconds >= 20 && studioBuffers.tenSec) {
      const tenSecSample = seriesBaseSample + Math.floor((prepTimeSeconds - 10) * sampleRate);
      mixAudioBufferIntoOutput(bufferLeft, studioBuffers.tenSec, tenSecSample, sampleRate);
    }

    // 3. "ATTENTION"
    const attentionSample = seriesBaseSample + Math.floor(prepTimeSeconds * sampleRate);
    if (studioBuffers.attention) {
      mixAudioBufferIntoOutput(bufferLeft, studioBuffers.attention, attentionSample, sampleRate);
    } else {
      renderTick(attentionSample);
    }

    // 4. START HORN
    const startHornSample = attentionSample + Math.floor(attentionDelaySeconds * sampleRate);
    renderStartHorn(startHornSample);

    // 5. Cadence ticks
    if (enableCadenceTicks) {
      for (let shot = 1; shot <= 5; shot++) {
        const shotSample = startHornSample + Math.floor((shot * 2.0) * sampleRate);
        renderTick(shotSample);
      }
    }

    // 6. STOP HORN
    const stopHornSample = startHornSample + Math.floor(firingTimeSeconds * sampleRate);
    renderStopHorn(stopHornSample);

    // 7. "STOP. UNLOAD. MAKE SAFE."
    const stopCommandSample = stopHornSample + Math.floor(sampleRate * 0.7);
    if (studioBuffers.stopUnload) {
      mixAudioBufferIntoOutput(bufferLeft, studioBuffers.stopUnload, stopCommandSample, sampleRate);
    }

    // 8. Hardware Audio Trigger Track on Right Channel
    // When includeAudioTriggerTrack is enabled:
    // From startHornSample to stopHornSample (exactly 10.0s): emit 1000Hz continuous trigger tone
    if (bufferRight) {
      const fireStartSample = startHornSample;
      const fireEndSample = stopHornSample;
      const fireDurationSamples = fireEndSample - fireStartSample;
      for (let i = 0; i < fireDurationSamples; i++) {
        const idx = fireStartSample + i;
        if (idx >= bufferRight.length) break;
        const t = i / sampleRate;
        // Clean 1 kHz sine tone at 0.9 amplitude (triggers audio relay module instantly)
        bufferRight[idx] = 0.9 * Math.sin(2 * Math.PI * 1000 * t);
      }
    }
  }

  // Peak normalization on Left channel
  let maxPeak = 0;
  for (let i = 0; i < bufferLeft.length; i++) {
    const abs = Math.abs(bufferLeft[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  if (maxPeak > 0.95) {
    const scale = 0.95 / maxPeak;
    for (let i = 0; i < bufferLeft.length; i++) {
      bufferLeft[i] *= scale;
    }
  }

  const blob = encodeWavBlob(bufferLeft, bufferRight, sampleRate);
  return { blob, durationSeconds: totalDuration };
}
