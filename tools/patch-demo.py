p = r"C:\Users\pc\Downloads\bytelab-pixel-siege\tools\build-demo.js"
src = open(p, encoding='utf-8').read()

old_cfg = """const config = {
  level: 1,
  lang: 'fa',
  dir: 'rtl',
  sound: true,
  canSave: false,
  showBrand: true
};"""
new_cfg = """const config = {
  level: 1,
  lang: 'fa',
  dir: 'rtl',
  sound: true,
  canSave: false,
  showBrand: true,
  canBoard: true,
  leaderboardUrl: 'demo://leaderboard',
  userName: 'BYTELAB Demo'
};"""
assert old_cfg in src, 'config block'
src = src.replace(old_cfg, new_cfg, 1)

old_meta = '<span>12 LEVELS</span>'
new_meta = '<span>20 LEVELS</span>'
assert old_meta in src, 'meta'
src = src.replace(old_meta, new_meta, 1)

old_scripts = '<script>\n${scripts}\n</script>'
new_scripts = """<script>
/* The demo has no WordPress REST API, so serve a small sample leaderboard. */
window.fetch = function () {
  return Promise.resolve({
    ok: true,
    json: function () {
      return Promise.resolve({ entries: [
        { name: 'علی رضایی', score: 4820, stars: 3, you: true },
        { name: 'Sara K.', score: 4310, stars: 3 },
        { name: 'محمد', score: 3900, stars: 2 },
        { name: 'Nima', score: 3260, stars: 2 },
        { name: 'مهمان', score: 2100, stars: 1 }
      ] });
    }
  });
};
</script>
<script>
${scripts}
</script>"""
assert old_scripts in src, 'scripts block'
src = src.replace(old_scripts, new_scripts, 1)

open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('demo builder patched')
