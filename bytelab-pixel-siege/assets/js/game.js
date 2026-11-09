/*!
 * BYTELAB Pixel Siege — UI controller
 * Builds the in-page game shell, handles input, sound, saves and levels.
 */
(function () {
  'use strict';

  var Sim = window.BYTELAB_Sim;
  var Render = window.BYTELAB_Render;
  var Levels = window.BYTELAB_Levels;
  if (!Sim || !Render || !Levels) { return; }

  var api = { instances: [], boot: null };
  var STORAGE_KEY = 'bytelab.pixelSiege.v1';
  var W = 1280, H = 720;

  var I18N = {
    en: {
      title: 'PIXEL SIEGE',
      tagline: 'A BYTELAB physics experiment',
      score: 'SCORE',
      level: 'LEVEL',
      birds: 'SHOTS',
      play: 'PLAY',
      resume: 'RESUME',
      restart: 'RESTART',
      levels: 'LEVELS',
      next: 'NEXT LEVEL',
      retry: 'TRY AGAIN',
      best: 'BEST',
      won: 'LAB CLEARED',
      lost: 'OUT OF BYTES',
      paused: 'PAUSED',
      help: 'HOW TO PLAY',
      close: 'CLOSE',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      pause: 'Pause',
      helpTitle: 'HOW TO PLAY',
      helpAim: 'Drag the bird back and let go to launch. A longer pull flies further.',
      helpAbility: 'Tap while flying: BOLT dashes, SPARK explodes.',
      helpGoal: 'Break every bug. Blocks in the way are fair game.',
      helpKeys: 'Keyboard: arrows aim, space fires.',
      targets: 'BUGS LEFT',
      stars: 'STARS',
      levelOf: 'of',
      saved: 'Score saved',
      tapToStart: 'Tap or press space to start',
      perfect: 'PERFECT',
      newBest: 'NEW BEST'
    },
    fa: {
      title: 'محاصره پیکسلی',
      tagline: 'یک آزمایش فیزیکی از بایت‌لب',
      score: 'امتیاز',
      level: 'مرحله',
      birds: 'شلیک',
      play: 'شروع',
      resume: 'ادامه',
      restart: 'شروع دوباره',
      levels: 'مراحل',
      next: 'مرحله بعد',
      retry: 'تلاش دوباره',
      best: 'رکورد',
      won: 'آزمایشگاه پاک شد',
      lost: 'بایت‌ها تمام شد',
      paused: 'توقف',
      help: 'راهنما',
      close: 'بستن',
      soundOn: 'صدا روشن',
      soundOff: 'صدا خاموش',
      pause: 'توقف',
      helpTitle: 'نحوه بازی',
      helpAim: 'پرنده را عقب بکش و رها کن. هرچه بیشتر بکشی، دورتر می‌رود.',
      helpAbility: 'در حال پرواز ضربه بزن: «بولت» شتاب می‌گیرد، «اسپارک» منفجر می‌شود.',
      helpGoal: 'همه باگ‌ها را از بین ببر. بلوک‌های سر راه هم آزادند.',
      helpKeys: 'با کلید: جهت‌ها نشانه‌گیری، فاصله شلیک.',
      targets: 'باگ باقی‌مانده',
      stars: 'ستاره',
      levelOf: 'از',
      saved: 'امتیاز ذخیره شد',
      tapToStart: 'برای شروع ضربه بزن یا فاصله را بزن',
      perfect: 'بی‌نقص',
      newBest: 'رکورد جدید'
    }
  };

  function readStore() {
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeStore(data) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
  }

  // ---------------------------------------------------------------- audio

  function Sound(muted) {
    this.muted = !!muted;
    this.ctx = null;
    this.master = null;
  }
  Sound.prototype.ensure = function () {
    if (this.ctx) { return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
  };
  Sound.prototype.blip = function (freq, dur, type, gain, slide) {
    if (this.muted || !this.ctx) { return; }
    var t = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slide) { osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur); }
    g.gain.setValueAtTime(gain || 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  };
  Sound.prototype.noise = function (dur, gain, filterFreq) {
    if (this.muted || !this.ctx) { return; }
    var ctx = this.ctx;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { data[i] = (Math.random() * 2 - 1) * (1 - i / len); }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq || 1200;
    var g = ctx.createGain();
    g.gain.value = gain || 0.3;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
  };
  Sound.prototype.play = function (name) {
    if (this.muted) { return; }
    this.ensure();
    if (!this.ctx) { return; }
    if (this.ctx.state === 'suspended') { this.ctx.resume(); }
    switch (name) {
      case 'launch': this.blip(320, 0.18, 'square', 0.18, 180); break;
      case 'impact': this.blip(90, 0.16, 'sine', 0.4, 48); this.noise(0.1, 0.12, 700); break;
      case 'break': this.noise(0.16, 0.22, 2200); this.blip(210, 0.1, 'triangle', 0.14, 120); break;
      case 'pop': this.blip(540, 0.12, 'square', 0.2, 900); break;
      case 'dash': this.blip(700, 0.14, 'sawtooth', 0.12, 1400); break;
      case 'boom': this.noise(0.3, 0.35, 900); this.blip(70, 0.3, 'sine', 0.4, 40); break;
      case 'win': [523, 659, 784, 1046].forEach(function (f, i) {
        var self = this;
        window.setTimeout(function () { self.blip(f, 0.18, 'square', 0.14); }, i * 110);
      }, this); break;
      case 'lose': this.blip(220, 0.3, 'sine', 0.18, 110); break;
      case 'click': this.blip(880, 0.04, 'square', 0.06); break;
    }
  };

  // ------------------------------------------------------------------ game

  function Game(el, config, index) {
    this.el = el;
    this.cfg = config || {};
    this.index = index;
    this.lang = this.cfg.lang === 'en' ? 'en' : 'fa';
    this.strings = Object.assign({}, I18N[this.lang], this.cfg.strings || {});
    this.dir = this.cfg.dir === 'ltr' ? 'ltr' : (this.lang === 'en' ? 'ltr' : 'rtl');
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var saved = readStore();
    this.saved = saved;
    this.muted = (typeof this.cfg.sound === 'boolean') ? !this.cfg.sound : !!saved.muted;

    this.sound = new Sound(this.muted);
    this.levelIndex = Math.max(0, Math.min(Levels.count - 1, (this.cfg.level || 1) - 1));
    this.screen = 'start';
    this.raf = 0;
    this.lastTs = 0;
    this.acc = 0;
    this.running = false;
    this.paused = false;
    this.visible = true;
    this.toastTimer = 0;
    this.displayScore = 0;

    this.buildDom();
    this.game = Sim.create(this.levelIndex, { seed: 7 + this.levelIndex * 13 });
    this.bindEvents();
    this.showStart();
    this.startLoop();
  }

  Game.prototype.buildDom = function () {
    var el = this.el;
    el.classList.add('blps');
    el.setAttribute('dir', this.dir);
    el.setAttribute('lang', this.lang === 'fa' ? 'fa' : 'en');
    el.innerHTML = '';

    var frame = document.createElement('div');
    frame.className = 'blps__frame';
    frame.setAttribute('tabindex', '-1');

    var canvas = document.createElement('canvas');
    canvas.className = 'blps__canvas';
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', this.strings.title);
    canvas.setAttribute('tabindex', '0');
    this.canvas = canvas;
    frame.appendChild(canvas);

    // HUD
    var hud = document.createElement('div');
    hud.className = 'blps__hud';

    var brand = document.createElement('div');
    brand.className = 'blps__brand';
    brand.innerHTML = this.logoSvg();
    brand.setAttribute('aria-hidden', 'true');
    hud.appendChild(brand);

    var mid = document.createElement('div');
    mid.className = 'blps__mid';
    var lvl = document.createElement('div');
    lvl.className = 'blps__level';
    lvl.textContent = this.strings.level + ' 1';
    this.levelLabel = lvl;
    mid.appendChild(lvl);
    var prog = document.createElement('div');
    prog.className = 'blps__progress';
    var progFill = document.createElement('i');
    prog.appendChild(progFill);
    this.progressFill = progFill;
    mid.appendChild(prog);
    hud.appendChild(mid);

    var stats = document.createElement('div');
    stats.className = 'blps__stats';
    var scoreWrap = document.createElement('div');
    scoreWrap.className = 'blps__stat';
    var scoreLabel = document.createElement('span');
    scoreLabel.className = 'blps__stat-label';
    scoreLabel.textContent = this.strings.score;
    var scoreValue = document.createElement('span');
    scoreValue.className = 'blps__stat-value';
    scoreValue.textContent = '0';
    scoreValue.setAttribute('aria-live', 'off');
    scoreWrap.appendChild(scoreLabel);
    scoreWrap.appendChild(scoreValue);
    stats.appendChild(scoreWrap);
    this.scoreValue = scoreValue;

    var birds = document.createElement('div');
    birds.className = 'blps__birds';
    birds.setAttribute('aria-hidden', 'true');
    this.birdsWrap = birds;
    stats.appendChild(birds);
    hud.appendChild(stats);

    var tools = document.createElement('div');
    tools.className = 'blps__tools';
    tools.appendChild(this.iconButton('sound', this.strings.soundOn, this.soundSvg()));
    tools.appendChild(this.iconButton('pause', this.strings.pause, this.pauseSvg()));
    tools.appendChild(this.iconButton('help', this.strings.help, this.helpSvg()));
    this.soundBtn = tools.querySelector('[data-act="sound"]');
    hud.appendChild(tools);

    frame.appendChild(hud);

    var live = document.createElement('div');
    live.className = 'blps__live';
    live.setAttribute('aria-live', 'polite');
    this.live = live;
    frame.appendChild(live);

    var toast = document.createElement('div');
    toast.className = 'blps__toast';
    this.toast = toast;
    frame.appendChild(toast);

    var overlay = document.createElement('div');
    overlay.className = 'blps__overlay';
    overlay.hidden = true;
    this.overlay = overlay;
    frame.appendChild(overlay);

    el.appendChild(frame);
    this.frame = frame;
    this.renderer = new Render.Renderer(canvas, { reducedMotion: this.reduced });
    this.syncSoundButton();
  };

  Game.prototype.iconButton = function (act, label, svg) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'blps__btn blps__btn--icon';
    b.setAttribute('data-act', act);
    b.setAttribute('aria-label', label);
    b.setAttribute('title', label);
    b.innerHTML = svg;
    return b;
  };

  // The mark is the BYTELAB pixel flask: a 7 x 6 grid of blocks, a narrow
  // three-block neck, and exactly eight liquid-cyan blocks inside.
  var FLASK = [
    '..###..',
    '..###..',
    '.#####.',
    '#######',
    '#######',
    '#######'
  ];
  var LIQUID = { '4-3': 1, '5-0': 1, '5-1': 1, '5-2': 1, '5-3': 1, '5-4': 1, '5-5': 1, '5-6': 1 };
  var BUBBLE = '1-3';

  Game.prototype.logoSvg = function () {
    var cell = 5, gap = 1;
    var parts = [];
    for (var r = 0; r < FLASK.length; r++) {
      for (var c = 0; c < FLASK[r].length; c++) {
        if (FLASK[r].charAt(c) !== '#') { continue; }
        var key = r + '-' + c;
        var fill = '#F8FAFC';
        if (LIQUID[key]) { fill = '#22D3EE'; }
        if (key === BUBBLE) { fill = '#F59E0B'; }
        parts.push('<rect x="' + (c * (cell + gap)) + '" y="' + (r * (cell + gap)) +
          '" width="' + cell + '" height="' + cell + '" fill="' + fill + '"/>');
      }
    }
    // The wordmark is real text, not SVG glyphs, so it keeps the brand's
    // monospace stack (JetBrains Mono → system mono) in every browser.
    return '<svg class="blps__flask" viewBox="0 0 41 36" width="34" height="30" aria-hidden="true" focusable="false">' +
      parts.join('') + '</svg>' +
      '<span class="blps__wordmark" aria-hidden="true"><b>BYTE</b><span>LAB</span></span>';
  };

  Game.prototype.soundSvg = function () {
    return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8l4 8M20 8l-4 8" stroke="currentColor" stroke-width="2" fill="none" class="blps__mute-line"/></svg>';
  };
  Game.prototype.pauseSvg = function () {
    return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>';
  };
  Game.prototype.helpSvg = function () {
    return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 9a3 3 0 016 0c0 2-3 2-3 4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="11" y="16" width="2" height="2" fill="currentColor"/></svg>';
  };
  Game.prototype.starSvg = function (filled) {
    var fill = filled ? '#F59E0B' : 'transparent';
    var stroke = filled ? '#F59E0B' : '#67E8F9';
    return '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4.4L18.5 22 12 17.6 5.5 22l2-8.6L2 9h7z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6"/></svg>';
  };

  Game.prototype.bindEvents = function () {
    var self = this;
    var canvas = this.canvas;

    this.onPointerDown = function (e) {
      if (self.screen !== 'playing' || self.paused) { return; }
      self.sound.ensure();
      if (self.game.phase === 'flying') { self.ability(); return; }
      var p = self.renderer.screenToWorld(e.clientX, e.clientY);
      if (self.game.aimStart(p.x, p.y)) {
        e.preventDefault();
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
        self.dragging = true;
        self.kbAim = null;
      }
    };
    this.onPointerMove = function (e) {
      if (!self.dragging) { return; }
      var p = self.renderer.screenToWorld(e.clientX, e.clientY);
      self.game.aimMove(p.x, p.y);
      e.preventDefault();
    };
    this.onPointerUp = function (e) {
      if (!self.dragging) { return; }
      self.dragging = false;
      if (self.game.aimEnd()) {
        self.sound.play('launch');
        self.updateHud();
      }
    };

    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);

    this.onKey = function (e) {
      var focused = self.el.contains(document.activeElement);
      if (!focused) { return; }
      if (self.screen === 'playing' && !self.paused) {
        var g = self.game;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          if (g.phase === 'ready') {
            e.preventDefault();
            self.kbAim = self.kbAim || { angle: 35, power: 0.8 };
            if (e.key === 'ArrowLeft') { self.kbAim.angle = Math.min(75, self.kbAim.angle + 3); }
            if (e.key === 'ArrowRight') { self.kbAim.angle = Math.max(5, self.kbAim.angle - 3); }
            if (e.key === 'ArrowUp') { self.kbAim.power = Math.min(1, self.kbAim.power + 0.04); }
            if (e.key === 'ArrowDown') { self.kbAim.power = Math.max(0.2, self.kbAim.power - 0.04); }
            self.applyKeyboardAim();
          }
          return;
        }
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (g.phase === 'ready') {
            if (!self.kbAim) { self.kbAim = { angle: 35, power: 0.8 }; }
            self.applyKeyboardAim();
            if (g.aimEnd()) { self.sound.play('launch'); self.updateHud(); }
          } else if (g.phase === 'flying') {
            self.ability();
          }
        }
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { self.pause(); }
        if (e.key === 'r' || e.key === 'R') { self.restartLevel(); }
      } else if (self.screen === 'start' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        self.startLevel(self.levelIndex);
      }
    };
    document.addEventListener('keydown', this.onKey);

    this.onResize = function () { self.renderer.resize(); };
    window.addEventListener('resize', this.onResize);
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(function () { self.renderer.resize(); });
      this.ro.observe(this.frame);
    }
    if (window.IntersectionObserver) {
      this.io = new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      this.io.observe(this.frame);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && self.screen === 'playing' && !self.paused) { self.pause(); }
    });

    this.frame.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) { return; }
      var act = btn.getAttribute('data-act');
      self.sound.play('click');
      if (act === 'sound') { self.toggleSound(); }
      else if (act === 'pause') { self.pause(); }
      else if (act === 'help') { self.showHelp(); }
      else if (act === 'close') { self.closeOverlay(); }
      else if (act === 'play') { self.startLevel(self.levelIndex); }
      else if (act === 'resume') { self.resume(); }
      else if (act === 'restart') { self.restartLevel(); }
      else if (act === 'levels') { self.showStart(); }
      else if (act === 'next') { self.startLevel(Math.min(Levels.count - 1, self.levelIndex + 1)); }
      else if (act === 'level') { self.startLevel(parseInt(btn.getAttribute('data-level'), 10) || 0); }
    });
  };

  Game.prototype.applyKeyboardAim = function () {
    var a = this.kbAim.angle * Math.PI / 180;
    var pull = Sim.MAX_PULL * this.kbAim.power;
    var x = Levels.SLING.x - Math.cos(a) * pull;
    var y = Levels.SLING.y + Math.sin(a) * pull;
    if (!this.game.aim.active) { this.game.aimStart(x, y); }
    this.game.aimMove(x, y);
  };

  Game.prototype.ability = function () {
    if (this.game.useAbility()) {
      if (this.game.bird && this.game.bird.birdType === 'spark') { this.sound.play('boom'); }
      else { this.sound.play('dash'); }
    }
  };

  Game.prototype.startLoop = function () {
    var self = this;
    var step = 1 / 120;
    function frame(ts) {
      self.raf = window.requestAnimationFrame(frame);
      if (!self.lastTs) { self.lastTs = ts; }
      var dt = Math.min(0.1, (ts - self.lastTs) / 1000);
      self.lastTs = ts;
      if (!self.visible) { return; }
      if (self.screen === 'playing' && !self.paused) {
        self.acc += dt;
        var guard = 0;
        while (self.acc >= step && guard < 6) {
          self.game.update(step);
          self.acc -= step;
          guard++;
        }
        if (self.acc > step * 6) { self.acc = 0; }
        self.consumeEvents();
        self.checkOutcome();
        self.updateHud();
      }
      self.renderer.draw(self.game, dt);
    }
    this.raf = window.requestAnimationFrame(frame);
  };

  Game.prototype.consumeEvents = function () {
    var events = this.game.drainEvents();
    if (!events.length) { return; }
    this.renderer.handleEvents(events);
    for (var i = 0; i < events.length; i++) {
      var t = events[i].type;
      if (t === 'break' || t === 'crack') { this.sound.play('break'); }
      else if (t === 'pop') { this.sound.play('pop'); }
      else if (t === 'boom') { this.sound.play('boom'); }
      else if (t === 'dash') { }
      else if (t === 'win') { this.sound.play('win'); }
      else if (t === 'lose') { this.sound.play('lose'); }
    }
  };

  Game.prototype.checkOutcome = function () {
    var g = this.game;
    if (g.phase === 'won' && this.screen === 'playing') {
      this.finish(true);
    } else if (g.phase === 'lost' && this.screen === 'playing') {
      this.finish(false);
    }
  };

  Game.prototype.finish = function (won) {
    var g = this.game;
    var level = Levels.levels[this.levelIndex];
    var data = readStore();
    data.best = data.best || {};
    data.stars = data.stars || {};
    var prev = data.best[level.id] || 0;
    var isBest = g.score > prev;
    if (isBest) { data.best[level.id] = g.score; }
    data.stars[level.id] = Math.max(data.stars[level.id] || 0, won ? g.stars : 0);
    writeStore(data);
    this.saved = data;

    if (won && this.cfg.canSave && this.cfg.restUrl) { this.postScore(level.id, g.score, g.stars); }

    this.screen = won ? 'won' : 'lost';
    this.showResult(won, isBest);
  };

  Game.prototype.postScore = function (level, score, stars) {
    if (!window.fetch) { return; }
    try {
      window.fetch(this.cfg.restUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': this.cfg.nonce || ''
        },
        body: JSON.stringify({ level: level, score: score, stars: stars })
      }).catch(function () { });
    } catch (e) { }
  };

  // ------------------------------------------------------------------ hud

  Game.prototype.updateHud = function () {
    var g = this.game;
    if (this.displayScore !== g.score) {
      this.displayScore += Math.max(1, Math.ceil((g.score - this.displayScore) * 0.2));
      if (Math.abs(this.displayScore - g.score) < 2) { this.displayScore = g.score; }
      this.scoreValue.textContent = String(Math.round(this.displayScore));
    }
    var level = Levels.levels[this.levelIndex];
    var name = level.name[this.lang] || level.name.en;
    var label = this.strings.level + ' ' + level.id + ' · ' + name;
    if (this.levelLabel.textContent !== label) { this.levelLabel.textContent = label; }
    this.progressFill.style.width = (g.progress() * 100).toFixed(1) + '%';

    // the loaded bird still sits in the queue until it is launched
    var icons = g.queue.slice(0, 6);
    var sig = icons.join(',') + '|' + g.phase;
    if (this.lastBirds !== sig) {
      this.lastBirds = sig;
      this.birdsWrap.innerHTML = '';
      for (var i = 0; i < icons.length; i++) {
        var dot = document.createElement('i');
        dot.className = 'blps__bird blps__bird--' + icons[i];
        if (i === 0 && g.phase === 'ready') { dot.classList.add('is-loaded'); }
        this.birdsWrap.appendChild(dot);
      }
    }
  };

  Game.prototype.announce = function (text) {
    if (this.live) { this.live.textContent = text; }
  };

  Game.prototype.showToast = function (text) {
    var t = this.toast;
    t.textContent = text;
    t.classList.add('is-on');
    var self = this;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(function () { t.classList.remove('is-on'); }, 1800);
  };

  Game.prototype.syncSoundButton = function () {
    if (!this.soundBtn) { return; }
    this.soundBtn.classList.toggle('is-muted', this.muted);
    var label = this.muted ? this.strings.soundOff : this.strings.soundOn;
    this.soundBtn.setAttribute('aria-label', label);
    this.soundBtn.setAttribute('title', label);
    this.soundBtn.setAttribute('aria-pressed', this.muted ? 'false' : 'true');
  };

  Game.prototype.toggleSound = function () {
    this.muted = !this.muted;
    this.sound.muted = this.muted;
    var data = readStore();
    data.muted = this.muted;
    writeStore(data);
    this.syncSoundButton();
    if (!this.muted) { this.sound.play('click'); }
  };

  // --------------------------------------------------------------- screens

  Game.prototype.clearOverlay = function () {
    this.overlay.innerHTML = '';
    this.overlay.hidden = false;
  };

  Game.prototype.closeOverlay = function () {
    this.overlay.hidden = true;
    this.overlay.innerHTML = '';
  };

  Game.prototype.panel = function (mod) {
    var p = document.createElement('div');
    p.className = 'blps__panel' + (mod ? ' ' + mod : '');
    return p;
  };

  Game.prototype.heading = function (text, tag) {
    var h = document.createElement(tag || 'h2');
    h.className = 'blps__heading';
    h.textContent = text;
    return h;
  };

  Game.prototype.button = function (act, label, mod, level) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'blps__btn' + (mod ? ' ' + mod : '');
    b.setAttribute('data-act', act);
    if (level != null) { b.setAttribute('data-level', level); }
    b.textContent = label;
    return b;
  };

  Game.prototype.showStart = function () {
    var self = this;
    this.screen = 'start';
    this.game.aimCancel();
    this.clearOverlay();
    var panel = this.panel('blps__panel--start');
    panel.appendChild(this.heading(this.strings.title, 'h2'));
    var tag = document.createElement('p');
    tag.className = 'blps__tagline';
    tag.textContent = this.strings.tagline;
    panel.appendChild(tag);

    var grid = document.createElement('div');
    grid.className = 'blps__levels';
    for (var i = 0; i < Levels.count; i++) {
      (function (idx) {
        var lv = Levels.levels[idx];
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'blps__levelbtn' + (idx === self.levelIndex ? ' is-selected' : '');
        b.setAttribute('data-act', 'level');
        b.setAttribute('data-level', String(idx));
        var num = document.createElement('span');
        num.className = 'blps__levelbtn-num';
        num.textContent = String(lv.id).padStart(2, '0');
        b.appendChild(num);
        var stars = document.createElement('span');
        stars.className = 'blps__levelbtn-stars';
        var got = (self.saved.stars && self.saved.stars[lv.id]) || 0;
        for (var s = 0; s < 3; s++) {
          var st = document.createElement('i');
          st.className = 'blps__star' + (s < got ? ' is-on' : '');
          stars.appendChild(st);
        }
        b.appendChild(stars);
        b.setAttribute('aria-label', self.strings.level + ' ' + lv.id + ' · ' + (lv.name[self.lang] || lv.name.en));
        grid.appendChild(b);
      }(i));
    }
    panel.appendChild(grid);

    var row = document.createElement('div');
    row.className = 'blps__row';
    var play = this.button('play', this.strings.play + ' · ' + (this.levelIndex + 1), 'blps__btn--primary');
    row.appendChild(play);
    panel.appendChild(row);

    var hint = document.createElement('p');
    hint.className = 'blps__hint';
    hint.textContent = this.strings.helpAim;
    panel.appendChild(hint);

    this.overlay.appendChild(panel);
    this.updateHud();
  };

  Game.prototype.showHelp = function () {
    var wasPlaying = this.screen === 'playing';
    this.wasPlayingOnHelp = wasPlaying && !this.paused;
    this.clearOverlay();
    var panel = this.panel();
    panel.appendChild(this.heading(this.strings.helpTitle));
    var list = document.createElement('ul');
    list.className = 'blps__help';
    [this.strings.helpAim, this.strings.helpAbility, this.strings.helpGoal, this.strings.helpKeys].forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      list.appendChild(li);
    });
    panel.appendChild(list);
    var row = document.createElement('div');
    row.className = 'blps__row';
    row.appendChild(this.button('close', this.strings.close, 'blps__btn--primary'));
    panel.appendChild(row);
    this.overlay.appendChild(panel);
  };

  Game.prototype.showResult = function (won, isBest) {
    var g = this.game;
    var level = Levels.levels[this.levelIndex];
    this.clearOverlay();
    var panel = this.panel(won ? 'blps__panel--win' : 'blps__panel--lose');
    panel.appendChild(this.heading(won ? this.strings.won : this.strings.lost));

    if (won) {
      var stars = document.createElement('div');
      stars.className = 'blps__stars';
      for (var i = 0; i < 3; i++) {
        var s = document.createElement('span');
        s.className = 'blps__star-big' + (i < g.stars ? ' is-on' : '');
        s.innerHTML = this.starSvg(i < g.stars);
        stars.appendChild(s);
      }
      panel.appendChild(stars);
    }

    var scoreRow = document.createElement('div');
    scoreRow.className = 'blps__result';
    var a = document.createElement('div');
    a.className = 'blps__result-item';
    a.innerHTML = '<span>' + this.strings.score + '</span><strong>' + g.score + '</strong>';
    scoreRow.appendChild(a);
    var b = document.createElement('div');
    b.className = 'blps__result-item';
    b.innerHTML = '<span>' + this.strings.best + '</span><strong>' + Math.max(g.score, (this.saved.best && this.saved.best[level.id]) || 0) + '</strong>';
    scoreRow.appendChild(b);
    panel.appendChild(scoreRow);

    if (isBest && won) {
      var best = document.createElement('p');
      best.className = 'blps__badge';
      best.textContent = this.strings.newBest;
      panel.appendChild(best);
    }

    var row = document.createElement('div');
    row.className = 'blps__row';
    if (won && this.levelIndex < Levels.count - 1) {
      row.appendChild(this.button('next', this.strings.next, 'blps__btn--primary'));
    } else {
      row.appendChild(this.button('restart', won ? this.strings.restart : this.strings.retry, 'blps__btn--primary'));
    }
    row.appendChild(this.button('levels', this.strings.levels));
    panel.appendChild(row);
    this.overlay.appendChild(panel);
    this.announce(won ? this.strings.won + ' ' + g.score : this.strings.lost);
  };

  Game.prototype.startLevel = function (idx) {
    this.closeOverlay();
    this.levelIndex = Math.max(0, Math.min(Levels.count - 1, idx));
    this.game = Sim.create(this.levelIndex, { seed: 7 + this.levelIndex * 13 });
    this.screen = 'playing';
    this.paused = false;
    this.acc = 0;
    this.displayScore = 0;
    this.lastBirds = null;
    this.kbAim = null;
    // keep keyboard focus inside the widget without painting a ring for mouse play
    try { this.frame.focus({ preventScroll: true }); } catch (e) { }
    this.updateHud();
    var level = Levels.levels[this.levelIndex];
    this.showToast(this.strings.level + ' ' + level.id + ' · ' + (level.name[this.lang] || level.name.en));
  };

  Game.prototype.restartLevel = function () {
    this.sound.play('click');
    this.startLevel(this.levelIndex);
  };

  Game.prototype.pause = function () {
    if (this.screen !== 'playing') { return; }
    if (this.paused) { this.resume(); return; }
    this.paused = true;
    this.clearOverlay();
    var panel = this.panel();
    panel.appendChild(this.heading(this.strings.paused));
    var row = document.createElement('div');
    row.className = 'blps__row';
    row.appendChild(this.button('resume', this.strings.resume, 'blps__btn--primary'));
    row.appendChild(this.button('restart', this.strings.restart));
    row.appendChild(this.button('levels', this.strings.levels));
    panel.appendChild(row);
    this.overlay.appendChild(panel);
  };

  Game.prototype.resume = function () {
    this.closeOverlay();
    this.paused = false;
    this.lastTs = 0;
  };

  Game.prototype.destroy = function () {
    window.cancelAnimationFrame(this.raf);
    document.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    if (this.ro) { this.ro.disconnect(); }
    if (this.io) { this.io.disconnect(); }
  };

  // ------------------------------------------------------------------ boot

  function parseConfig(el) {
    var raw = el.getAttribute('data-bytelab-game');
    if (!raw) { return {}; }
    try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
  }

  function boot() {
    var nodes = document.querySelectorAll('[data-bytelab-game]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-blps-ready') === '1') { continue; }
      nodes[i].setAttribute('data-blps-ready', '1');
      try {
        /* eslint-disable no-new */
        var instance = new Game(nodes[i], parseConfig(nodes[i]), i);
        api.instances.push(instance);
      } catch (err) {
        if (window.console && console.error) { console.error('[BYTELAB Pixel Siege]', err); }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  api.boot = boot;
  api.Game = Game;
  window.BYTELAB_PixelSiege = api;
}());





