p = r"C:\Users\pc\Downloads\bytelab-pixel-siege\bytelab-pixel-siege\assets\js\levels.js"
src = open(p, encoding='utf-8').read()

old19 = """      var p = pack();
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
      return p;"""

new19 = """      var p = pack();
      var wings = frame(p, 860, 110, GROUND, 130, 'wall');
      frame(p, 1060, 110, GROUND, 130, 'glass');
      p.blocks.push(lintel(960, wings, 380, 'panel', 24));
      var deck = wings - 24;
      frame(p, 960, 100, deck, 100, 'deep');
      p.blocks.push(cube(960, deck - 124, 44, 'wall'));
      p.bugs.push(bug(880, GROUND));
      p.bugs.push(bug(1040, GROUND));
      p.bugs.push(bug(840, deck));
      p.bugs.push(bug(1080, deck));
      p.bugs.push(bug(960, deck - 168, 18));
      return p;"""

assert old19 in src, 'L19 block missing'
src = src.replace(old19, new19, 1)

old20 = """      p.bugs.push(bug(cx, GROUND - 5 * size, 18));
      p.bugs.push(bug(880, GROUND - 2 * size));
      p.bugs.push(bug(1120, GROUND - 2 * size));
      p.bugs.push(bug(780, GROUND));"""

new20 = """      p.bugs.push(bug(cx, GROUND - 5 * size, 18));
      p.bugs.push(bug(868, GROUND - 2 * size, 18));
      p.bugs.push(bug(1132, GROUND - 2 * size, 18));
      p.bugs.push(bug(780, GROUND));"""

assert old20 in src, 'L20 block missing'
src = src.replace(old20, new20, 1)

open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('patched L19 + L20')
