/**
 * MusicManager - Procedural chiptune BGM via Web Audio API
 * Style: Melancholic + hopeful, Celeste-inspired, perfect loop
 * Key: A minor, BPM: 110
 */

const BPM = 110;
const BEAT = 60 / BPM;
const NOTE = BEAT / 2; // eighth note duration

// Note frequencies (Hz)
const NOTES = {
    '_': 0,
    'A2': 110, 'B2': 123.5, 'C3': 130.8, 'D3': 146.8, 'E3': 164.8, 'F3': 174.6, 'G3': 196.0,
    'A3': 220, 'B3': 246.9, 'C4': 261.6, 'D4': 293.7, 'E4': 329.6, 'F4': 349.2, 'G4': 392.0,
    'A4': 440, 'B4': 493.9, 'C5': 523.3, 'D5': 587.3, 'E5': 659.3
};

// Melody pattern (square wave) — 32 eighth notes = 4 bars = ~8.7s per phrase
const MELODY_A = [
    'A4','_','C5','_','E5','_','D5','_',
    'C5','_','B4','_','A4','_','_','_',
    'F4','_','A4','_','C5','_','B4','_',
    'A4','_','G4','_','A4','_','_','_'
];

const MELODY_B = [
    'E4','_','G4','_','A4','_','B4','_',
    'C5','_','D5','_','E5','_','_','_',
    'D5','_','C5','_','B4','_','A4','_',
    'G4','_','A4','_','_','_','_','_'
];

const MELODY_C = [
    'A4','_','E5','_','D5','_','C5','_',
    'B4','_','A4','_','G4','_','A4','_',
    'F4','_','E4','_','D4','_','C4','_',
    'D4','_','E4','_','A4','_','_','_'
];

// Bass pattern (triangle wave)
const BASS_A = [
    'A2','_','_','_','E3','_','_','_',
    'A2','_','_','_','G3','_','_','_',
    'F3','_','_','_','C3','_','_','_',
    'D3','_','_','_','E3','_','_','_'
];

const BASS_B = [
    'C3','_','_','_','G3','_','_','_',
    'A2','_','_','_','E3','_','_','_',
    'F3','_','_','_','G3','_','_','_',
    'A2','_','_','_','E3','_','_','_'
];

// Drum pattern: K=kick, H=hihat, _=rest
const DRUMS = [
    'K','H','_','H','K','H','_','H',
    'K','H','_','H','K','H','_','H',
    'K','H','_','H','K','H','_','H',
    'K','H','_','H','K','_','H','H'
];

// Full song structure (each entry = 32 eighth notes)
const SONG_STRUCTURE = [
    { melody: MELODY_A, bass: BASS_A },
    { melody: MELODY_A, bass: BASS_A },
    { melody: MELODY_B, bass: BASS_B },
    { melody: MELODY_A, bass: BASS_A },
    { melody: MELODY_C, bass: BASS_B },
    { melody: MELODY_B, bass: BASS_A },
    { melody: MELODY_A, bass: BASS_A },
    { melody: MELODY_C, bass: BASS_B },
];

export class MusicManager {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.nextStartTime = 0;
        this.schedulerTimer = null;
        this.masterGain = null;
        this.phraseIndex = 0;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Master gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.25;
            this.masterGain.connect(this.ctx.destination);

            // Simple delay for reverb feel
            this.delay = this.ctx.createDelay(0.5);
            this.delay.delayTime.value = 0.33;
            this.delayGain = this.ctx.createGain();
            this.delayGain.gain.value = 0.15;
            this.delay.connect(this.delayGain);
            this.delayGain.connect(this.masterGain);
        } catch (e) {
            console.warn('Web Audio not supported');
        }
    }

    start() {
        if (!this.ctx || this.isPlaying) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.isPlaying = true;
        this.phraseIndex = 0;
        this.nextStartTime = this.ctx.currentTime + 0.1;
        this.scheduleNextPhrase();
    }

    stop() {
        this.isPlaying = false;
        if (this.schedulerTimer) {
            clearTimeout(this.schedulerTimer);
            this.schedulerTimer = null;
        }
    }

    scheduleNextPhrase() {
        if (!this.isPlaying) return;

        const phrase = SONG_STRUCTURE[this.phraseIndex % SONG_STRUCTURE.length];
        const phraseLen = 32 * NOTE;

        this.scheduleMelody(phrase.melody, this.nextStartTime);
        this.scheduleBass(phrase.bass, this.nextStartTime);
        this.scheduleDrums(DRUMS, this.nextStartTime);

        this.nextStartTime += phraseLen;
        this.phraseIndex++;

        // Schedule next phrase ahead of time
        const delay = (this.nextStartTime - this.ctx.currentTime - 0.5) * 1000;
        this.schedulerTimer = setTimeout(() => this.scheduleNextPhrase(), Math.max(50, delay));
    }

    scheduleMelody(pattern, startTime) {
        let lastFreq = 0;
        for (let i = 0; i < pattern.length; i++) {
            const note = pattern[i];
            const freq = NOTES[note];
            if (freq && freq > 0) {
                const t = startTime + i * NOTE;
                this.playSquare(freq, t, NOTE * 0.8, 0.06);
                lastFreq = freq;
            }
        }
    }

    scheduleBass(pattern, startTime) {
        for (let i = 0; i < pattern.length; i++) {
            const note = pattern[i];
            const freq = NOTES[note];
            if (freq && freq > 0) {
                const t = startTime + i * NOTE;
                this.playTriangle(freq, t, NOTE * 2.5, 0.08);
            }
        }
    }

    scheduleDrums(pattern, startTime) {
        for (let i = 0; i < pattern.length; i++) {
            const hit = pattern[i];
            const t = startTime + i * NOTE;
            if (hit === 'K') this.playKick(t);
            else if (hit === 'H') this.playHihat(t);
        }
    }

    playSquare(freq, time, duration, volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.01);
        gain.gain.setValueAtTime(volume, time + duration * 0.6);
        gain.gain.linearRampToValueAtTime(0, time + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        gain.connect(this.delay);
        osc.start(time);
        osc.stop(time + duration + 0.01);
    }

    playTriangle(freq, time, duration, volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.linearRampToValueAtTime(0, time + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + duration + 0.01);
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.12);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.15);
    }

    playHihat(time) {
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // High-pass filter for hihat sound
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.04);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(time);
        noise.stop(time + 0.05);
    }

    setVolume(vol) {
        if (this.masterGain) this.masterGain.gain.value = vol;
    }
}
