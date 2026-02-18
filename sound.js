// Ääniefektien konfiguraatio
const soundConfig = {
    masterVolume: 0.3,
    maxSimultaneous: 8,

    bullet: {
        frequency: 800,
        frequencyEnd: 200,
        duration: 0.08,
        volume: 0.15,
        type: 'sawtooth'
    },

    missile: {
        noiseDuration: 0.2,
        noiseVolume: 0.12,
        filterStart: 2000,
        filterEnd: 500,
        subFrequency: 80,
        subVolume: 0.1,
        subDuration: 0.15
    },

    laser: {
        frequency: 220,
        harmonicFrequency: 440,
        volume: 0.08,
        harmonicVolume: 0.04,
        lfoFrequency: 15,
        lfoDepth: 0.03,
        fadeOut: 0.05
    },

    railgunCharge: {
        frequencyStart: 200,
        frequencyEnd: 1200,
        volumeStart: 0.05,
        volumeEnd: 0.2,
        type: 'sine'
    },

    railgunFire: {
        noiseVolume: 0.3,
        noiseDuration: 0.2,
        filterFrequency: 1000,
        filterQ: 5,
        subFrequency: 50,
        subVolume: 0.25,
        subDuration: 0.15
    },

    explosion: {
        small:  { filterFreq: 800, duration: 0.2, volume: 0.1 },
        medium: { filterFreq: 600, duration: 0.35, volume: 0.15 },
        large:  { filterFreq: 400, duration: 0.5, volume: 0.25 }
    }
};

