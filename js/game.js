/* ============================================================================
   ALPHONSE — mini-jeu cozy (vanilla JS, canvas 2D, sans dépendance)

   Lecture rapide pour débuter :
   - CONFIG  : tous les réglages (vitesses, cadences, coûts) au même endroit.
   - state   : l'état courant du jeu (mouton, herbes, bois, cabanes...).
   - update(dt) : fait avancer le jeu (déplacements, apparitions, récoltes).
   - draw()  : dessine tout, dans l'ordre fond -> décor -> objets -> mouton -> HUD.
   - boucle() : appelée ~60 fois/seconde par le navigateur.
   ============================================================================ */

"use strict";

// --- Dimensions du "monde" (le canvas est ensuite mis à l'échelle en CSS) ---
const WORLD_W = 720;
const WORLD_H = 1280;

// --- Tous les réglages ajustables en un seul endroit (pour l'équilibrage) ---
const CONFIG = {
  alphonse: { radius: 46, speed: 235, spriteH: 165 },

  // Zone jouable (à l'intérieur de la couronne d'arbres)
  field: { x: 95, y: 180, w: 530, h: 925 },

  grass: { radius: 22, max: 6, spawnEvery: 2.2, points: 10 },

  wood: {
    radius: 24,
    maxBefore: 1,     // 1 seul bois tant qu'on n'en a pas ramassé
    maxAfter: 4,      // ensuite plusieurs à la fois
    spawnEvery: 3.8,  // ...et beaucoup plus souvent
    points: 3,
  },

  cabin: { w: 150, h: 135, cost: 50 },
};

// Mares (décoratives) : rien n'apparaît dessus
const PONDS = [
  { x: 255, y: 430, rx: 100, ry: 62 },
  { x: 470, y: 770, rx: 88, ry: 56 },
  { x: 235, y: 965, rx: 74, ry: 46 },
];

// ----------------------------------------------------------------------------
// État du jeu
// ----------------------------------------------------------------------------
const state = {
  score: 0,
  wood: 0,
  woodUnlocked: false,           // passe à true après le 1er bois ramassé

  alphonse: {
    x: WORLD_W / 2, y: 760,
    tx: WORLD_W / 2, ty: 760,    // cible (point touché)
    facing: 1,                   // 1 = regarde à droite, -1 = à gauche
  },

  grasses: [],
  woods: [],
  cabins: [],
  particles: [],
  floats: [],                    // textes "+10" / "+3" qui montent

  grassTimer: 1.0,
  woodTimer: 0.5,

  mode: "play",                  // "play" ou "placing" (pose d'une cabane)
  ghost: { x: WORLD_W / 2, y: 760 }, // aperçu de la cabane à poser

  time: 0,
};

// Touffes d'herbe décoratives (fixes, juste pour le fond)
const DECO_TUFTS = [];
(function makeTufts() {
  let seed = 1234;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 70; i++) {
    DECO_TUFTS.push({ x: rnd() * WORLD_W, y: 140 + rnd() * (WORLD_H - 180), s: 0.7 + rnd() * 0.7 });
  }
})();

// Arbres en couronne autour de la zone jouable
const TREES = [];
(function makeTrees() {
  const f = CONFIG.field;
  const add = (x, y, s) => TREES.push({ x, y, s });
  // Haut
  for (let i = 0; i <= 6; i++) add(60 + i * 100, 110, 1.05 - (i % 2) * 0.12);
  // Bas
  for (let i = 0; i <= 6; i++) add(60 + i * 100, WORLD_H - 70, 1.05 - (i % 2) * 0.12);
  // Côtés
  for (let i = 0; i < 6; i++) {
    const y = f.y + 40 + i * 165;
    add(45, y, 1.0 - (i % 2) * 0.1);
    add(WORLD_W - 45, y, 1.0 - (i % 2) * 0.1);
  }
})();

// ----------------------------------------------------------------------------
// Canvas
// ----------------------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Convertit un point écran (doigt/souris) en coordonnées du monde
function toWorld(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * WORLD_W,
    y: ((clientY - r.top) / r.height) * WORLD_H,
  };
}

