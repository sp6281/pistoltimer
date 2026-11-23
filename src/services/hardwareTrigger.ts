/**
 * Hardware Trigger Service
 * Manages physical target motor turning and red/green light box triggers via:
 * 1. Web Serial API (USB / Arduino / ESP32)
 * 2. WiFi / HTTP Webhook
 * 3. Stereo Audio-Pulse Relay Trigger
 */

import { SequencePhase, HardwareTriggerConfig } from '../types/shooting';

// Web Serial types definition
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  readable: ReadableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}

interface NavigatorWithSerial extends Navigator {
  serial?: {
    requestPort: (options?: unknown) => Promise<SerialPort>;
    getPorts: () => Promise<SerialPort[]>;
  };
}

class HardwareTriggerService {
  private activePort: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private isConnecting = false;

  public isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Connect to USB / Serial device (e.g., Arduino, ESP32, Relay board)
   */
  public async connectSerial(baudRate = 9600): Promise<{ success: boolean; error?: string; portDesc?: string }> {
    const nav = navigator as NavigatorWithSerial;
    if (!nav.serial) {
      return { success: false, error: 'Web Serial is not supported in this browser. Please use Chrome, Edge, or Opera.' };
    }

    if (this.activePort) {
      return { success: true, portDesc: 'Already connected' };
    }

    try {
      this.isConnecting = true;
      const port = await nav.serial.requestPort();
      await port.open({ baudRate });
      this.activePort = port;
      if (port.writable) {
        this.writer = port.writable.getWriter();
      }

      // Send initial handshake / ready command
      await this.sendCommand('STATUS:READY\nLIGHT:RED\nTARGET:EDGE\n');

      let portDesc = 'USB Serial Device';
      if (port.getInfo) {
        const info = port.getInfo();
        if (info.usbVendorId) {
          portDesc = `USB VID:0x${info.usbVendorId.toString(16).padStart(4, '0')}`;
        }
      }

      return { success: true, portDesc };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'User cancelled port selection';
      return { success: false, error: msg };
    } finally {
      this.isConnecting = false;
    }
  }

  public async disconnectSerial(): Promise<void> {
    try {
      if (this.writer) {
        await this.sendCommand('LIGHT:OFF\nTARGET:EDGE\n');
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.activePort) {
        await this.activePort.close();
        this.activePort = null;
      }
    } catch (err) {
      console.warn('Error closing serial port:', err);
    }
  }

