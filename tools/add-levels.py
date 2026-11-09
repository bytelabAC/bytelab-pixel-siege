import io

p = r"C:\Users\pc\Downloads\bytelab-pixel-siege\bytelab-pixel-siege\assets\js\levels.js"
src = open(p, encoding='utf-8').read()

marker = "  // ------------------------------------------------------------------ export"
assert marker in src, 'marker missing'

new_levels = '''
  // 13 · Two-Storey — one bridge between two huts, bugs underneath it
  raw.push({
    fa: 'دو طبقه', en: 'Two-Storey',
    birds: ['byte', 'bolt', 'byte', 'bolt', 'spark'],
    level: (function () {
      var p = pack();
      var a = frame(p, 820, 110, GROUND, 120, 'panel');
      frame(p, 1040, 110, GROUND, 120, 'panel');
      p.blocks.push(lintel(930, a, 320, 'wall', 24));
      p.bugs.push(bug(820, GROUND));
      p.bugs.push(bug(1040, GROUND));
      p.bugs.push(bug(930, a - 24));
      return p;
    }())
  });

  // 14 · Elevator — four floors of glass and panels, one bug per floor
  raw.push({
    fa: 'آسانسور', en: 'Elevator',
    birds: ['bolt', 'byte', 'bolt', 'spark'],
    level: (function () {
      var p = pack();
      var base = GROUND;
      for (var s = 0; s < 4; s++) {
        p.bugs.push(bug(920, base));
        base = frame(p, 920, 90, base, 100, s % 2 ? 'glass' : 'panel', 24);
      }
      p.blocks.push(cube(920, base, 40, 'deep'));
      return p;
    }())
  });

  // 15 · Sand Castle — stone columns, a wide lintel, glass turrets
  raw.push({
    fa: 'قلعه شنی', en: 'Sand Castle',
    birds: ['byte', 'bolt', 'spark', 'byte'],
    level: (function () {
      var p = pack();
      for (var c = 0; c < 3; c++) {
        for (var r = 0; r < 2; r++) {
          p.blocks.push(block(860 + c * 100, GROUND - 29 - r * 58, 46, 58, 'wall'));
        }
      }
      var top = GROUND - 116;
      p.blocks.push(lintel(960, top, 320, 'panel', 24));
      p.blocks.push(cube(880, top - 24, 40, 'glass'));
      p.blocks.push(cube(1040, top - 24, 40, 'glass'));
      p.bugs.push(bug(910, GROUND));
      p.bugs.push(bug(1010, GROUND));
      p.bugs.push(bug(960, top - 24));
      return p;
    }())
  });

  // 16 · Four Towers — a bug on every turret
  raw.push({
    fa: 'چهار برج', en: 'Four Towers',
    birds: ['byte', 'bolt', 'byte', 'spark', 'bolt'],
    level: (function () {
      var p = pack();
      var xs = [780, 880, 980, 1080];
      for (var i = 0; i < xs.length; i++) {
        for (var r = 0; r < 3; r++) {
          p.blocks.push(block(xs[i], GROUND - 29 - r * 58, 46, 58, r === 1 ? 'deep' : 'wall'));
        }
        p.blocks.push(cube(xs[i], GROUND - 174, 40, 'glass'));
        p.bugs.push(bug(xs[i], GROUND - 214, 18));
      }
      return p;
    }())
  });

  // 17 · Steel Gate — reinforced frame, glass core, five bugs
  raw.push({
    fa: 'دروازه فولادی', en: 'Steel Gate',
    birds: ['bolt', 'spark', 'byte', 'bolt', 'spark', 'byte'],
    level: (function () {
      var p = pack();
      p.blocks.push(stud(820, GROUND, 210, 'deep', 34));
      p.blocks.push(stud(1080, GROUND, 210, 'deep', 34));
      var top = GROUND - 210;
      p.blocks.push(lintel(950, top, 380, 'deep', 26));
      var deck = top - 26;
      p.blocks.push(stud(950, deck, 90, 'glass', 24));
      p.blocks.push(cube(950, deck - 90, 44, 'wall'));
      p.bugs.push(bug(870, GROUND));
      p.bugs.push(bug(1030, GROUND));
      p.bugs.push(bug(880, deck));
      p.bugs.push(bug(1020, deck));
      p.bugs.push(bug(950, deck - 134, 18));
      return p;
    }())
  });

  // 18 · Staircase — four columns of descending height
  raw.push({
    fa: 'پله‌ها', en: 'Staircase',
    birds: ['byte', 'bolt', 'byte', 'spark', 'bolt'],
    level: (function () {
      var p = pack();
      for (var i = 0; i < 4; i++) {
        var h = 4 - i;
        for (var r = 0; r < h; r++) {
          p.blocks.push(block(820 + i * 62, GROUND - 29 - r * 58, 56, 58, r % 2 ? 'glass' : 'wall'));
        }
        p.bugs.push(bug(820 + i * 62, GROUND - h * 58, 18));
      }
      return p;
    }())
  });

  // 19 · Twin-Wing Keep — a wide hall with a second floor on top
  raw.push({
    fa: 'قلعه دو بال', en: 'Twin-Wing Keep',
    birds: ['byte', 'bolt', 'spark', 'bolt', 'byte', 'spark'],
    level: (function () {
      var p = pack();
      frame(p, 880, 130, GROUND, 130, 'wall');
      frame(p, 1040, 110, GROUND, 130, 'glass');
      p.blocks.push(lintel(960, GROUND - 130, 380, 'panel', 24));
      var deck = GROUND - 154;
      frame(p, 960, 100, deck, 100, 'deep');
      p.blocks.push(cube(960, deck - 124, 44, 'wall'));
      p.bugs.push(bug(880, GROUND));
      p.bugs.push(bug(1040, GROUND));
      p.bugs.push(bug(840, deck));
      p.bugs.push(bug(1080, deck));
      p.bugs.push(bug(960, deck - 168, 18));
      return p;
    }())
  });

  // 20 · Golden Flask — the finale, the mark at full size
  raw.push({
    fa: 'فلاسک طلایی', en: 'Golden Flask',
    birds: ['spark', 'bolt', 'spark', 'byte', 'bolt', 'spark'],
    level: (function () {
      var p = pack();
      var size = 44, cx = 1000;
      for (var r = 0; r < 2; r++) {
        for (var i = 0; i < 7; i++) {
          p.blocks.push(cube(cx - 3 * size + i * size, GROUND - r * size, size, r === 0 ? 'panel' : 'glass'));
        }
      }
      for (var j = 0; j < 5; j++) {
        p.blocks.push(cube(cx - 2 * size + j * size, GROUND - 2 * size, size, 'deep'));
      }
      for (var k = 0; k < 3; k++) {
        p.blocks.push(cube(cx - size + k * size, GROUND - 3 * size, size, 'wall'));
      }
      p.blocks.push(cube(cx, GROUND - 4 * size, size, 'deep'));
      p.bugs.push(bug(cx, GROUND - 5 * size, 18));
      p.bugs.push(bug(880, GROUND - 2 * size));
      p.bugs.push(bug(1120, GROUND - 2 * size));
      p.bugs.push(bug(780, GROUND));
      return p;
    }())
  });

'''

src = src.replace(marker, new_levels + marker, 1)

old_export = """  return {
    GROUND: GROUND,
    WORLD_W: W,
    WORLD_H: H,
    SLING: SLING,
    levels: levels,
    get: function (i) { return levels[Math.max(0, Math.min(levels.length - 1, i))]; },
    count: levels.length
  };"""

new_export = """  var api = {
    GROUND: GROUND,
    WORLD_W: W,
    WORLD_H: H,
    SLING: SLING,
    levels: levels,
    get: function (i) { return levels[Math.max(0, Math.min(levels.length - 1, i))]; },
    count: levels.length,
    /**
     * Append custom levels at runtime (JSON authoring format).
     *
     * @param {Array} list Raw level objects.
     * @return {number} How many were accepted.
     */
    extend: function (list) {
      var added = extend(list);
      api.count = levels.length;
      return added;
    }
  };

  return api;"""

assert old_export in src, 'export block missing'
src = src.replace(old_export, new_export, 1)

open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('levels now:', src.count('raw.push('))
