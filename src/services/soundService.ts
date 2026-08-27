import { SoundType } from '../types/alerts';

export class SoundService {
  private static audioCtx: AudioContext | null = null;

  private static getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Play distinct synthesized alert tone
   */
  public static play(soundType: SoundType, volume: number = 0.7): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0.05, Math.min(1.0, volume)), now);
      masterGain.connect(ctx.destination);

      switch (soundType) {
        case 'BUY_CHIME':
          this.playBuyChime(ctx, masterGain, now);
          break;
        case 'SELL_CHIME':
          this.playSellChime(ctx, masterGain, now);
          break;
        case 'TP_VICTORY':
          this.playTPVictory(ctx, masterGain, now);
          break;
        case 'SL_WARNING':
          this.playSLWarning(ctx, masterGain, now);
          break;
      }
    } catch (err) {
      console.warn('[SoundService] Audio playback skipped:', err);
    }
  }

  /**
   * Ascending melodic arpeggio for BUY signal (C5 -> E5 -> G5 -> C6)
   */
  private static playBuyChime(ctx: AudioContext, gainNode: GainNode, now: number): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const start = now + idx * 0.09;
      const duration = 0.28;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      noteGain.gain.setValueAtTime(0, start);
      noteGain.gain.linearRampToValueAtTime(0.35, start + 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.start(start);
      osc.stop(start + duration);
    });
  }

  /**
   * Descending warning tone for SELL signal (A5 -> F5 -> D5 -> B4)
   */
  private static playSellChime(ctx: AudioContext, gainNode: GainNode, now: number): void {
    const notes = [880.0, 698.46, 587.33, 493.88]; // A5, F5, D5, B4
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const start = now + idx * 0.09;
      const duration = 0.26;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      noteGain.gain.setValueAtTime(0, start);
      noteGain.gain.linearRampToValueAtTime(0.4, start + 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.start(start);
      osc.stop(start + duration);
    });
  }

  /**
   * Bright celebration fanfare when TP is hit (G5 -> C6 -> E6 -> G6)
   */
  private static playTPVictory(ctx: AudioContext, gainNode: GainNode, now: number): void {
    const notes = [783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const start = now + idx * 0.12;
      const duration = idx === notes.length - 1 ? 0.6 : 0.22;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      noteGain.gain.setValueAtTime(0, start);
      noteGain.gain.linearRampToValueAtTime(0.45, start + 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.start(start);
      osc.stop(start + duration);
    });
  }

  /**
   * Rapid warning alarm buzzer for SL hit
   */
  private static playSLWarning(ctx: AudioContext, gainNode: GainNode, now: number): void {
    [0, 0.18, 0.36].forEach((offset) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const start = now + offset;
      const duration = 0.12;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, start);
      osc.frequency.exponentialRampToValueAtTime(220, start + duration);

      noteGain.gain.setValueAtTime(0.4, start);
      noteGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.start(start);
      osc.stop(start + duration);
    });
  }
}