// Äänimanageri — Web Audio API proseduraaliset äänet
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.activeCount = 0;

        // Jatkuvat äänet (laser, railgun charge) — avain → noodit
        this.continuousSounds = {};
    }

    // Luo AudioContext ensimmäisellä interaktiolla
    ensureContext() {
        if (this.ctx) return true;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = soundConfig.masterVolume;
            this.masterGain.connect(this.ctx.destination);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Resumaa suspentoitu konteksti (selaimen autoplay-politiikka)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Rajoita samanaikaisten äänien määrää
    canPlay() {
        return this.activeCount < soundConfig.maxSimultaneous;
    }

    trackSound(duration) {
        this.activeCount++;
        setTimeout(() => { this.activeCount--; }, duration * 1000);
    }

    // Luo valkoinen kohina -puskuri
    createNoiseBuffer(duration) {
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // ======== BULLET ========
    playBulletFire() {
        if (!this.ensureContext() || !this.canPlay()) return;
        this.resume();
        const cfg = soundConfig.bullet;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = cfg.type;
        osc.frequency.setValueAtTime(cfg.frequency, now);
        osc.frequency.exponentialRampToValueAtTime(cfg.frequencyEnd, now + cfg.duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(cfg.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + cfg.duration);
        this.trackSound(cfg.duration);
    }

    // ======== MISSILE ========
    playMissileFire() {
        if (!this.ensureContext() || !this.canPlay()) return;
        this.resume();
        const cfg = soundConfig.missile;
        const now = this.ctx.currentTime;

        // Kohina + low-pass sweep
        const noiseBuffer = this.createNoiseBuffer(cfg.noiseDuration);
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cfg.filterStart, now);
        filter.frequency.exponentialRampToValueAtTime(cfg.filterEnd, now + cfg.noiseDuration);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(cfg.noiseVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.noiseDuration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(now);

        // Sub-bass
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(cfg.subFrequency, now);
        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(cfg.subVolume, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.subDuration);
        sub.connect(subGain);
        subGain.connect(this.masterGain);
        sub.start(now);
        sub.stop(now + cfg.subDuration);

        this.trackSound(cfg.noiseDuration);
    }

    // ======== LASER (jatkuva) ========
    startLaser(id = 'default') {
        if (!this.ensureContext()) return;
        this.resume();
        if (this.continuousSounds['laser_' + id]) return; // Jo käynnissä

        const cfg = soundConfig.laser;
        const now = this.ctx.currentTime;

        // Pääoskillaattori
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(cfg.frequency, now);

        // Yliääni
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(cfg.harmonicFrequency, now);

        // LFO (tremolo)
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(cfg.lfoFrequency, now);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(cfg.lfoDepth, now);

        // Gain-noodit
        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(cfg.volume, now);
        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(cfg.harmonicVolume, now);

        // LFO → gain-modulaatio
        lfo.connect(lfoGain);
        lfoGain.connect(gain1.gain);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(this.masterGain);
        gain2.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        lfo.start(now);

        this.continuousSounds['laser_' + id] = { osc1, osc2, lfo, gain1, gain2, lfoGain };
    }

    stopLaser(id = 'default') {
        const key = 'laser_' + id;
        const nodes = this.continuousSounds[key];
        if (!nodes) return;

        const cfg = soundConfig.laser;
        const now = this.ctx.currentTime;

        // Fade out
        nodes.gain1.gain.setValueAtTime(nodes.gain1.gain.value, now);
        nodes.gain1.gain.exponentialRampToValueAtTime(0.001, now + cfg.fadeOut);
        nodes.gain2.gain.setValueAtTime(nodes.gain2.gain.value, now);
        nodes.gain2.gain.exponentialRampToValueAtTime(0.001, now + cfg.fadeOut);

        const stopTime = now + cfg.fadeOut + 0.01;
        nodes.osc1.stop(stopTime);
        nodes.osc2.stop(stopTime);
        nodes.lfo.stop(stopTime);

        delete this.continuousSounds[key];
    }

    // ======== RAILGUN CHARGE (jatkuva) ========
    startRailgunCharge(id = 'default') {
        if (!this.ensureContext()) return;
        this.resume();
        if (this.continuousSounds['rg_' + id]) return;

        const cfg = soundConfig.railgunCharge;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = cfg.type;
        osc.frequency.setValueAtTime(cfg.frequencyStart, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(cfg.volumeStart, now);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);

        this.continuousSounds['rg_' + id] = { osc, gain };
    }

    updateRailgunCharge(percent, id = 'default') {
        const nodes = this.continuousSounds['rg_' + id];
        if (!nodes) return;

        const cfg = soundConfig.railgunCharge;
        const now = this.ctx.currentTime;
        const freq = cfg.frequencyStart + (cfg.frequencyEnd - cfg.frequencyStart) * percent;
        const vol = cfg.volumeStart + (cfg.volumeEnd - cfg.volumeStart) * percent;

        nodes.osc.frequency.setTargetAtTime(freq, now, 0.02);
        nodes.gain.gain.setTargetAtTime(vol, now, 0.02);
    }

    stopRailgunCharge(id = 'default') {
        const key = 'rg_' + id;
        const nodes = this.continuousSounds[key];
        if (!nodes) return;

        const now = this.ctx.currentTime;
        nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
        nodes.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        nodes.osc.stop(now + 0.05);

        delete this.continuousSounds[key];
    }

    // ======== RAILGUN FIRE ========
    playRailgunFire(chargePercent = 1) {
        if (!this.ensureContext() || !this.canPlay()) return;
        this.resume();
        const cfg = soundConfig.railgunFire;
        const now = this.ctx.currentTime;
        const vol = chargePercent;

        // Kohina + bandpass
        const noiseBuffer = this.createNoiseBuffer(cfg.noiseDuration);
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(cfg.filterFrequency, now);
        filter.Q.setValueAtTime(cfg.filterQ, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(cfg.noiseVolume * vol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.noiseDuration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(now);

        // Sub-bass
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(cfg.subFrequency, now);
        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(cfg.subVolume * vol, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.subDuration);
        sub.connect(subGain);
        subGain.connect(this.masterGain);
        sub.start(now);
        sub.stop(now + cfg.subDuration);

        this.trackSound(cfg.noiseDuration);
    }

    // ======== EXPLOSION ========
    playExplosion(size = 'medium') {
        if (!this.ensureContext() || !this.canPlay()) return;
        this.resume();
        const cfg = soundConfig.explosion[size] || soundConfig.explosion.medium;
        const now = this.ctx.currentTime;

        const noiseBuffer = this.createNoiseBuffer(cfg.duration);
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cfg.filterFreq, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + cfg.duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(cfg.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(now);

        this.trackSound(cfg.duration);
    }

    // Master volume
    setMasterVolume(vol) {
        soundConfig.masterVolume = vol;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
        }
    }
}

// Globaali instanssi
const soundManager = new SoundManager();
