import React, { useState } from 'react';
import { X, Cpu, Cable, Radio, CheckCircle2, AlertCircle, Copy, Check, Play, RefreshCw, Zap, Wrench, Lightbulb } from 'lucide-react';
import { HardwareTriggerConfig, SequencePhase } from '../types/shooting';
import { hardwareTriggerService } from '../services/hardwareTrigger';

interface HardwareTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: HardwareTriggerConfig;
  onUpdateConfig: (newConfig: Partial<HardwareTriggerConfig>) => void;
  currentPhase: SequencePhase;
}

export const HardwareTriggerModal: React.FC<HardwareTriggerModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  currentPhase,
}) => {
  const [activeTab, setActiveTab] = useState<'serial' | 'audio-pulse' | 'arduino-code' | 'wiring'>('serial');
  const [copiedCode, setCopiedCode] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSerialSupported = hardwareTriggerService.isWebSerialSupported();

  const handleConnectSerial = async () => {
    setConnecting(true);
    setSerialError(null);
    try {
      const res = await hardwareTriggerService.connectSerial(config.baudRate);
      if (res.success) {
        onUpdateConfig({
          isConnected: true,
          portDescription: res.portDesc || 'USB Device Connected',
        });
      } else {
        setSerialError(res.error || 'Connection failed');
        onUpdateConfig({ isConnected: false });
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectSerial = async () => {
    await hardwareTriggerService.disconnectSerial();
    onUpdateConfig({ isConnected: false, portDescription: '' });
  };

  const handleManualCommand = async (cmd: string, label: string) => {
    setTestStatus(`Sent: ${label}`);
    await hardwareTriggerService.sendCommand(cmd);
    setTimeout(() => setTestStatus(null), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(hardwareTriggerService.getArduinoFirmwareCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Target Motor &amp; Light Box Hardware Interface</h2>
              <p className="text-xs text-slate-400">
                Trigger physical turning targets and red/green match lamps at the exact 10.0s marks
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

        {/* Master Toggle Banner */}
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Enable Hardware Triggers During Live Sequence</span>
            </div>
            <div className="text-xs text-slate-400">
              Sends automatic Face/Edge motor commands and Red/Green light triggers synchronously with the timer
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onUpdateConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
          </label>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('serial')}
            className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'serial'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            <span>USB / Arduino Serial</span>
          </button>

          <button
            onClick={() => setActiveTab('audio-pulse')}
            className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'audio-pulse'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Stereo Audio Split Trigger (No Coding)</span>
          </button>

          <button
            onClick={() => setActiveTab('wiring')}
            className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'wiring'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Wiring &amp; Motors</span>
          </button>

          <button
            onClick={() => setActiveTab('arduino-code')}
            className={`py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'arduino-code'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Arduino Sketch (.ino)</span>
          </button>
        </div>

        {/* TAB 1: USB / Arduino Serial */}
        {activeTab === 'serial' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Direct USB / Serial Connection</div>
                  <div className="text-xs text-slate-400">
                    Connects directly from your laptop or phone via USB-C or Bluetooth Serial to an Arduino Uno/Nano or ESP32
                  </div>
                </div>

                {!config.isConnected ? (
                  <button
                    onClick={handleConnectSerial}
                    disabled={connecting || !isSerialSupported}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <Cable className="w-4 h-4" />
                    <span>{connecting ? 'Connecting...' : 'Connect USB Port'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnectSerial}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Disconnect ({config.portDescription})</span>
                  </button>
                )}
              </div>

              {!isSerialSupported && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    Web Serial API is supported in Google Chrome, Microsoft Edge, and Opera on Windows, Mac, Linux, and Android. For other devices, use the <strong>Stereo Audio Split Trigger</strong> tab below!
                  </div>
                </div>
              )}

              {serialError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                  {serialError}
                </div>
              )}

              {config.isConnected && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hardware is online and listening. Current status: Targets {currentPhase === 'firing' ? 'FACING' : 'EDGED'}, Light {currentPhase === 'firing' ? 'GREEN' : 'RED'}</span>
                </div>
              )}
            </div>

            {/* Manual Test Bench */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Target Mechanism Manual Test Bench:</span>
                {testStatus && <span className="text-xs text-emerald-400 font-mono">{testStatus}</span>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleManualCommand('TARGET:FACE\nLIGHT:GREEN', 'Face Target & Green Light')}
                  className="p-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer"
                >
                  Face Target (90°) &amp; Green
                </button>

                <button
                  onClick={() => handleManualCommand('TARGET:EDGE\nLIGHT:RED', 'Edge Target & Red Light')}
                  className="p-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer"
                >
                  Edge Target (0°) &amp; Red
                </button>

                <button
                  onClick={() => handleManualCommand('LIGHT:GREEN', 'Green Light Only')}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 text-xs font-medium rounded-xl text-center transition-colors cursor-pointer"
                >
                  Green Light ON
                </button>

                <button
                  onClick={() => handleManualCommand('LIGHT:RED', 'Red Light Only')}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 text-xs font-medium rounded-xl text-center transition-colors cursor-pointer"
                >
                  Red Light ON
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Stereo Audio-Pulse Split Trigger */}
        {activeTab === 'audio-pulse' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>The &quot;Zero-Coding&quot; 3.5mm Audio Split Method</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.audioSplitEnabled}
                    onChange={(e) => onUpdateConfig({ audioSplitEnabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span>Enable in Live Playback</span>
                </label>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                This is the easiest, most robust method used by shooting clubs worldwide. You use a standard <strong>$2 headphone 3.5mm splitter cable</strong> (stereo into dual mono Left &amp; Right):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-emerald-400">Channel 1 (Left Channel):</div>
                  <div className="text-xs text-slate-300">Carries Voice &amp; Competition Horns</div>
                  <div className="text-[11px] text-slate-500">
                    Plug directly into your PA speaker, boombox, or megaphone amplifier at the firing line.
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-amber-400">Channel 2 (Right Channel):</div>
                  <div className="text-xs text-slate-300">Carries Hardware Relay Trigger Pulse</div>
                  <div className="text-[11px] text-slate-500">
                    Emits a 1 kHz tone pulse during the exact 10.0s firing period. Plug into a $4 audio-triggered relay switch (VOX relay) to activate the motor and green light!
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1 text-emerald-300">
                <div className="font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Available in the Downloadable .WAV File as well!</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  When exporting your .WAV audio file, check &quot;Include Hardware Trigger Track&quot;. You can put the WAV file on an iPod, old smartphone, or USB stick, and it will control the target motor and lights automatically with no laptop needed!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Wiring & Motors */}
        {activeTab === 'wiring' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>How to Build the Target &amp; Light Box (Bill of Materials)</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-semibold text-white">1. Motor Selection for 90° Target Turn:</div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li>
                      <strong className="text-slate-200">High-Torque 180° Metal Servo (Recommended):</strong> E.g. RDS3115 or 25kg digital servo ($12). Connects directly to Arduino pin 11. Moves from 0° (Edge) to 90° (Face) in under 0.15s, perfectly matching the NSRA 0.2s turn rule.
                    </li>
                    <li>
                      <strong className="text-slate-200">12V Windshield Wiper Motor:</strong> Plentiful from auto parts/eBay. Connect through a dual relay module with two microswitches (Limit Switch Face &amp; Limit Switch Edge).
                    </li>
                    <li>
                      <strong className="text-slate-200">Pneumatic Air Cylinder:</strong> Used on competition ranges with a 12V 5/2 solenoid valve.
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-semibold text-white">2. Red &amp; Green Light Box:</div>
                  <p className="text-slate-400">
                    Two 12V LED automotive indicator clusters or high-brightness trailer lights (Red &amp; Green). Driven by a 2-channel relay board or two N-channel MOSFETs (IRFZ44N / TIP120) switched by Arduino pins 8 and 9.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-semibold text-white">3. Electrical Pinout Table:</div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 text-emerald-400">Pin 8: Green Light Relay</div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 text-rose-400">Pin 9: Red Light Relay</div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 text-amber-400">Pin 10/11: Motor / Servo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Arduino Sketch Code */}
        {activeTab === 'arduino-code' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Ready-to-flash Arduino Uno / Nano / ESP32 C++ Sketch:</span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Arduino Code'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed select-all">
              {hardwareTriggerService.getArduinoFirmwareCode()}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
