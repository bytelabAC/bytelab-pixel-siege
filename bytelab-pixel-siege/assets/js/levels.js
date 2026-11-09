/*!
 * BYTELAB Pixel Siege — level data
 * World is 1280 x 720 design units. Ground surface sits at y = 640.
 * Every structure is authored from the ground up so that each piece rests
 * exactly on the surface below it (no initial overlap, no floating).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  root.BYTELAB_Levels = api;
  if (typeof module === 'object' && module.exports) { module.exports = api; }
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var GROUND = 570;
  var W = 1280;
  var H = 720;
  var SLING = { x: 196, y: 446 };

  var STUD_W = 28;
  var LINTEL_TH = 24;

  function block(x, y, w, h, m) {
    return { x: x, y: y, w: w, h: h, m: m || 'panel' };
  }

  function stud(x, baseY, h, m, w) {
    w = w || STUD_W;
    return block(x, baseY - h / 2, w, h, m || 'panel');
  }

  function lintel(cx, baseY, w, m, th) {
    th = th || LINTEL_TH;
    return block(cx, baseY - th / 2, w, th, m || 'panel');
  }

  function cube(x, baseY, size, m) {
    size = size || 40;
    return block(x, baseY - size / 2, size, size, m || 'panel');
  }

  function bug(x, surfaceY, r) {
    r = r || 20;
    return { x: x, y: surfaceY - r, r: r };
  }

  /**
   * Two studs + one lintel. Returns the y of the new top surface.
   */
  function frame(p, cx, span, baseY, studH, m, studW) {
    studW = studW || STUD_W;
    p.blocks.push(stud(cx - span / 2, baseY, studH, m, studW));
    p.blocks.push(stud(cx + span / 2, baseY, studH, m, studW));
    var top = baseY - studH;
    p.blocks.push(lintel(cx, top, span + studW + 32, m, LINTEL_TH));
    return top - LINTEL_TH;
  }

  function pack(blocks, bugs) { return { blocks: blocks || [], bugs: bugs || [] }; }

  var raw = [];

  // 1 · Hello, Byte — one hut, one bug, three bytes
  raw.push({
    fa: 'سلام، بایت', en: 'Hello, Byte',
    birds: ['byte', 'byte', 'byte'],
    stars: [1200, 2300],
    level: (function () {
      var p = pack();
      var top = frame(p, 880, 150, GROUND, 150);
      p.bugs.push(bug(880, top));
      return p;
    }())
  });

  // 2 · Two Huts — two huts, three bugs, four birds
  raw.push({
    fa: 'دو کلبه', en: 'Two Huts',
    birds: ['byte', 'byte', 'byte', 'bolt'],
    stars: [1800, 3000],
    level: (function () {
      var p = pack();
      var a = frame(p, 760, 110, GROUND, 120);
      var b = frame(p, 1040, 110, GROUND, 120);
      p.bugs.push(bug(760, a));
      p.bugs.push(bug(1040, b));
      p.bugs.push(bug(900, GROUND));
      return p;
    }())
  });

  // 3 · Lab Tower — three storeys, one bug per floor
  raw.push({
    fa: 'برج آزمایش', en: 'Lab Tower',
    birds: ['byte', 'bolt', 'byte', 'bolt'],
    stars: [2300, 3800],
    level: (function () {
      var p = pack();
      var base = GROUND;
      for (var s = 0; s < 3; s++) {
        p.bugs.push(bug(920, base));
        base = frame(p, 920, 130, base, 110);
      }
      p.blocks.push(cube(920, base, 40, 'glass'));
      return p;
    }())
  });

  // 4 · Pixel Pyramid — stacked cubes, bugs at the flanks
  raw.push({
    fa: 'هرم پیکسلی', en: 'Pixel Pyramid',
    birds: ['byte', 'bolt', 'byte', 'spark'],
    stars: [2600, 4200],
    level: (function () {
      var p = pack();
      var rows = 5, size = 40, cx = 940;
      for (var r = 0; r < rows; r++) {
        var count = rows - r;
        for (var i = 0; i < count; i++) {
          var x = cx - ((count - 1) * size) / 2 + i * size;
          p.blocks.push(cube(x, GROUND - r * size, size));
        }
      }
      p.bugs.push(bug(cx, GROUND - rows * size));
      p.bugs.push(bug(790, GROUND));
      p.bugs.push(bug(1090, GROUND));
      return p;
    }())
  });

  // 5 · Cyan Gates — three tall gates of glass under a stone lintel
  raw.push({
    fa: 'دروازه‌های فیروزه‌ای', en: 'Cyan Gates',
    birds: ['byte', 'bolt', 'byte', 'bolt'],
    stars: [3000, 4800],
    level: (function () {
      var p = pack();
      var xs = [820, 960, 1100];
      for (var i = 0; i < xs.length; i++) {
        p.blocks.push(stud(xs[i], GROUND, 190, i === 1 ? 'panel' : 'glass', 26));
      }
      var top = GROUND - 190;
      p.blocks.push(lintel(960, top, 330, 'wall', 24));
      p.bugs.push(bug(830, top - 24));
      p.bugs.push(bug(960, top - 24));
      p.bugs.push(bug(1090, top - 24));
      p.bugs.push(bug(760, GROUND));
      p.bugs.push(bug(1150, GROUND));
      return p;
    }())
  });

  // 6 · Fragile Glass — a glass hall, splash damage pays off
  raw.push({
    fa: 'شیشه‌های شکننده', en: 'Fragile Glass',
    birds: ['spark', 'byte', 'bolt', 'byte'],
    stars: [2800, 4400],
    level: (function () {
      var p = pack();
      for (var i = 0; i < 4; i++) {
        p.blocks.push(stud(760 + i * 110, GROUND, 150, 'glass', 26));
      }
      var top = GROUND - 150;
      p.blocks.push(lintel(925, top, 420, 'wall', 26));
      p.bugs.push(bug(815, GROUND));
      p.bugs.push(bug(925, GROUND));
      p.bugs.push(bug(1035, GROUND));
      p.blocks.push(cube(925, top - 26, 46, 'glass'));
      p.bugs.push(bug(925, top - 26 - 46));
      return p;
    }())
  });

  // 7 · Bug Alley — three small huts in a row
  raw.push({
    fa: 'کوچه باگ‌ها', en: 'Bug Alley',
    birds: ['byte', 'bolt', 'byte', 'bolt', 'byte'],
    stars: [3000, 5000],
    level: (function () {
      var p = pack();
      for (var i = 0; i < 3; i++) {
        var cx = 800 + i * 170;
        var top = frame(p, cx, 80, GROUND, 100, i % 2 ? 'glass' : 'panel', 22);
        p.bugs.push(bug(cx, top));
      }
      return p;
    }())
  });

  // 8 · The Bridge — a long span with bugs sheltering underneath
  raw.push({
    fa: 'پل', en: 'The Bridge',
    birds: ['byte', 'bolt', 'byte', 'spark'],
    stars: [3000, 5000],
    level: (function () {
      var p = pack();
      p.blocks.push(stud(800, GROUND, 170, 'wall', 34));
      p.blocks.push(stud(1090, GROUND, 170, 'wall', 34));
      var top = GROUND - 170;
      p.blocks.push(lintel(945, top, 360, 'wall', 28));
      var deck = top - 28;
      p.blocks.push(stud(945, deck, 90, 'glass', 24));
      p.blocks.push(cube(945, deck - 90, 44, 'panel'));
      p.bugs.push(bug(870, GROUND));
      p.bugs.push(bug(1020, GROUND));
      p.bugs.push(bug(945, deck - 134));
      return p;
    }())
  });

  // 9 · Fortress — thick walls, one bug well protected
  raw.push({
    fa: 'دژ', en: 'Fortress',
    birds: ['byte', 'bolt', 'spark', 'byte', 'bolt'],
    stars: [3200, 5400],
    level: (function () {
      var p = pack();
      for (var c = 0; c < 2; c++) {
        for (var r = 0; r < 3; r++) {
          p.blocks.push(block(830 + c * 150, GROUND - 29 - r * 58, 44, 58, 'wall'));
        }
      }
      var top = GROUND - 174;
      p.blocks.push(lintel(905, top, 300, 'wall', 26));
      var deck = top - 26;
      p.blocks.push(block(905, deck - 27, 90, 54, 'panel'));
      p.bugs.push(bug(905, GROUND));
      p.bugs.push(bug(905, deck - 54));
      p.bugs.push(bug(1105, GROUND));
      return p;
    }())
  });

  // 10 · The Flask — the mark, rebuilt in blocks
  raw.push({
    fa: 'فلاسک', en: 'The Flask',
    birds: ['byte', 'bolt', 'spark', 'bolt'],
    stars: [3400, 5600],
    level: (function () {
      var p = pack();
      var size = 40, cx = 1000;
      // base 7 wide, two rows
      for (var r = 0; r < 2; r++) {
        for (var i = 0; i < 7; i++) {
          p.blocks.push(cube(cx - 3 * size + i * size, GROUND - r * size, size, r === 0 ? 'panel' : 'glass'));
        }
      }
      // shoulders 5 wide
      for (var j = 0; j < 5; j++) {
        p.blocks.push(cube(cx - 2 * size + j * size, GROUND - 2 * size, size, 'deep'));
      }
      // neck 3 wide
      for (var k = 0; k < 3; k++) {
        p.blocks.push(cube(cx - size + k * size, GROUND - 3 * size, size, 'wall'));
      }
      // cap
      p.blocks.push(cube(cx, GROUND - 4 * size, size, 'deep'));
      p.bugs.push(bug(cx, GROUND - 5 * size));
      p.bugs.push(bug(790, GROUND));
      p.bugs.push(bug(1120, GROUND - 2 * size));
      return p;
    }())
  });

  // 11 · Twin Towers — two stacks joined by a lintel
  raw.push({
    fa: 'دو برج', en: 'Twin Towers',
    birds: ['byte', 'bolt', 'spark', 'byte', 'bolt'],
    stars: [3600, 6000],
    level: (function () {
      var p = pack();
      var left = 840, right = 1080;
      for (var r = 0; r < 4; r++) {
        p.blocks.push(block(left, GROUND - 29 - r * 58, 46, 58, r % 2 ? 'panel' : 'wall'));
        p.blocks.push(block(right, GROUND - 29 - r * 58, 46, 58, r % 2 ? 'panel' : 'wall'));
      }
      var top = GROUND - 232;
      p.blocks.push(lintel(960, top, 300, 'wall', 26));
      var deck = top - 26;
      p.blocks.push(cube(960, deck, 44, 'glass'));
      p.bugs.push(bug(960, GROUND));
      p.bugs.push(bug(960, deck - 44));
      p.bugs.push(bug(700, GROUND));
      return p;
    }())
  });

  // 12 · Final Test — the full lab
  raw.push({
    fa: 'آزمایش نهایی', en: 'Final Test',
    birds: ['byte', 'bolt', 'spark', 'bolt', 'byte', 'spark'],
    stars: [4800, 8000],
    level: (function () {
      var p = pack();
      // left hut
      var a = frame(p, 760, 100, GROUND, 120, 'wall');
      p.bugs.push(bug(760, a));
      // centre keep, three storeys
      var base = GROUND;
      for (var s = 0; s < 3; s++) {
        p.bugs.push(bug(975, base));
        base = frame(p, 975, 110, base, 110, s === 1 ? 'glass' : 'wall');
      }
      p.blocks.push(cube(975, base, 46, 'deep'));
      // right pedestal
      p.blocks.push(stud(1150, GROUND, 90, 'glass', 24));
      p.blocks.push(cube(1150, GROUND - 90, 44, 'panel'));
      p.bugs.push(bug(1150, GROUND - 134));
      return p;
    }())
  });

  // ------------------------------------------------------------------ export

  var levels = raw.map(function (lvl, i) {
    var max = lvl.level.blocks.length * 100 +
      lvl.level.bugs.length * 400 +
      Math.max(0, lvl.birds.length - 1) * 800;
    return {
      id: i + 1,
      name: { fa: lvl.fa, en: lvl.en },
      birds: lvl.birds.slice(),
      blocks: lvl.level.blocks,
      bugs: lvl.level.bugs,
      maxScore: max,
      stars: [Math.round(max * 0.55), Math.round(max * 0.82)],
      blockCount: lvl.level.blocks.length,
      bugCount: lvl.level.bugs.length
    };
  });

  return {
    GROUND: GROUND,
    WORLD_W: W,
    WORLD_H: H,
    SLING: SLING,
    levels: levels,
    get: function (i) { return levels[Math.max(0, Math.min(levels.length - 1, i))]; },
    count: levels.length
  };
}));