// ----------------------------------------------------------------------------
// Zones cliquables du HUD (en coordonnées du monde)
// ----------------------------------------------------------------------------
const BUILD_BTN = { x: 210, y: 1148, w: 300, h: 104 };

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// ----------------------------------------------------------------------------
// Entrées (un seul code pour le tactile et la souris grâce à Pointer Events)
// ----------------------------------------------------------------------------
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = toWorld(e.clientX, e.clientY);

  if (state.mode === "placing") {
    // En mode pose : le bouton sert à annuler
    if (pointInRect(p.x, p.y, BUILD_BTN)) { state.mode = "play"; return; }
    state.ghost.x = p.x; state.ghost.y = p.y;
    tryPlaceCabin(p.x, p.y);
    return;
  }

  // Mode normal : a-t-on touché le bouton "Construire" ?
  if (pointInRect(p.x, p.y, BUILD_BTN)) {
    if (state.wood >= CONFIG.cabin.cost) {
      state.mode = "placing";
      state.ghost.x = clamp(p.x, CONFIG.field.x, CONFIG.field.x + CONFIG.field.w);
      state.ghost.y = clamp(720, CONFIG.field.y, CONFIG.field.y + CONFIG.field.h);
    }
    return;
  }

  // Sinon : on envoie Alphonse vers ce point
  state.alphonse.tx = p.x;
  state.alphonse.ty = p.y;
}, { passive: false });

canvas.addEventListener("pointermove", (e) => {
  if (state.mode !== "placing") return;
  const p = toWorld(e.clientX, e.clientY);
  state.ghost.x = p.x; state.ghost.y = p.y;
}, { passive: false });

// ----------------------------------------------------------------------------
// Petites fonctions utilitaires
// ----------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const rand = (a, b) => a + Math.random() * (b - a);

function inAnyPond(x, y, margin = 0) {
  for (const p of PONDS) {
    const dx = (x - p.x) / (p.rx + margin);
    const dy = (y - p.y) / (p.ry + margin);
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}

function inAnyCabin(x, y, margin = 0) {
  for (const c of state.cabins) {
    if (x > c.x - c.w / 2 - margin && x < c.x + c.w / 2 + margin &&
        y > c.y - c.h - margin && y < c.y + margin) return true;
  }
  return false;
}

// Trouve un point libre dans la zone jouable pour faire apparaître un objet
function findSpawn() {
  const f = CONFIG.field;
  for (let tries = 0; tries < 40; tries++) {
    const x = rand(f.x + 30, f.x + f.w - 30);
    const y = rand(f.y + 30, f.y + f.h - 30);
    if (inAnyPond(x, y, 24)) continue;
    if (inAnyCabin(x, y, 20)) continue;
    if (dist2(x, y, state.alphonse.x, state.alphonse.y) < 110 * 110) continue;
    let tooClose = false;
    for (const g of state.grasses) if (dist2(x, y, g.x, g.y) < 80 * 80) tooClose = true;
    for (const w of state.woods) if (dist2(x, y, w.x, w.y) < 80 * 80) tooClose = true;
    if (tooClose) continue;
    return { x, y };
  }
  return null;
}

function tryPlaceCabin(x, y) {
  const f = CONFIG.field, c = CONFIG.cabin;
  const cx = clamp(x, f.x + c.w / 2, f.x + f.w - c.w / 2);
  const cy = clamp(y, f.y + c.h, f.y + f.h);
  if (inAnyPond(cx, cy, 10)) return;        // pas sur une mare
  state.cabins.push({ x: cx, y: cy, w: c.w, h: c.h });
  state.wood -= c.cost;
  state.mode = "play";
}

// ----------------------------------------------------------------------------
// Mise à jour du jeu
// ----------------------------------------------------------------------------
function update(dt) {
  state.time += dt;

  // --- Déplacement d'Alphonse vers sa cible ---
  const a = state.alphonse;
  const f = CONFIG.field;
  a.tx = clamp(a.tx, f.x, f.x + f.w);
  a.ty = clamp(a.ty, f.y, f.y + f.h);
  const dx = a.tx - a.x, dy = a.ty - a.y;
  const d = Math.hypot(dx, dy);
  if (d > 2) {
    const step = Math.min(d, CONFIG.alphonse.speed * dt);
    a.x += (dx / d) * step;
    a.y += (dy / d) * step;
    if (Math.abs(dx) > 4) a.facing = dx > 0 ? 1 : -1;
  }

  // --- Apparition de l'herbe ---
  state.grassTimer -= dt;
  if (state.grassTimer <= 0 && state.grasses.length < CONFIG.grass.max) {
    const s = findSpawn();
    if (s) state.grasses.push({ x: s.x, y: s.y, r: CONFIG.grass.radius, phase: rand(0, 6.28) });
    state.grassTimer = CONFIG.grass.spawnEvery;
  }

  // --- Apparition du bois ---
  const maxWood = state.woodUnlocked ? CONFIG.wood.maxAfter : CONFIG.wood.maxBefore;
  state.woodTimer -= dt;
  if (state.woods.length < maxWood &&
      (state.woods.length === 0 || (state.woodUnlocked && state.woodTimer <= 0))) {
    const s = findSpawn();
    if (s) state.woods.push({ x: s.x, y: s.y, r: CONFIG.wood.radius, phase: rand(0, 6.28) });
    state.woodTimer = CONFIG.wood.spawnEvery;
  }

  // --- Récolte (le mouton touche un objet) ---
  const ar = CONFIG.alphonse.radius;
  for (let i = state.grasses.length - 1; i >= 0; i--) {
    const g = state.grasses[i];
    if (dist2(a.x, a.y, g.x, g.y) < (ar + g.r) ** 2) {
      state.score += CONFIG.grass.points;
      collectFx(g.x, g.y, "#bff07a", "+" + CONFIG.grass.points);
      state.grasses.splice(i, 1);
    }
  }
  for (let i = state.woods.length - 1; i >= 0; i--) {
    const w = state.woods[i];
    if (dist2(a.x, a.y, w.x, w.y) < (ar + w.r) ** 2) {
      state.wood += CONFIG.wood.points;
      if (!state.woodUnlocked) { state.woodUnlocked = true; state.woodTimer = 0.4; }
      collectFx(w.x, w.y, "#f0c060", "+" + CONFIG.wood.points);
      state.woods.splice(i, 1);
    }
  }

  // --- Particules et textes flottants ---
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const fl = state.floats[i];
    fl.y -= 55 * dt; fl.life -= dt;
    if (fl.life <= 0) state.floats.splice(i, 1);
  }
}

