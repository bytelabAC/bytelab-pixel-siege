/*!
 * BYTELAB Pixel Siege — renderer
 * Flat, pixel-block artwork in the BYTELAB palette. No gradients, no shadows.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root.BYTELAB_Levels);
  root.BYTELAB_Render = api;
  if (typeof module === 'object' && module.exports) { module.exports = api; }
}(typeof window !== 'undefined' ? window : globalThis, function (Levels) {
  'use strict';

  var C = {
    navy: '#0B1020',
    panel: '#141B34',
    cyan: '#22D3EE',
    liquid: '#67E8F9',
    deep: '#0891B2',
    ink: '#0E7490',
    amber: '#F59E0B',
    white: '#F8FAFC'
  };

  var W = 1280, H = 720;
  var GROUND = (Levels && Levels.GROUND) || 570;
  var SLING = (Levels && Levels.SLING) || { x: 196, y: 446 };
  var CELL = 4;

  function rgba(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function pixelCircle(ctx, x, y, r, color, cell) {
    cell = cell || CELL;
    var n = Math.ceil(r / cell);
    ctx.fillStyle = color;
    for (var iy = -n; iy <= n; iy++) {
      for (var ix = -n; ix <= n; ix++) {
        var cx = (ix + 0.5) * cell;
        var cy = (iy + 0.5) * cell;
        if (cx * cx + cy * cy <= r * r + cell * 0.9) {
          ctx.fillRect(x + ix * cell, y + iy * cell, cell, cell);
        }
      }
    }
  }

  function pixelRing(ctx, x, y, r, color, thickness, cell) {
    cell = cell || CELL;
    thickness = thickness || cell;
    var n = Math.ceil(r / cell);
    ctx.fillStyle = color;
    for (var iy = -n; iy <= n; iy++) {
      for (var ix = -n; ix <= n; ix++) {
        var cx = (ix + 0.5) * cell;
        var cy = (iy + 0.5) * cell;
        var d2 = cx * cx + cy * cy;
        var inner = r - thickness;
        if (d2 <= r * r + cell * 0.9 && d2 >= inner * inner - cell * 0.9) {
          ctx.fillRect(x + ix * cell, y + iy * cell, cell, cell);
        }
      }
    }
  }

  function Renderer(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.scale = 1;
    this.particles = [];
    this.shake = { mag: 0, t: 0 };
    this.flash = { a: 0 };
    this.reducedMotion = !!opts.reducedMotion;
    this.camera = { zoom: 1.1, x: 600, y: 345 };
    this.time = 0;
    this.hop = null;
    this.trail = [];
    this.lastReadyKey = null;
    this.lastPhase = null;
    this.resize();
  }

  Renderer.prototype.resize = function () {
    var canvas = this.canvas;
    var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    var w = Math.max(320, (rect && rect.width) || canvas.clientWidth || W);
    var h = Math.max(180, (rect && rect.height) || canvas.clientHeight || H);
    var dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
    this.dpr = dpr;
    this.cssW = w;
    this.cssH = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    this.scale = Math.min(w / W, h / H);
    this.offX = (w - W * this.scale) / 2;
    this.offY = (h - H * this.scale) / 2;
  };

  Renderer.prototype.screenToWorld = function (clientX, clientY) {
    var rect = this.canvas.getBoundingClientRect();
    var dx = (clientX - rect.left - this.offX) / this.scale;
    var dy = (clientY - rect.top - this.offY) / this.scale;
    return {
      x: this.camera.x + (dx - W / 2) / this.camera.zoom,
      y: this.camera.y + (dy - H / 2) / this.camera.zoom
    };
  };

  Renderer.prototype.spawnParticles = function (x, y, color, count, power) {
    if (this.reducedMotion) { count = Math.min(count, 6); }
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (90 + Math.random() * 340) * (power || 1);
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 140,
        size: 4 + Math.floor(Math.random() * 3) * 2,
        color: color,
        life: 0.5 + Math.random() * 0.7,
        t: 0
      });
    }
    if (this.particles.length > 420) { this.particles.splice(0, this.particles.length - 420); }
  };

  Renderer.prototype.handleEvents = function (events) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.type === 'break') {
        this.spawnParticles(e.x, e.y, e.color, 14, 1.1);
        this.shake.mag = Math.min(14, this.shake.mag + 5 * (e.power || 1));
        this.shake.t = 0.22;
      } else if (e.type === 'pop') {
        this.spawnParticles(e.x, e.y, C.white, 10, 0.8);
        this.spawnParticles(e.x, e.y, C.amber, 4, 0.9);
        this.shake.mag = Math.min(16, this.shake.mag + 7);
        this.shake.t = 0.25;
      } else if (e.type === 'boom') {
        this.spawnParticles(e.x, e.y, C.amber, 26, 1.6);
        this.spawnParticles(e.x, e.y, C.liquid, 18, 1.4);
        this.shake.mag = 18; this.shake.t = 0.4;
        this.flash.a = 0.5;
      } else if (e.type === 'dash') {
        this.spawnParticles(e.x, e.y, C.liquid, 8, 0.6);
      } else if (e.type === 'crack') {
        if (!this.reducedMotion) { this.shake.mag = Math.min(10, this.shake.mag + 2); this.shake.t = 0.12; }
      } else if (e.type === 'launch') {
        this.spawnParticles(e.x, e.y, C.white, 6, 0.5);
      }
    }
  };

  // ------------------------------------------------------------------ scene

  function drawBackdrop(ctx, time) {
    ctx.fillStyle = C.navy;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = rgba('#22D3EE', 0.06);
    for (var x = 0; x <= W; x += 32) {
      for (var y = 0; y <= H; y += 32) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // distant lab skyline (behind the action, flat silhouettes)
    var towers = [
      { x: 96, w: 170, h: 150, y: GROUND - 150 },
      { x: 290, w: 120, h: 210, y: GROUND - 210 },
      { x: 1150, w: 150, h: 120, y: GROUND - 120 },
      { x: 40, w: 44, h: 84, y: GROUND - 84 }
    ];
    for (var i = 0; i < towers.length; i++) {
      var t = towers[i];
      ctx.fillStyle = rgba('#141B34', 0.9);
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.fillStyle = rgba('#22D3EE', 0.2);
      for (var wy = t.y + 18; wy < GROUND - 16; wy += 24) {
        for (var wx = t.x + 14; wx < t.x + t.w - 14; wx += 22) {
          ctx.fillRect(wx, wy, 7, 7);
        }
      }
    }

    // ground plate
    ctx.fillStyle = C.panel;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = C.cyan;
    ctx.fillRect(0, GROUND - 3, W, 3);
    ctx.fillStyle = rgba('#67E8F9', 0.4);
    for (var gx = 0; gx < W; gx += 20) {
      ctx.fillRect(gx, GROUND + 10, 10, 3);
    }
    ctx.fillStyle = rgba('#0B1020', 0.5);
    for (var gx2 = 0; gx2 < W; gx2 += 80) {
      ctx.fillRect(gx2, GROUND + 30, 40, 2);
      ctx.fillRect(gx2 + 20, GROUND + 56, 40, 2);
    }
    // ground block seam
    ctx.fillStyle = rgba('#22D3EE', 0.16);
    for (var gx3 = 0; gx3 < W; gx3 += 64) {
      ctx.fillRect(gx3, GROUND + 3, 2, H - GROUND - 3);
    }
  }

  function drawSlingBack(ctx) {
    var sx = SLING.x, sy = SLING.y;
    ctx.fillStyle = C.white;
    ctx.fillRect(sx - 10, sy + 8, 20, GROUND - sy - 8);
    ctx.fillStyle = C.panel;
    ctx.fillRect(sx - 3, sy + 30, 6, GROUND - sy - 36);
    ctx.fillStyle = C.cyan;
    ctx.fillRect(sx - 10, sy + 8, 20, 8);
    ctx.fillStyle = C.white;
    ctx.fillRect(sx - 22, GROUND - 6, 44, 6);
    slingArms(ctx, C.white, 13);
    ctx.fillStyle = C.cyan;
    ctx.fillRect(sx - 32, sy - 25, 12, 9);
    ctx.fillRect(sx + 20, sy - 25, 12, 9);
  }

  function slingArms(ctx, color, width) {
    var sx = SLING.x, sy = SLING.y;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy + 27);
    ctx.lineTo(sx - 27, sy - 18);
    ctx.moveTo(sx + 8, sy + 27);
    ctx.lineTo(sx + 27, sy - 18);
    ctx.stroke();
  }

  function drawSlingFront(ctx) {
    var sx = SLING.x, sy = SLING.y;
    // a small lip so the bird reads as being held by the pouch
    ctx.fillStyle = C.panel;
    ctx.fillRect(sx - 12, sy + 16, 24, 7);
    ctx.fillStyle = C.cyan;
    ctx.fillRect(sx - 12, sy + 16, 24, 2);
  }

  function drawBands(ctx, game) {
    var sx = SLING.x;
    var bx = game.aim.active ? game.aim.x : sx;
    var by = game.aim.active ? game.aim.y : SLING.y;
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx - 24, SLING.y - 22);
    ctx.lineTo(bx, by);
    ctx.lineTo(sx + 24, SLING.y - 22);
    ctx.stroke();
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx - 24, SLING.y - 22);
    ctx.lineTo(bx, by);
    ctx.lineTo(sx + 24, SLING.y - 22);
    ctx.stroke();
  }

  function blockPalette(mat) {
    switch (mat) {
      case 'wall': return { fill: C.white, line: C.navy, detail: rgba('#0B1020', 0.18), light: C.cyan };
      case 'glass': return { fill: rgba('#22D3EE', 0.34), line: C.cyan, detail: rgba('#F8FAFC', 0.5), light: C.liquid };
      case 'deep': return { fill: C.panel, line: C.cyan, detail: rgba('#22D3EE', 0.55), light: C.liquid };
      default: return { fill: C.panel, line: C.liquid, detail: rgba('#67E8F9', 0.35), light: C.cyan };
    }
  }

  function drawBlock(ctx, b) {
    var pal = blockPalette(b.material);
    var hw = b.w / 2, hh = b.h / 2;
    var dmg = 1 - Math.max(0, b.hp) / Math.max(0.0001, b.maxHp);

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    ctx.fillStyle = pal.fill;
    ctx.fillRect(-hw, -hh, b.w, b.h);

    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 3;
    ctx.strokeRect(-hw + 1.5, -hh + 1.5, b.w - 3, b.h - 3);

    var cs = Math.min(8, Math.max(4, Math.min(b.w, b.h) * 0.16));
    ctx.fillStyle = pal.light;
    var corners = [[-hw + 4, -hh + 4], [hw - cs - 4, -hh + 4], [-hw + 4, hh - cs - 4], [hw - cs - 4, hh - cs - 4]];
    for (var i = 0; i < corners.length; i++) {
      ctx.fillRect(corners[i][0], corners[i][1], cs, cs);
    }

    if (b.material === 'deep') {
      ctx.fillStyle = pal.detail;
      ctx.fillRect(-hw * 0.5, -hh * 0.5, hw, hh);
    } else if (b.material === 'wall') {
      ctx.fillStyle = pal.detail;
      ctx.fillRect(-hw + 7, -hh + 8, b.w - 14, 4);
      ctx.fillRect(-hw + 7, hh - 12, b.w - 14, 4);
    } else if (b.material === 'glass') {
      ctx.fillStyle = rgba('#F8FAFC', 0.32);
      ctx.fillRect(-hw + 9, -hh + 8, Math.max(3, b.w * 0.16), Math.max(3, b.h - 16));
    }

    if (dmg > 0.12) {
      ctx.strokeStyle = b.material === 'wall' ? C.navy : C.white;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      var seed = (b.id * 37) % 100 / 100;
      ctx.moveTo(-hw * 0.55 + seed * 10, -hh + 5);
      ctx.lineTo(-hw * 0.3 + seed * 8, 0);
      ctx.lineTo(-hw * 0.6, hh - 5);
      if (dmg > 0.45) {
        ctx.moveTo(hw * 0.2, -hh + 3);
        ctx.lineTo(hw * 0.48, hh * 0.22);
        ctx.lineTo(hw * 0.26, hh - 4);
      }
      ctx.stroke();
      if (dmg > 0.72) {
        ctx.strokeStyle = C.amber;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-hw + 5, -hh + 5);
        ctx.lineTo(hw - 5, -hh + 5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  // One visible wing, tinted so it reads on any body colour.
  function wing(ctx, flap, r, alpha) {
    ctx.save();
    ctx.translate(-r * 0.1, r * 0.05);
    ctx.rotate(flap);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.navy;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.8, -r * 0.2);
    ctx.lineTo(-r * 0.72, r * 0.5);
    ctx.lineTo(-r * 0.05, r * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function tailFeathers(ctx, color, r) {
    ctx.fillStyle = color;
    ctx.fillRect(-r - 8, -6, 7, 5);
    ctx.fillRect(-r - 11, 0, 8, 5);
    ctx.fillRect(-r - 8, 6, 7, 5);
  }

  function drawBug(ctx, b, time) {
    var r = b.r;
    var bob = Math.sin(time * 3.2 + b.id * 1.3) * 1.6;
    var hurt = b.hp < b.maxHp - 0.01;

    ctx.save();
    ctx.translate(b.x, b.y + bob);
    ctx.rotate(b.angle * 0.16);

    // legs — cyan so they read on navy ground
    var step = Math.sin(time * 6 + b.id) * 2;
    ctx.fillStyle = rgba('#22D3EE', 0.85);
    ctx.fillRect(-11, r - 3, 4, 8 + step);
    ctx.fillRect(7, r - 3, 4, 8 - step);
    ctx.fillRect(-17, r - 5, 4, 6);
    ctx.fillRect(13, r - 5, 4, 6);

    // body
    pixelCircle(ctx, 0, 0, r, C.white, 4);
    pixelRing(ctx, 0, 0, r, C.navy, 2, 4);

    // eye sockets
    ctx.fillStyle = C.navy;
    ctx.fillRect(-11, -9, 22, 13);
    ctx.fillStyle = C.amber;
    ctx.fillRect(-9, -7, 7, 8);
    ctx.fillRect(3, -7, 7, 8);
    ctx.fillStyle = C.white;
    ctx.fillRect(-8, -6, 2, 2);
    ctx.fillRect(4, -6, 2, 2);
    ctx.fillStyle = C.navy;
    ctx.fillRect(-7, -3, 3, 3);
    ctx.fillRect(5, -3, 3, 3);

    // grin
    ctx.fillStyle = C.navy;
    ctx.fillRect(-7, 6, 3, 3);
    ctx.fillRect(-4, 9, 8, 3);
    ctx.fillRect(2, 6, 3, 3);

    // antennae, drawn last so they sit above the head
    var sway = Math.sin(time * 2.2 + b.id) * 2;
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -r + 2);
    ctx.lineTo(-9 + sway, -r - 10);
    ctx.moveTo(5, -r + 2);
    ctx.lineTo(9 + sway, -r - 10);
    ctx.stroke();
    ctx.fillStyle = C.amber;
    ctx.fillRect(-12 + sway, -r - 13, 5, 5);
    ctx.fillRect(7 + sway, -r - 13, 5, 5);

    // circuit glitch pixels
    if (Math.sin(time * 5 + b.id * 3) > 0.3) {
      ctx.fillStyle = C.cyan;
      ctx.fillRect(r - 6, 1, 3, 3);
      ctx.fillRect(-r + 3, 6, 3, 3);
    }

    if (hurt) {
      ctx.strokeStyle = C.navy;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r + 5, -r + 7);
      ctx.lineTo(-7, -3);
      ctx.lineTo(-13, 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * One bird, drawn from the same pixel vocabulary as the mark.
   *
   * @param {Object} b     {x, y, r, angle, vx, vy}
   * @param {string} type  byte | bolt | spark
   * @param {number} time  Seconds.
   * @param {Object} opts  { scale, alpha, flying }
   */
  function drawBird(ctx, b, type, time, opts) {
    opts = opts || {};
    var r = b.r;
    var scale = opts.scale || 1;
    var flying = !!opts.flying;
    var flap = flying ? Math.sin(time * 24) * 0.6 : Math.sin(time * 3.2) * 0.12;

    var body = C.cyan;
    if (type === 'bolt') { body = C.liquid; }
    if (type === 'spark') { body = C.amber; }

    var heading = 0;
    if (flying && b.vx) {
      var sp = Math.sqrt(b.vx * b.vx + (b.vy || 0) * (b.vy || 0));
      if (sp > 80) { heading = Math.atan2(b.vy, b.vx) * 0.45; }
    }

    ctx.save();
    ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
    ctx.translate(b.x, b.y);
    ctx.rotate(heading);
    ctx.scale(scale, scale);

    // tail
    ctx.fillStyle = C.navy;
    ctx.fillRect(-r - 8, -6, 8, 4);
    ctx.fillRect(-r - 11, 0, 9, 4);

    // body
    pixelCircle(ctx, 0, 0, r, body, 4);
    pixelRing(ctx, 0, 0, r, C.navy, 2, 4);

    // belly
    pixelCircle(ctx, 1, r * 0.44, r * 0.4, C.white, 4);

    // near wing
    wing(ctx, -flap, r * 0.85, 0.55);

    if (type === 'spark') {
      // fuse
      ctx.fillStyle = C.navy;
      ctx.fillRect(-3, -r - 11, 4, 11);
      var sparkle = Math.sin(time * 10) > 0 ? 6 : 4;
      ctx.fillStyle = C.white;
      ctx.fillRect(-4, -r - 15, sparkle, sparkle);
      ctx.fillStyle = C.amber;
      ctx.fillRect(-2, -r - 18, 4, 4);
      // visor
      ctx.fillStyle = C.navy;
      ctx.fillRect(-12, -8, 25, 10);
      ctx.fillStyle = C.amber;
      ctx.fillRect(-9, -6, 6, 5);
      ctx.fillRect(3, -6, 6, 5);
      ctx.fillStyle = C.white;
      ctx.fillRect(-8, -5, 2, 2);
      ctx.fillRect(4, -5, 2, 2);
    } else if (type === 'bolt') {
      // lightning crest
      ctx.fillStyle = C.navy;
      ctx.fillRect(-3, -r - 10, 6, 6);
      ctx.fillRect(3, -r - 6, 6, 6);
      ctx.fillRect(-9, -r - 6, 6, 6);
      // visor
      ctx.fillStyle = C.navy;
      ctx.fillRect(-12, -8, 25, 9);
      ctx.fillStyle = C.liquid;
      ctx.fillRect(-9, -6, 8, 4);
      ctx.fillRect(1, -6, 8, 4);
      ctx.fillStyle = C.white;
      ctx.fillRect(-8, -5, 3, 2);
      ctx.fillRect(2, -5, 3, 2);
    } else {
      // crest
      ctx.fillStyle = C.navy;
      ctx.fillRect(-7, -r - 7, 4, 8);
      ctx.fillRect(-2, -r - 10, 4, 11);
      ctx.fillRect(3, -r - 7, 4, 8);
      // eye
      ctx.fillStyle = C.white;
      ctx.fillRect(-2, -11, 12, 12);
      ctx.fillStyle = C.navy;
      ctx.fillRect(2, -8, 5, 6);
      ctx.fillStyle = C.white;
      ctx.fillRect(3, -7, 2, 2);
      // angry brow
      ctx.fillStyle = C.navy;
      ctx.fillRect(-4, -14, 15, 4);
    }

    // beak — the one warm accent, and the thing that says "bird"
    ctx.fillStyle = C.amber;
    ctx.fillRect(r - 5, -3, 10, 6);
    ctx.fillRect(r + 3, 0, 7, 4);
    ctx.fillStyle = C.navy;
    ctx.fillRect(r + 1, -3, 2, 6);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawQueue(ctx, game, renderer) {
    if (game.phase !== 'ready' || !game.birdType) { return; }
    var q = game.queue;
    var visible = Math.min(q.length - 1, 4);
    for (var i = 1; i <= visible; i++) {
      var type = q[i];
      if (!type) { continue; }
      var spec = type === 'spark' ? 22 : (type === 'bolt' ? 18 : 20);
      var scale = 0.64;
      var x = SLING.x - 56 - (i - 1) * 47;
      var y = GROUND - spec * scale - 3 + Math.sin(renderer.time * 2.6 + i * 1.4) * 2;
      drawBird(ctx, { x: x, y: y, r: spec, angle: 0 }, type, renderer.time + i, {
        scale: scale,
        alpha: 0.92 - i * 0.09,
        flying: false
      });
    }
  }

  function drawTrail(ctx, trail) {
    for (var i = 0; i < trail.length; i++) {
      var g = trail[i];
      var a = Math.max(0, 1 - g.t / 0.3) * 0.5;
      if (a <= 0.02) { continue; }
      ctx.globalAlpha = a;
      ctx.fillStyle = g.color;
      var s = 6 - Math.min(4, g.t * 12) * 2;
      ctx.fillRect(g.x - s / 2, g.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }

  function drawAimGuide(ctx, game) {
    if (!game.aim.active || game.aim.power < 0.05) { return; }
    var v = game.launchVelocity();
    var x = game.aim.x, y = game.aim.y;
    var g = 1500;
    for (var i = 1; i <= 26; i++) {
      var t = i * 0.058;
      var px = x + v.x * t;
      var py = y + v.y * t + 0.5 * g * t * t;
      if (py > GROUND || px > W + 20) { break; }
      var a = Math.max(0.12, 0.9 - i * 0.028);
      ctx.fillStyle = rgba('#67E8F9', a);
      var s = i % 3 === 0 ? 7 : 5;
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
    ctx.strokeStyle = rgba('#22D3EE', 0.8);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(SLING.x, SLING.y, 68, Math.PI * 0.15, Math.PI * 0.15 + Math.PI * 1.2 * game.aim.power);
    ctx.stroke();
  }

  function drawParticles(ctx, list) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  Renderer.prototype.draw = function (game, dt) {
    var ctx = this.ctx;
    var w = this.cssW, h = this.cssH;
    this.time += dt;
    dt = Math.min(dt || 0, 0.05);

    // the freshly loaded bird hops from the queue onto the sling
    var readyKey = (game.phase === 'ready' && game.queue.length) ? game.queue.join(',') : null;
    if (readyKey && readyKey !== this.lastReadyKey && this.lastPhase !== null) {
      this.hop = {
        t: 0,
        dur: 0.42,
        from: { x: SLING.x - 56, y: GROUND - 16 }
      };
    }
    this.lastReadyKey = readyKey;
    this.lastPhase = game.phase;

    // flight trail
    if (game.bird && game.bird.alive && game.phase === 'flying') {
      this.trail.push({
        x: game.bird.x,
        y: game.bird.y,
        color: game.bird.birdType === 'spark' ? C.amber : (game.bird.birdType === 'bolt' ? C.liquid : C.cyan),
        t: 0
      });
      if (this.trail.length > 12) { this.trail.shift(); }
    }
    for (var ti = this.trail.length - 1; ti >= 0; ti--) {
      this.trail[ti].t += dt;
      if (this.trail[ti].t > 0.3) { this.trail.splice(ti, 1); }
    }

    var list = this.particles;
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.t += dt;
      if (p.t >= p.life) { list.splice(i, 1); continue; }
      p.vy += 1000 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > GROUND - 2) { p.y = GROUND - 2; p.vy *= -0.28; p.vx *= 0.7; }
    }

    if (this.shake.t > 0) {
      this.shake.t -= dt;
      if (this.shake.t <= 0) { this.shake.mag = 0; }
    }
    if (this.flash.a > 0) { this.flash.a = Math.max(0, this.flash.a - dt * 2.2); }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var shx = 0, shy = 0;
    if (this.shake.t > 0 && !this.reducedMotion) {
      shx = (Math.random() - 0.5) * this.shake.mag;
      shy = (Math.random() - 0.5) * this.shake.mag;
    }
    var cam = this.camera;

    ctx.save();
    ctx.translate(this.offX + shx, this.offY + shy);
    ctx.scale(this.scale, this.scale);
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    ctx.beginPath();
    ctx.rect(cam.x - W / (2 * cam.zoom), cam.y - H / (2 * cam.zoom), W / cam.zoom, H / cam.zoom);
    ctx.clip();

    drawBackdrop(ctx, this.time);
    drawAimGuide(ctx, game);
    drawSlingBack(ctx);

    var blocks = game.blocks, bugs = game.bugs;
    for (var bi = 0; bi < blocks.length; bi++) {
      if (blocks[bi].alive) { drawBlock(ctx, blocks[bi]); }
    }
    for (var gi = 0; gi < bugs.length; gi++) {
      if (bugs[gi].alive) { drawBug(ctx, bugs[gi], this.time); }
    }

    drawTrail(ctx, this.trail);
    drawQueue(ctx, game, this);

    drawBands(ctx, game);
    if (game.phase === 'ready' && game.birdType && !game.bird) {
      var bx = game.aim.active ? game.aim.x : SLING.x;
      var by = game.aim.active ? game.aim.y : SLING.y;
      var spec = (game.birdType === 'spark') ? 22 : (game.birdType === 'bolt' ? 18 : 20);
      var hop = (this.hop && !game.aim.active) ? this.hop : null;
      if (hop) {
        var p = hop.t / hop.dur;
        var e = p < 1 ? 1 - Math.pow(1 - p, 3) : 1;
        bx = hop.from.x + (SLING.x - hop.from.x) * e;
        by = hop.from.y + (SLING.y - hop.from.y) * e - Math.sin(Math.PI * Math.min(1, p)) * 34;
        if (p >= 1) { this.hop = null; }
      }
      drawBird(ctx, { x: bx, y: by, r: spec, angle: 0 }, game.birdType, this.time, { flying: !!hop });
      if (this.hop) { this.hop.t += dt; }
    } else if (game.bird && game.bird.alive) {
      drawBird(ctx, game.bird, game.bird.birdType, this.time, { flying: true });
    }

    drawSlingFront(ctx);
    drawParticles(ctx, list);

    if (this.flash.a > 0) {
      ctx.fillStyle = rgba('#F8FAFC', this.flash.a * 0.45);
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  };

  return {
    Renderer: Renderer,
    colors: C,
    WORLD: { w: W, h: H, ground: GROUND },
    pixelCircle: pixelCircle
  };
}));







