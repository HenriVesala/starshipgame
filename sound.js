// Ääniefektien konfiguraatio
const soundConfig = {
    masterVolume: 0.3,
    maxSimultaneous: 8,

    bullet: {
        duration: 0.7,
        dopplerFreqStart: 1200,
        dopplerFreqEnd: 50,
        dopplerVolume: 0.10,
        dopplerType: 'sawtooth',
        noiseVolume: 0.2,
        noiseFilterStart: 2000,
        noiseFilterEnd: 200,
        subFrequency: 30,
        subVolume: 0.1,
        subDuration: 0.2
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
        frequency: 110,
        harmonicFrequency: 220,
        voices: 3,              // Supersaw ääniä per oskillaattori
        detune: 15,             // Detune sentteinä
        volume: 0.1,
        harmonicVolume: 0.04,
        lfoFrequency:220,
        lfoDepth: 0.3,
        fadeOut: 0.3
    },

    railgunCharge: {
        frequencyStart: 20,
        frequencyEnd: 200,
        volumeStart: 0.05,
        volumeEnd: 0.1,
        type: 'sine'
    },

    railgunFire: {
        duration: 3,
        // Supersaw Doppler-oskillaattori
        dopplerFreqStart: 2500,
        dopplerFreqEnd: 20,
        dopplerVolume: 0.15,
        dopplerVoices: 7,           // Oskillaattoreiden määrä (pariton → 1 keskellä + parit sivuilla)
        dopplerDetune: 25,          // Maksimi detune sentteinä per kerros (leveys)
        // Kohina (ilmanvastus)
        noiseVolume: 0.3,
        noiseFilterStart: 2000,
        noiseFilterEnd: 20,
        // Sub-bass (ohituspulssi)
        subFrequency: 200,
        subVolume: 0.2,
        subDuration: 0.2
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

    // Luo supersaw: useita detunattuja sawtooth-oskillaattoreita → paksu, rikas ääni
    // Palauttaa { oscillators[], gain } — kaikki oskillaattorit reititetty yhteiseen gain-nodeen
    createSuperSaw(frequency, voices, detuneCents, outputNode) {
        const gain = this.ctx.createGain();
        gain.gain.value = 1 / voices; // Normalisoi volyymi
        gain.connect(outputNode);

        const oscillators = [];
        for (let i = 0; i < voices; i++) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            // Levitä detune tasaisesti: -max ... 0 ... +max
            const spread = voices > 1 ? (i / (voices - 1)) * 2 - 1 : 0; // -1 ... +1
            osc.detune.value = spread * detuneCents;
            osc.frequency.value = frequency;
            osc.connect(gain);
            oscillators.push(osc);
        }
        return { oscillators, gain };
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

    // ======== BULLET (Doppler-efekti) ========
    playBulletFire() {
        if (!this.ensureContext() || !this.canPlay()) return;
        this.resume();
        const cfg = soundConfig.bullet;
        const now = this.ctx.currentTime;
        const dur = cfg.duration;

        // 1) Doppler-oskillaattori
        const doppler = this.ctx.createOscillator();
        doppler.type = cfg.dopplerType;
        doppler.frequency.setValueAtTime(cfg.dopplerFreqStart, now);
        doppler.frequency.exponentialRampToValueAtTime(cfg.dopplerFreqEnd, now + dur);

        const dopplerGain = this.ctx.createGain();
        dopplerGain.gain.setValueAtTime(0.001, now);
        dopplerGain.gain.exponentialRampToValueAtTime(cfg.dopplerVolume, now + dur * 0.15);
        dopplerGain.gain.setValueAtTime(cfg.dopplerVolume, now + dur * 0.3);
        dopplerGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        doppler.connect(dopplerGain);
        dopplerGain.connect(this.masterGain);
        doppler.start(now);
        doppler.stop(now + dur);

        // 2) Kohina + lowpass sweep
        const noiseBuffer = this.createNoiseBuffer(dur);
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cfg.noiseFilterStart, now);
        filter.frequency.exponentialRampToValueAtTime(cfg.noiseFilterEnd, now + dur);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, now);
        noiseGain.gain.exponentialRampToValueAtTime(cfg.noiseVolume, now + dur * 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(now);

        // 3) Sub-bass pulssi
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(cfg.subFrequency, now);
        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.001, now);
        subGain.gain.exponentialRampToValueAtTime(cfg.subVolume, now + dur * 0.25);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.subDuration);
        sub.connect(subGain);
        subGain.connect(this.masterGain);
        sub.start(now);
        sub.stop(now + cfg.subDuration);

        this.trackSound(dur);
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

        const voices = cfg.voices || 5;
        const detune = cfg.detune || 20;

        // Gain-noodit
        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(cfg.volume, now);
        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(cfg.harmonicVolume, now);
        gain1.connect(this.masterGain);
        gain2.connect(this.masterGain);

        // Supersaw pääoskillaattori (220 Hz)
        const ss1 = this.createSuperSaw(cfg.frequency, voices, detune, gain1);
        // Supersaw yliääni (440 Hz)
        const ss2 = this.createSuperSaw(cfg.harmonicFrequency, voices, detune, gain2);

        // LFO (tremolo) → pääoskillaattorin gain
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(cfg.lfoFrequency, now);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(cfg.lfoDepth, now);
        lfo.connect(lfoGain);
        lfoGain.connect(gain1.gain);

        // Käynnistä kaikki
        for (const osc of ss1.oscillators) osc.start(now);
        for (const osc of ss2.oscillators) osc.start(now);
        lfo.start(now);

        this.continuousSounds['laser_' + id] = { ss1, ss2, lfo, gain1, gain2, lfoGain };
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
        for (const osc of nodes.ss1.oscillators) osc.stop(stopTime);
        for (const osc of nodes.ss2.oscillators) osc.stop(stopTime);
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

    // ======== RAILGUN FIRE (Doppler-efekti) ========
    playRailgunFire(chargePercent = 1) {
        if (!this.ensureContext() || !this.canPlay()) return;
        this.resume();
        const cfg = soundConfig.railgunFire;
        const now = this.ctx.currentTime;
        const vol = chargePercent;
        const dur = cfg.duration;

        // 1) Supersaw Doppler: useita detunattuja sawtooth-oskillaattoreita → paksu sweep
        const dopplerGain = this.ctx.createGain();
        dopplerGain.gain.setValueAtTime(0.001, now);
        dopplerGain.gain.exponentialRampToValueAtTime(cfg.dopplerVolume * vol, now + dur * 0.15);
        dopplerGain.gain.setValueAtTime(cfg.dopplerVolume * vol, now + dur * 0.3);
        dopplerGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        dopplerGain.connect(this.masterGain);

        const voices = cfg.dopplerVoices || 7;
        const detune = cfg.dopplerDetune || 25;
        const supersaw = this.createSuperSaw(cfg.dopplerFreqStart, voices, detune, dopplerGain);

        // Taajuussweep kaikille oskillaattoreille
        for (const osc of supersaw.oscillators) {
            osc.frequency.setValueAtTime(cfg.dopplerFreqStart, now);
            osc.frequency.exponentialRampToValueAtTime(cfg.dopplerFreqEnd, now + dur);
            osc.start(now);
            osc.stop(now + dur);
        }

        // 2) Kohina + lowpass sweep (ilmanvastus)
        const noiseBuffer = this.createNoiseBuffer(dur);
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cfg.noiseFilterStart, now);
        filter.frequency.exponentialRampToValueAtTime(cfg.noiseFilterEnd, now + dur);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, now);
        noiseGain.gain.exponentialRampToValueAtTime(cfg.noiseVolume * vol, now + dur * 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(now);

        // 3) Sub-bass pulssi (massan paine ohituspisteessä)
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(cfg.subFrequency, now);
        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.001, now);
        subGain.gain.exponentialRampToValueAtTime(cfg.subVolume * vol, now + dur * 0.25);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.subDuration);
        sub.connect(subGain);
        subGain.connect(this.masterGain);
        sub.start(now);
        sub.stop(now + cfg.subDuration);

        this.trackSound(dur);
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