function collectFx(x, y, color, label) {
  for (let i = 0; i < 12; i++) {
    const ang = rand(0, 6.28), sp = rand(70, 200);
    state.particles.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60,
      life: rand(0.4, 0.8), color,
    });
  }
  state.floats.push({ x, y: y - 30, life: 1.0, label, color });
}

// ----------------------------------------------------------------------------
// Dessin
// ----------------------------------------------------------------------------
function draw() {
  // --- Fond : prairie en dégradé ---
  const g = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  g.addColorStop(0, "#9bd866");
  g.addColorStop(1, "#74bf4c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Touffes d'herbe décoratives
  for (const t of DECO_TUFTS) drawTuft(t.x, t.y, t.s, "#69b048");

  // --- Mares ---
  for (const p of PONDS) drawPond(p);

  // --- Cabanes ---
  for (const c of state.cabins) drawCabin(c.x, c.y, c.w, c.h, 1);

  // --- Arbres en couronne ---
  for (const t of TREES) drawTree(t.x, t.y, t.s);

  // --- Objets à récolter (aura pulsante + objet) ---
  for (const w of state.woods) { drawAura(w.x, w.y, 1.25); drawWood(w.x, w.y); }
  for (const gr of state.grasses) { drawAura(gr.x, gr.y, 1.0); drawGrass(gr.x, gr.y); }

  // --- Alphonse ---
  drawAlphonse();

  // --- Particules + textes flottants ---
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const fl of state.floats) {
    ctx.globalAlpha = clamp(fl.life, 0, 1);
    ctx.fillStyle = fl.color;
    ctx.font = "bold 38px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(60,40,10,.55)";
    ctx.strokeText(fl.label, fl.x, fl.y);
    ctx.fillText(fl.label, fl.x, fl.y);
  }
  ctx.globalAlpha = 1;

  // --- Aperçu de la cabane en mode pose ---
  if (state.mode === "placing") {
    const f = CONFIG.field, c = CONFIG.cabin;
    const gx = clamp(state.ghost.x, f.x + c.w / 2, f.x + f.w - c.w / 2);
    const gy = clamp(state.ghost.y, f.y + c.h, f.y + f.h);
    const ok = !inAnyPond(gx, gy, 10);
    ctx.globalAlpha = 0.55;
    drawCabin(gx, gy, c.w, c.h, ok ? 1 : 0.3);
    ctx.globalAlpha = 1;
  }

  // --- HUD ---
  drawHUD();
}

