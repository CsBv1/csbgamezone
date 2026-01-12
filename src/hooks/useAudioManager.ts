import { useEffect, useRef, useCallback } from 'react';

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
};

class AudioManager {
  private audioContext: AudioContext | null = null;
  private backgroundGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private backgroundOscillators: OscillatorNode[] = [];
  private isBackgroundPlaying = false;
  private backgroundInterval: NodeJS.Timeout | null = null;

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

  // Adventure background music - procedural ambient soundtrack
  startBackgroundMusic() {
    if (this.isBackgroundPlaying) return;
    
    this.initContext();
    this.isBackgroundPlaying = true;
    
    // Create ambient adventure loop
    this.playBackgroundLoop();
  }

  private playBackgroundLoop() {
    if (!this.audioContext || !this.backgroundGain || !this.isBackgroundPlaying) return;

    // Adventure chord progression
    const chords = [
      [130.81, 164.81, 196.00], // C major
      [146.83, 185.00, 220.00], // D minor
      [164.81, 207.65, 246.94], // E minor
      [174.61, 220.00, 261.63], // F major
      [196.00, 246.94, 293.66], // G major
      [146.83, 185.00, 220.00], // D minor
      [130.81, 164.81, 196.00], // C major
      [196.00, 246.94, 293.66], // G major
    ];

    let chordIndex = 0;
    
    const playChord = () => {
      if (!this.isBackgroundPlaying || !this.audioContext || !this.backgroundGain) return;
      
      const chord = chords[chordIndex];
      const now = this.audioContext.currentTime;
      
      chord.forEach((freq, i) => {
        const osc = this.audioContext!.createOscillator();
        const envGain = this.audioContext!.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        envGain.gain.setValueAtTime(0, now);
        envGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
        envGain.gain.linearRampToValueAtTime(0.05, now + 1.5);
        envGain.gain.linearRampToValueAtTime(0, now + 2);
        
        osc.connect(envGain);
        envGain.connect(this.backgroundGain!);
        
        osc.start(now);
        osc.stop(now + 2);
        
        this.backgroundOscillators.push(osc);
      });
      
      // Add subtle high melody note
      const melodyOsc = this.audioContext!.createOscillator();
      const melodyGain = this.audioContext!.createGain();
      
      melodyOsc.type = 'triangle';
      melodyOsc.frequency.value = chord[2] * 2; // Octave up
      
      melodyGain.gain.setValueAtTime(0, now);
      melodyGain.gain.linearRampToValueAtTime(0.03, now + 0.1);
      melodyGain.gain.linearRampToValueAtTime(0.02, now + 0.8);
      melodyGain.gain.linearRampToValueAtTime(0, now + 1.2);
      
      melodyOsc.connect(melodyGain);
      melodyGain.connect(this.backgroundGain!);
      
      melodyOsc.start(now);
      melodyOsc.stop(now + 1.2);
      
      chordIndex = (chordIndex + 1) % chords.length;
    };

    // Play immediately
    playChord();
    
    // Loop every 2 seconds
    this.backgroundInterval = setInterval(playChord, 2000);
  }

  stopBackgroundMusic() {
    this.isBackgroundPlaying = false;
    
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }
    
    this.backgroundOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.backgroundOscillators = [];
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
