/**
 * Outdoor Sound & Haptic Feedback Engine
 * Uses Web Audio API oscillator (0 external sound files, 100% offline)
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private enabled = true;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  setEnabled(val: boolean) {
    this.enabled = val;
  }

  private playTone(freq: number, durationMs: number, type: OscillatorType = 'sine', gainVal = 0.15) {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio autoplay policy may prevent playback before first interaction
    }
  }

  private vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored if vibration not permitted
      }
    }
  }

  playGPSLock() {
    this.playTone(587.33, 100, 'triangle', 0.2); // D5
    setTimeout(() => this.playTone(880, 200, 'triangle', 0.2), 120); // A5
    this.vibrate([80, 50, 80]);
  }

  playStart() {
    this.playTone(440, 100, 'sine', 0.2); // A4
    setTimeout(() => this.playTone(659.25, 100, 'sine', 0.2), 110); // E5
    setTimeout(() => this.playTone(880, 250, 'sine', 0.25), 220); // A5
    this.vibrate([100, 80, 200]);
  }

  playPause() {
    this.playTone(659.25, 120, 'sine', 0.2);
    setTimeout(() => this.playTone(440, 200, 'sine', 0.2), 130);
    this.vibrate(150);
  }

  playFinish() {
    this.playTone(523.25, 120, 'sine', 0.25); // C5
    setTimeout(() => this.playTone(659.25, 120, 'sine', 0.25), 130); // E5
    setTimeout(() => this.playTone(783.99, 120, 'sine', 0.25), 260); // G5
    setTimeout(() => this.playTone(1046.5, 350, 'sine', 0.3), 390); // C6
    this.vibrate([100, 60, 100, 60, 250]);
  }

  playWaypoint() {
    this.playTone(880, 80, 'square', 0.1);
    setTimeout(() => this.playTone(1174.66, 120, 'sine', 0.2), 90);
    this.vibrate(70);
  }
}

export const soundService = new SoundService();
