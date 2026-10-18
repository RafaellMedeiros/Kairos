import { Vibration } from 'react-native';

/**
 * Gera em memória um URI base64 de áudio WAV curto e discreto (bip senoidal suave de 880Hz, 180ms)
 * para uso offline garantido no alerta de transição de blocos do Pomodoro.
 */
function buildSoftBeepDataUri(): string {
  const sampleRate = 8000;
  const durationSeconds = 0.18;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const frequency = 880; // Lá (A5) suave

  const byteLength = 44 + numSamples;
  const buffer = new Uint8Array(byteLength);

  const writeAscii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) {
      buffer[offset + i] = text.charCodeAt(i);
    }
  };

  const writeUint32LE = (offset: number, value: number): void => {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >> 8) & 0xff;
    buffer[offset + 2] = (value >> 16) & 0xff;
    buffer[offset + 3] = (value >> 24) & 0xff;
  };

  const writeUint16LE = (offset: number, value: number): void => {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >> 8) & 0xff;
  };

  // Cabeçalho RIFF/WAV (8-bit PCM mono)
  writeAscii(0, 'RIFF');
  writeUint32LE(4, 36 + numSamples);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  writeUint32LE(16, 16); // Subchunk1Size (PCM)
  writeUint16LE(20, 1); // AudioFormat = 1 (PCM)
  writeUint16LE(22, 1); // NumChannels = 1
  writeUint32LE(24, sampleRate);
  writeUint32LE(28, sampleRate); // ByteRate
  writeUint16LE(32, 1); // BlockAlign
  writeUint16LE(34, 8); // BitsPerSample = 8
  writeAscii(36, 'data');
  writeUint32LE(40, numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin((Math.PI * i) / numSamples); // Fade-in / Fade-out suave
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope;
    buffer[44 + i] = Math.floor(128 + sample * 48);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  for (let i = 0; i < buffer.length; i += 3) {
    const b0 = buffer[i] ?? 0;
    const b1 = i + 1 < buffer.length ? (buffer[i + 1] ?? 0) : 0;
    const b2 = i + 2 < buffer.length ? (buffer[i + 2] ?? 0) : 0;

    const triplet = (b0 << 16) | (b1 << 8) | b2;
    base64 += chars[(triplet >> 18) & 0x3f];
    base64 += chars[(triplet >> 12) & 0x3f];
    base64 += i + 1 < buffer.length ? chars[(triplet >> 6) & 0x3f] : '=';
    base64 += i + 2 < buffer.length ? chars[triplet & 0x3f] : '=';
  }

  return `data:audio/wav;base64,${base64}`;
}

export const BEEP_DATA_URI = buildSoftBeepDataUri();

/**
 * Serviço de sinalização sonora e tátil discreta para transições do Pomodoro e alertas de limite.
 * Protegido contra ausência do módulo nativo legado ExponentAV no Expo Go (SDK 54+).
 */
export const audioService = {
  async playPomodoroCompleteAlert(): Promise<void> {
    try {
      Vibration.vibrate([0, 140, 80, 140]);
    } catch {
      // Ignora em plataformas sem motor de vibração
    }

    // Caso esteja rodando em Web, utiliza Web Audio API nativa para o bip suave
    try {
      if (typeof window !== 'undefined' && 'Audio' in window) {
        const htmlAudio = new window.Audio(BEEP_DATA_URI);
        htmlAudio.volume = 0.45;
        await htmlAudio.play();
      }
    } catch {
      // Falha silenciosa segura no Expo Go caso ExponentAV não esteja presente no binário
    }
  },
};
