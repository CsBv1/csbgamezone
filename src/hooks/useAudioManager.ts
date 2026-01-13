import { useEffect, useRef, useCallback } from 'react';
import backgroundMusicFile from '@/assets/background-music.mp3';

// Audio configuration - adjust volumes here only
const AUDIO_CONFIG = {
  backgroundMusicVolume: 0.15, // Low-medium for ambient feel
  sfxVolume: 0.35, // Slightly higher for game feedback
  masterVolume: 0.7,
};

// Sound effect definitions
export const SFX = {
  // General game sounds
  win: { frequency: 800, duration: 0.3, type: 'sine' as OscillatorType },
  lose: { frequency: 200, duration: 0.4, type: 'sawtooth' as OscillatorType },
  click: { frequency: 600, duration: 0.1, type: 'square' as OscillatorType },
  spin: { frequency: 400, duration: 0.2, type: 'triangle' as OscillatorType },
  coin: { frequency: 1200, duration: 0.15, type: 'sine' as OscillatorType },
  jackpot: { frequency: 1000, duration: 0.5, type: 'sine' as OscillatorType },
  
  // Card games
  cardFlip: { frequency: 500, duration: 0.08, type: 'square' as OscillatorType },
  cardDeal: { frequency: 300, duration: 0.12, type: 'triangle' as OscillatorType },
  
  // Dice games
  diceRoll: { frequency: 350, duration: 0.25, type: 'sawtooth' as OscillatorType },
  
  // Wheel/spin games
  wheelTick: { frequency: 700, duration: 0.05, type: 'square' as OscillatorType },
  wheelStop: { frequency: 550, duration: 0.2, type: 'sine' as OscillatorType },
  
  // Action games
  shoot: { frequency: 150, duration: 0.15, type: 'sawtooth' as OscillatorType },
  hit: { frequency: 900, duration: 0.1, type: 'sine' as OscillatorType },
  miss: { frequency: 180, duration: 0.2, type: 'triangle' as OscillatorType },
  
  // Progression
  levelUp: { frequency: 600, duration: 0.4, type: 'sine' as OscillatorType },
  collect: { frequency: 1100, duration: 0.12, type: 'sine' as OscillatorType },
  
  // UI feedback
  buttonPress: { frequency: 450, duration: 0.06, type: 'square' as OscillatorType },
  error: { frequency: 150, duration: 0.3, type: 'sawtooth' as OscillatorType },
  success: { frequency: 880, duration: 0.25, type: 'sine' as OscillatorType },
  
  // Strategy games
  build: { frequency: 520, duration: 0.2, type: 'triangle' as OscillatorType },
  attack: { frequency: 280, duration: 0.3, type: 'sawtooth' as OscillatorType },
  defend: { frequency: 380, duration: 0.25, type: 'sine' as OscillatorType },
  capture: { frequency: 650, duration: 0.35, type: 'sine' as OscillatorType },
  move: { frequency: 420, duration: 0.1, type: 'triangle' as OscillatorType },
  select: { frequency: 550, duration: 0.08, type: 'square' as OscillatorType },
  trade: { frequency: 720, duration: 0.15, type: 'sine' as OscillatorType },
};

class AudioManager {
  private audioContext: AudioContext | null = null;
  private backgroundGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private backgroundAudio: HTMLAudioElement | null = null;
  private isBackgroundPlaying = false;

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create gain nodes for volume control
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = AUDIO_CONFIG.masterVolume;
      this.masterGain.connect(this.audioContext.destination);
      
      this.backgroundGain = this.audioContext.createGain();
      this.backgroundGain.gain.value = AUDIO_CONFIG.backgroundMusicVolume;
      this.backgroundGain.connect(this.masterGain);
      
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = AUDIO_CONFIG.sfxVolume;
      this.sfxGain.connect(this.masterGain);
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Start playing the custom background music file on loop
  startBackgroundMusic() {
    if (this.isBackgroundPlaying) return;
    
    this.initContext();
    this.isBackgroundPlaying = true;
    
    // Create audio element for the music file
    if (!this.backgroundAudio) {
      this.backgroundAudio = new Audio(backgroundMusicFile);
      this.backgroundAudio.loop = true;
      this.backgroundAudio.volume = AUDIO_CONFIG.backgroundMusicVolume * AUDIO_CONFIG.masterVolume;
    }
    
    this.backgroundAudio.play().catch(err => {
      console.log('Background music autoplay blocked, will retry on interaction');
    });
  }

  stopBackgroundMusic() {
    this.isBackgroundPlaying = false;
    
    if (this.backgroundAudio) {
      this.backgroundAudio.pause();
      this.backgroundAudio.currentTime = 0;
    }
  }

  // Play sound effect
  playSFX(sfxName: keyof typeof SFX) {
    this.initContext();
    if (!this.audioContext || !this.sfxGain) return;

    const sfx = SFX[sfxName];
    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const envGain = this.audioContext.createGain();
    
    osc.type = sfx.type;
    osc.frequency.value = sfx.frequency;
    
    // Quick attack, decay envelope
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    envGain.gain.exponentialRampToValueAtTime(0.01, now + sfx.duration);
    
    osc.connect(envGain);
    envGain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + sfx.duration + 0.05);

    // Special effects for certain sounds
    if (sfxName === 'jackpot' || sfxName === 'levelUp') {
      // Add arpeggio effect
      setTimeout(() => this.playArpeggio(sfx.frequency), 100);
    }
    
    if (sfxName === 'win' || sfxName === 'success') {
      // Add harmony
      setTimeout(() => this.playNote(sfx.frequency * 1.25, sfx.duration, sfx.type), 50);
    }
  }

  private playArpeggio(baseFreq: number) {
    if (!this.audioContext || !this.sfxGain) return;
    
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
    
    notes.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.15, 'sine'), i * 80);
    });
  }

  private playNote(frequency: number, duration: number, type: OscillatorType) {
    if (!this.audioContext || !this.sfxGain) return;
    
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const envGain = this.audioContext.createGain();
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    envGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.connect(envGain);
    envGain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}

// Singleton instance
const audioManager = new AudioManager();

export const useAudioManager = () => {
  const hasStarted = useRef(false);

  const startMusic = useCallback(() => {
    if (!hasStarted.current) {
      audioManager.startBackgroundMusic();
      hasStarted.current = true;
    }
  }, []);

  const stopMusic = useCallback(() => {
    audioManager.stopBackgroundMusic();
    hasStarted.current = false;
  }, []);

  const playSFX = useCallback((sfxName: keyof typeof SFX) => {
    audioManager.playSFX(sfxName);
  }, []);

  // Start music on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      startMusic();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [startMusic]);

  return { startMusic, stopMusic, playSFX };
};

// Export singleton for direct access in games
export { audioManager };
