/* audio.js — son 100 % généré (Web Audio API), aucun fichier, aucun droit.
   - Musique : nappe douce + petit arpège pentatonique (jamais de fausse note).
   - Carillon : clochette douce à chaque objet récolté.
   Les navigateurs mobiles exigent un premier toucher avant de jouer du son :
   on appelle Audio.unlock() au premier tap (fait dans game.js). */

const Audio = {
  ctx: null,
  master: null,
  started: false,
  muted: false,

  // Crée le contexte audio (au premier toucher)
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (!this.started) { this.started = true; this._startMusic(); }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(
        this.muted ? 0 : 0.9, this.ctx.currentTime + 0.15);
    }
    return this.muted;
  },

  // --- Carillon de récolte (clochette à 2 harmoniques) ---
  chime(kind) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // bois un peu plus grave que l'herbe
    const base = kind === "wood" ? 523.25 : 659.25; // Do5 / Mi5
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);   // plus doux, moins fort
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    // petit filtre passe-bas pour enlever le côté "brut"
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    lp.connect(this.master);
    g.connect(lp);
    [1, 2].forEach((mult, i) => {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = base * mult;
      const og = this.ctx.createGain();
      og.gain.value = [0.5, 0.12][i];                       // moins d'harmoniques
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 0.75);
    });
  },

  // --- Musique : boucle douce d'accords + arpège ---
  _startMusic() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Réverb légère (delay en feedback) pour un rendu cotonneux
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.33;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(this.master);

    const musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;            // volume musique (doux)
    musicGain.connect(this.master);
    musicGain.connect(delay);

    // Progression d'accords (Do majeur) : C - Am - F - G, très consonante
    const chords = [
      [130.81, 164.81, 196.0],   // C
      [110.0, 130.81, 164.81],   // Am
      [87.31, 110.0, 130.81],    // F
      [98.0, 123.47, 146.83],    // G
    ];
    // Notes d'arpège : pentatonique de Do (jolies dans tous les cas)
    const penta = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

    const beat = 0.5;            // ~ tempo lent
    let step = 0;
    let next = ctx.currentTime + 0.1;

    const pad = (freqs, start, dur) => {
      freqs.forEach((f) => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(0.18, start + 0.8);
        g.gain.linearRampToValueAtTime(0.0001, start + dur);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.value = 900;
        o.connect(g).connect(lp).connect(musicGain);
        o.start(start); o.stop(start + dur + 0.1);
      });
    };

    const pluck = (f, start) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      o.connect(g).connect(musicGain);
      o.start(start); o.stop(start + 1.0);
    };

    // Planificateur "lookahead" : prépare les notes un peu en avance
    this._timer = setInterval(() => {
      if (!this.ctx) return;
      while (next < ctx.currentTime + 0.2) {
        const chord = chords[Math.floor(step / 8) % chords.length];
        if (step % 8 === 0) pad(chord, next, beat * 8);          // nappe
        if (step % 2 === 0) {
          const n = penta[(step * 3 + 1) % penta.length];
          pluck(n * (step % 4 === 0 ? 1 : 0.5 + 0.5), next);     // arpège léger
        }
        step++;
        next += beat;
      }
    }, 60);
  },
};
