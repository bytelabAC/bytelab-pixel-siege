/* Minimal DOM shim + smoke test for game.js. Catches runtime errors in the UI layer. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Recorder } = require('./canvas-shim');

class ClassList {
  constructor(el) { this.el = el; this.set = new Set(); }
  add(...c) { c.forEach((x) => x && this.set.add(x)); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); }
  toggle(c, force) {
    const on = force === undefined ? !this.set.has(c) : !!force;
    if (on) this.set.add(c); else this.set.delete(c);
    return on;
  }
  contains(c) { return this.set.has(c); }
  _sync(str) { this.set = new Set(String(str).split(/\s+/).filter(Boolean)); }
}

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.dataset = {};
    this.listeners = {};
    this.parentNode = null;
    this._text = '';
    this._html = '';
    this.classList = new ClassList(this);
    this.width = 0; this.height = 0;
  }
  get className() { return Array.from(this.classList.set).join(' '); }
  set className(v) { this.classList._sync(v); }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this.children.length = 0; }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); this.children.length = 0; this._text = ''; }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === 'class') this.className = v;
    if (k.indexOf('data-') === 0) this.dataset[k.slice(5).replace(/-([a-z])/g, (m, c) => c.toUpperCase())] = String(v);
  }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  insertBefore(child) { return this.appendChild(child); }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  removeEventListener(type, fn) {
    const l = this.listeners[type] || [];
    const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1);
  }
  fire(type, evt) {
    const e = Object.assign({ type, target: this, preventDefault() {}, stopPropagation() {} }, evt || {});
    (this.listeners[type] || []).slice().forEach((fn) => fn(e));
    return e;
  }
  matches(sel) {
    if (!sel) return false;
    sel = sel.trim();
    if (sel.charAt(0) === '.') return this.classList.contains(sel.slice(1).split('.')[0]);
    if (sel.charAt(0) === '[') {
      const m = sel.match(/\[([^=\]]+)(?:="([^"]*)")?\]/);
      if (!m) return false;
      const has = Object.prototype.hasOwnProperty.call(this.attributes, m[1]);
      return m[2] === undefined ? has : this.attributes[m[1]] === m[2];
    }
    return this.tagName === sel.toUpperCase();
  }
  closest(sel) {
    let n = this;
    while (n) { if (n.matches && n.matches(sel)) return n; n = n.parentNode; }
    return null;
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = (node) => {
      node.children.forEach((c) => {
        if (c.matches && c.matches(sel)) out.push(c);
        walk(c);
      });
    };
    walk(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  contains(node) {
    let n = node;
    while (n) { if (n === this) return true; n = n.parentNode; }
    return false;
  }
  getBoundingClientRect() {
    return { width: this.width || 1280, height: this.height || 720, left: 0, top: 0, right: this.width || 1280, bottom: this.height || 720 };
  }
  getContext() { return this._ctx || (this._ctx = new Recorder(this.width || 1280, this.height || 720)); }
  focus() { document.activeElement = this; }
  get clientWidth() { return this.width || 1280; }
  get clientHeight() { return this.height || 720; }
}

const document = {
  readyState: 'complete',
  activeElement: null,
  listeners: {},
  createElement: (tag) => {
    const el = new El(tag);
    if (tag === 'canvas') { el.width = 1280; el.height = 720; }
    return el;
  },
  createTextNode: (t) => ({ textContent: t }),
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
  removeEventListener() {},
  querySelectorAll(sel) { return document.body.querySelectorAll(sel); },
  querySelector(sel) { return document.body.querySelector(sel); },
  getElementById() { return null; },
  hidden: false
};
document.body = new El('body');
document.documentElement = new El('html');
document.activeElement = document.body;

const rafQueue = [];
const windowObj = {
  devicePixelRatio: 1,
  document,
  console,
  Math,
  Date,
  JSON,
  Promise,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame: () => {},
  addEventListener(type, fn) { (document.listeners[type] = document.listeners[type] || []).push(fn); },
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  localStorage: (() => {
    const map = new Map();
    return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
  })(),
  AudioContext: function () {
    return {
      state: 'running', currentTime: 0, sampleRate: 44100, destination: {},
      createGain: () => ({ gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
      createOscillator: () => ({ type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }),
      createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
      createBufferSource: () => ({ buffer: null, connect() {}, start() {} }),
      createBiquadFilter: () => ({ type: '', frequency: { value: 0 }, connect() {} }),
      resume() {}
    };
  }
};
windowObj.window = windowObj;
windowObj.globalThis = windowObj;

// fake leaderboard endpoint
const boardCalls = [];
windowObj.fetch = (url) => {
  boardCalls.push(url);
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      level: 3,
      entries: [
        { name: 'Ali Rezaei', score: 4820, stars: 3, you: true },
        { name: 'Sara', score: 3900, stars: 2, you: false },
        { name: 'مهمان', score: 1200, stars: 1, you: false }
      ]
    })
  });
};

const context = vm.createContext(windowObj);
const base = path.join(__dirname, '..', 'bytelab-pixel-siege', 'assets', 'js');
for (const f of ['physics.js', 'levels.js', 'sim.js', 'render.js', 'game.js']) {
  vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), context, { filename: f });
}

const Levels = context.BYTELAB_Levels;
console.log('built-in levels:', Levels.count);

// --- custom level authoring (JSON shape used by the settings screen)
const custom = [{
  name: { fa: 'آزمایش من', en: 'My Test' },
  birds: ['byte', 'spark', 'bolt'],
  blocks: [
    { x: 900, baseY: 570, w: 30, h: 120, m: 'panel' },
    { x: 1000, baseY: 570, w: 30, h: 120, m: 'panel' },
    { x: 950, baseY: 450, w: 160, h: 24, m: 'wall' }
  ],
  bugs: [{ x: 950, surfaceY: 426, r: 20 }]
}, { name: 'Broken', blocks: [], bugs: [] }];

const added = Levels.extend(custom);
console.log('custom accepted:', added, '-> total levels:', Levels.count);
const customLevel = Levels.get(Levels.count - 1);
console.log('custom level:', customLevel.name.en, 'blocks', customLevel.blockCount, 'bugs', customLevel.bugCount, 'birds', customLevel.birds.join('/'));

// build the mount point
const root = document.createElement('div');
root.setAttribute('data-bytelab-game', JSON.stringify({ level: 3, lang: 'fa', dir: 'rtl', sound: true, canSave: false, canBoard: true, leaderboardUrl: 'https://example.test/wp-json/bytelab-pixel-siege/v1/leaderboard', userName: 'Ali Rezaei' }));
document.body.appendChild(root);

const Game = context.BYTELAB_PixelSiege.Game;
const g = new Game(root, JSON.parse(root.getAttribute('data-bytelab-game')), 0);
console.log('constructed; children:', root.children.length, 'overlay hidden:', root.querySelector('.blps__overlay').hidden);

g.startLevel(2);
console.log('started level', g.levelIndex + 1, 'phase', g.game.phase, 'screen', g.screen);

let clock = 1000;
function frames(n, ms) {
  ms = ms || 16.7;
  for (let i = 0; i < n; i++) {
    clock += ms;
    const fns = rafQueue.splice(0, rafQueue.length);
    fns.forEach((fn) => fn(clock));
  }
}
frames(5);

const canvas = root.querySelector('.blps__canvas');
canvas.fire('pointerdown', { clientX: 150, clientY: 560, pointerId: 1, preventDefault() {} });
(document.listeners.pointermove || []).forEach((fn) => fn({ clientX: 90, clientY: 610, preventDefault() {} }));
(document.listeners.pointerup || []).forEach((fn) => fn({ clientX: 90, clientY: 610, preventDefault() {} }));
console.log('after release: phase', g.game.phase, 'bird', !!g.game.bird, 'score', g.game.score);

frames(400);
console.log('after 400 frames: phase', g.game.phase, 'screen', g.screen, 'score', g.game.score, 'stars', g.game.stars, 'bugsLeft', g.game.bugsLeft);

g.pause();
console.log('pause overlay children:', root.querySelector('.blps__overlay').children.length);
g.showHelp();
console.log('help overlay children:', root.querySelector('.blps__overlay').children.length);
g.showStart();
console.log('start overlay children:', root.querySelector('.blps__overlay').children.length, 'level buttons:', root.querySelectorAll('.blps__levelbtn').length);

const btns = root.querySelectorAll('.blps__levelbtn');
const frameEl = root.querySelector('.blps__frame');
frameEl.fire('click', { target: btns[4] });
console.log('after level click: level', g.levelIndex + 1, 'screen', g.screen, 'phase', g.game.phase);

const soundBtn = root.querySelector('[data-act="sound"]');
const before = g.muted;
frameEl.fire('click', { target: soundBtn });
console.log('sound toggled:', before, '->', g.muted, 'aria-pressed', soundBtn.getAttribute('aria-pressed'));

// leaderboard
g.showLeaderboard();
console.log('board: busy', root.querySelector('.blps__board').getAttribute('aria-busy'), 'status', JSON.stringify(root.querySelector('.blps__board-status').textContent));

(async () => {
  await new Promise((r) => setTimeout(r, 20));

  const rows = root.querySelectorAll('.blps__board-row');
  const you = root.querySelectorAll('.blps__board-row.is-you');
  console.log('board after fetch: rows', rows.length, '(incl. header)', 'you-highlighted', you.length, 'status', JSON.stringify(root.querySelector('.blps__board-status').textContent));
  console.log('board fetch url:', boardCalls[boardCalls.length - 1]);
  console.log('first data row:', rows[1] && rows[1].children.map((c) => c.textContent).join(' | '));

  // win flow through the real game loop
  g.startLevel(0);
  const SL = context.BYTELAB_Levels.SLING;
  for (let shot = 0; shot < 3 && g.screen === 'playing'; shot++) {
    const gg = g.game;
    gg.aimStart(SL.x - 96, SL.y + 45);
    gg.aimMove(SL.x - 96, SL.y + 45);
    gg.aimEnd();
    frames(420);
    console.log('  shot', shot + 1, '-> screen', g.screen, 'phase', g.game.phase, 'score', g.game.score, 'bugsLeft', g.game.bugsLeft);
  }
  console.log('win flow: screen', g.screen, 'result panel:', !!root.querySelector('.blps__panel'), 'score', g.game.score, 'stars', g.game.stars);
  console.log('stars painted:', root.querySelectorAll('.blps__star-big.is-on').length, 'best badge:', !!root.querySelector('.blps__badge'));

  const nextBtn = root.querySelector('[data-act="next"]');
  if (nextBtn) { frameEl.fire('click', { target: nextBtn }); }
  console.log('after next: level', g.levelIndex + 1, 'screen', g.screen);

  // custom level is playable
  g.startLevel(Levels.count - 1);
  frames(60);
  console.log('custom level play: level', g.levelIndex + 1, 'phase', g.game.phase, 'blocks', g.game.totalBlocks, 'bugs', g.game.totalBugs);

  console.log('SMOKE TEST OK');
})();

