p = r"C:\Users\pc\Downloads\bytelab-pixel-siege\bytelab-pixel-siege\assets\js\levels.js"
src = open(p, encoding='utf-8').read()

start = src.index("  // 14 · Elevator")
end = src.index("  // 15 · Sand Castle")
old = src[start:end]

new = '''  // 14 · Elevator — a glass shaft between two pillars
  raw.push({
    fa: 'آسانسور', en: 'Elevator',
    birds: ['bolt', 'byte', 'bolt', 'spark'],
    level: (function () {
      var p = pack();
      p.blocks.push(stud(860, GROUND, 220, 'panel', 34));
      p.blocks.push(stud(980, GROUND, 220, 'panel', 34));
      var top = GROUND - 220;
      p.blocks.push(lintel(920, top, 250, 'glass', 26));
      var deck = top - 26;
      p.blocks.push(stud(920, deck, 90, 'deep', 28));
      p.blocks.push(cube(920, deck - 90, 44, 'wall'));
      p.bugs.push(bug(920, GROUND));
      p.bugs.push(bug(858, deck));
      p.bugs.push(bug(982, deck));
      p.bugs.push(bug(920, deck - 134, 18));
      return p;
    }())
  });

'''

src = src[:start] + new + src[end:]
open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('L14 rebuilt')