// Aura jaune qui pulse et change de teinte
function drawAura(x, y, scale) {
  const t = state.time;
  const baseR = 46 * scale;
  const r = baseR + Math.sin(t * 3.4 + x * 0.05) * 9 * scale;
  const hue = 48 + Math.sin(t * 2.2 + y * 0.05) * 9;     // varie or <-> jaune
  const a = 0.45 + 0.25 * (0.5 + 0.5 * Math.sin(t * 4.0));
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, `hsla(${hue},100%,72%,${a})`);
  grd.addColorStop(0.55, `hsla(${hue},100%,60%,${a * 0.5})`);
  grd.addColorStop(1, `hsla(${hue},100%,55%,0)`);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  ctx.restore();
}

function drawTuft(x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 6 * s, y);
    ctx.quadraticCurveTo(x + i * 9 * s, y - 16 * s, x + i * 4 * s, y - 22 * s);
    ctx.stroke();
  }
}

function drawGrass(x, y) {
  drawTuft(x, y + 10, 1.7, "#3f8f2e");
  drawTuft(x + 8, y + 12, 1.4, "#4ea336");
}

function drawWood(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#9c6b3b";
  ctx.strokeStyle = "#6e4825";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    roundRect(-26 + i * 5, -8 + i * 9, 52, 16, 8);
    ctx.fill(); ctx.stroke();
  }
  // bouts de bûches
  ctx.fillStyle = "#caa06a";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(-26 + i * 5, i * 9, 7.5, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}

function drawPond(p) {
  ctx.save();
  ctx.fillStyle = "#5fae4a";
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, p.rx + 9, p.ry + 7, 0, 0, 6.283); ctx.fill();
  const grd = ctx.createRadialGradient(p.x - p.rx * 0.3, p.y - p.ry * 0.3, 4, p.x, p.y, p.rx);
  grd.addColorStop(0, "#9fd8f0");
  grd.addColorStop(1, "#4f9fd6");
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.5)";
  ctx.beginPath(); ctx.ellipse(p.x - p.rx * 0.35, p.y - p.ry * 0.4, p.rx * 0.28, p.ry * 0.18, 0, 0, 6.283); ctx.fill();
  ctx.restore();
}

function drawTree(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // ombre
  ctx.fillStyle = "rgba(40,70,30,.18)";
  ctx.beginPath(); ctx.ellipse(0, 6, 46, 14, 0, 0, 6.283); ctx.fill();
  // tronc
  ctx.fillStyle = "#8a5a34";
  roundRect(-11, -38, 22, 52, 6); ctx.fill();
  // feuillage (3 boules)
  const blobs = [[0, -92, 46], [-34, -64, 38], [34, -64, 38], [0, -60, 44]];
  ctx.fillStyle = "#4f9e3a";
  for (const [bx, by, br] of blobs) { ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = "#62b84a";
  for (const [bx, by, br] of blobs) { ctx.beginPath(); ctx.arc(bx - 8, by - 10, br * 0.6, 0, 6.283); ctx.fill(); }
  ctx.restore();
}

function drawCabin(x, y, w, h, alpha) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  // ombre
  ctx.fillStyle = "rgba(40,70,30,.20)";
  ctx.beginPath(); ctx.ellipse(0, 4, w * 0.55, 16, 0, 0, 6.283); ctx.fill();
  // corps
  ctx.fillStyle = "#b07a45";
  ctx.strokeStyle = "#7c5128";
  ctx.lineWidth = 3;
  roundRect(-w / 2, -h * 0.62, w, h * 0.62, 6); ctx.fill(); ctx.stroke();
  // rondins
  ctx.strokeStyle = "rgba(124,81,40,.5)";
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -h * 0.62 + i * (h * 0.62 / 4));
    ctx.lineTo(w / 2 - 4, -h * 0.62 + i * (h * 0.62 / 4)); ctx.stroke();
  }
  // toit
  ctx.fillStyle = "#8c4a2e";
  ctx.beginPath();
  ctx.moveTo(-w / 2 - 12, -h * 0.62);
  ctx.lineTo(0, -h);
  ctx.lineTo(w / 2 + 12, -h * 0.62);
  ctx.closePath(); ctx.fill();
  // porte
  ctx.fillStyle = "#6e4423";
  roundRect(-20, -h * 0.42, 40, h * 0.42, 4); ctx.fill();
  // fenêtre
  ctx.fillStyle = "#ffe9a8";
  roundRect(w / 2 - 46, -h * 0.5, 26, 26, 3); ctx.fill();
  ctx.restore();
}