  /**
   * Send ASCII command over Serial port
   */
  public async sendCommand(command: string): Promise<boolean> {
    if (!this.writer || !this.activePort) return false;
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(command.endsWith('\n') ? command : command + '\n');
      await this.writer.write(data);
      return true;
    } catch (err) {
      console.error('Serial send error:', err);
      return false;
    }
  }

  /**
   * Dispatch target motor and light commands according to shooting sequence phase
   */
  public async dispatchPhase(phase: SequencePhase, config: HardwareTriggerConfig): Promise<string> {
    if (!config.enabled) return 'Disabled';

    let command = '';
    let targetState = 'EDGE';
    let lightState = 'RED';

    switch (phase) {
      case 'loading':
      case 'attention':
        targetState = 'EDGE';
        lightState = 'RED';
        command = 'TARGET:EDGE\nLIGHT:RED';
        break;

      case 'firing':
        // Start of 10.0s window: targets rotate to face shooter, green light illuminates
        targetState = 'FACE';
        lightState = 'GREEN';
        command = 'TARGET:FACE\nLIGHT:GREEN';
        break;

      case 'stopped':
      case 'interval':
      case 'idle':
        targetState = 'EDGE';
        lightState = 'RED';
        command = 'TARGET:EDGE\nLIGHT:RED';
        break;
    }

    // 1. Serial Protocol
    if (config.protocol === 'serial' && this.writer) {
      await this.sendCommand(command);
    }

    // 2. HTTP Webhook Protocol (for WiFi ESP32 / Shelly / Raspberry Pi relay)
    if (config.protocol === 'webhook' && config.webhookUrl) {
      try {
        fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase,
            target: targetState,
            light: lightState,
            timestamp: Date.now(),
          }),
          mode: 'no-cors',
        }).catch((e) => console.warn('Webhook trigger error:', e));
      } catch (err) {
        console.warn('Webhook dispatch failed:', err);
      }
    }

    return `${targetState} · ${lightState}`;
  }

  /**
   * Arduino / ESP32 complete firmware sketch code
   */
  public getArduinoFirmwareCode(): string {
    return `/*
 * NSRA Rapid Fire Pistol Target Motor & Light Box Controller
 * Responds to commands from the NSRA RapidFire Web App via Serial (USB/Bluetooth)
 *
 * Pin assignments:
 * Pin 8  -> Relay 1 / Transistor: Green Light (12V)
 * Pin 9  -> Relay 2 / Transistor: Red Light (12V)
 * Pin 10 -> Relay 3 / Motor Driver / Solenoid: Turning Target Motor
 * (Or Pin 11 -> Servo Motor Signal for 180-degree servo turning mechanism)
 */

#include <Servo.h>

const int PIN_GREEN_LIGHT = 8;
const int PIN_RED_LIGHT   = 9;
const int PIN_MOTOR_RELAY = 10;
const int PIN_SERVO       = 11;

Servo targetServo;
bool useServo = true; // Set to false if using 12V wiper motor / relay

// Servo angle configuration
const int ANGLE_EDGE = 0;    // Target edge-on (invisible)
const int ANGLE_FACE = 90;   // Target face-on to shooter

String inputBuffer = "";

void setup() {
  Serial.begin(9600);
  
  pinMode(PIN_GREEN_LIGHT, OUTPUT);
  pinMode(PIN_RED_LIGHT, OUTPUT);
  pinMode(PIN_MOTOR_RELAY, OUTPUT);

  if (useServo) {
    targetServo.attach(PIN_SERVO);
    targetServo.write(ANGLE_EDGE);
  }

  // Initial state: Red light ON, Target EDGED
  setTargetEdge();
  setLightRed();

  Serial.println("NSRA Target Controller Ready");
}

void loop() {
  while (Serial.available() > 0) {
    char inChar = (char)Serial.read();
    if (inChar == '\\n' || inChar == '\\r') {
      if (inputBuffer.length() > 0) {
        processCommand(inputBuffer);
        inputBuffer = "";
      }
    } else {
      inputBuffer += inChar;
    }
  }
}

void processCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "TARGET:FACE") {
    setTargetFace();
    Serial.println("ACK:TARGET_FACING");
  } else if (cmd == "TARGET:EDGE") {
    setTargetEdge();
    Serial.println("ACK:TARGET_EDGED");
  } else if (cmd == "LIGHT:GREEN") {
    setLightGreen();
    Serial.println("ACK:LIGHT_GREEN");
  } else if (cmd == "LIGHT:RED") {
    setLightRed();
    Serial.println("ACK:LIGHT_RED");
  } else if (cmd == "LIGHT:OFF") {
    digitalWrite(PIN_GREEN_LIGHT, LOW);
    digitalWrite(PIN_RED_LIGHT, LOW);
  } else if (cmd == "STATUS:READY") {
    setLightRed();
    setTargetEdge();
    Serial.println("ACK:READY");
  }
}

void setTargetFace() {
  if (useServo) {
    targetServo.write(ANGLE_FACE);
  } else {
    // 12V motor or solenoid pull
    digitalWrite(PIN_MOTOR_RELAY, HIGH);
  }
}

void setTargetEdge() {
  if (useServo) {
    targetServo.write(ANGLE_EDGE);
  } else {
    digitalWrite(PIN_MOTOR_RELAY, LOW);
  }
}

void setLightGreen() {
  digitalWrite(PIN_RED_LIGHT, LOW);
  digitalWrite(PIN_GREEN_LIGHT, HIGH);
}

void setLightRed() {
  digitalWrite(PIN_GREEN_LIGHT, LOW);
  digitalWrite(PIN_RED_LIGHT, HIGH);
}
`;
  }
}

export const hardwareTriggerService = new HardwareTriggerService();