function drawAlphonse() {
  const a = state.alphonse;
  const img = Assets.images.alphonse;
  // ombre
  ctx.fillStyle = "rgba(40,70,30,.22)";
  ctx.beginPath(); ctx.ellipse(a.x, a.y + 30, 52, 18, 0, 0, 6.283); ctx.fill();

  ctx.save();
  ctx.translate(a.x, a.y);
  // petit balancement quand il marche
  const moving = Math.hypot(a.tx - a.x, a.ty - a.y) > 4;
  if (moving) ctx.rotate(Math.sin(state.time * 12) * 0.05);
  ctx.scale(a.facing, 1);

  if (img && img.width) {
    const h = CONFIG.alphonse.spriteH;
    const w = h * (img.width / img.height);
    ctx.drawImage(img, -w / 2, -h * 0.78, w, h);
  } else {
    drawFallbackSheep();   // mouton de secours si l'image n'est pas prête
  }
  ctx.restore();
}

// Mouton dessiné simplement, utilisé tant que assets/alphonse.png n'existe pas
function drawFallbackSheep() {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#e7e2d6";
  ctx.lineWidth = 2;
  // corps en nuage
  const puffs = [[0, -10, 42], [-30, 4, 26], [30, 4, 26], [0, 20, 34], [-22, -28, 22], [22, -28, 22]];
  for (const [px, py, pr] of puffs) { ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.283); ctx.fill(); ctx.stroke(); }
  // tête
  ctx.fillStyle = "#fbf4e6";
  ctx.beginPath(); ctx.ellipse(20, -22, 20, 22, 0, 0, 6.283); ctx.fill(); ctx.stroke();
  // oreilles
  ctx.fillStyle = "#f0e6d2";
  ctx.beginPath(); ctx.ellipse(8, -36, 9, 6, -0.5, 0, 6.283); ctx.fill();
  // yeux
  ctx.fillStyle = "#3a2a1a";
  ctx.beginPath(); ctx.arc(24, -24, 3.4, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(14, -24, 3.4, 0, 6.283); ctx.fill();
  // pattes
  ctx.strokeStyle = "#caa06a"; ctx.lineWidth = 6; ctx.lineCap = "round";
  for (const lx of [-14, 8]) { ctx.beginPath(); ctx.moveTo(lx, 36); ctx.lineTo(lx, 50); ctx.stroke(); }
}

// ----------------------------------------------------------------------------
// HUD (barre du haut + bouton du bas), dessiné dans le canvas
// ----------------------------------------------------------------------------
function drawHUD() {
  // Barre du haut
  ctx.fillStyle = "rgba(255,255,255,.78)";
  roundRect(20, 22, WORLD_W - 40, 86, 22); ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  // Score (herbe)
  drawTuft(58, 80, 1.5, "#3f8f2e");
  ctx.fillStyle = "#2f6d22";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText("Score " + state.score, 86, 64);

  // Bois
  ctx.save();
  ctx.translate(WORLD_W - 250, 56);
  ctx.scale(0.62, 0.62);
  drawWood(0, 8);
  ctx.restore();
  ctx.fillStyle = "#7c5128";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText("Bois " + state.wood, WORLD_W - 210, 64);

  // Bouton du bas
  const b = BUILD_BTN;
  const placing = state.mode === "placing";
  const canBuild = state.wood >= CONFIG.cabin.cost;

  let label, fill, textCol;
  if (placing) { label = "Annuler"; fill = "#e0746a"; textCol = "#fff"; }
  else if (canBuild) { label = "Construire 🏠"; fill = "#f0b34a"; textCol = "#5a3a12"; }
  else { label = "Cabane : 50 bois"; fill = "rgba(120,120,110,.55)"; textCol = "rgba(255,255,255,.85)"; }

  ctx.fillStyle = "rgba(0,0,0,.15)";
  roundRect(b.x, b.y + 4, b.w, b.h, 26); ctx.fill();
  ctx.fillStyle = fill;
  roundRect(b.x, b.y, b.w, b.h, 26); ctx.fill();
  ctx.fillStyle = textCol;
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);

  if (placing) {
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.fillText("Touche un endroit pour poser la cabane", WORLD_W / 2, 1126);
  }

  ctx.textBaseline = "alphabetic";
}

// Rectangle à coins arrondis (utilitaire de dessin)
function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ----------------------------------------------------------------------------
// Boucle de jeu
// ----------------------------------------------------------------------------
let last = 0;
function boucle(now) {
  if (!last) last = now;
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;   // évite les sauts si l'onglet a été en pause
  update(dt);
  draw();
  requestAnimationFrame(boucle);
}

Assets.load(() => {
  requestAnimationFrame(boucle);
});
