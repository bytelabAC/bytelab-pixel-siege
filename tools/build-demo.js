/* Build a single-file, dependency-free demo of the game. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const plugin = path.join(root, 'bytelab-pixel-siege');
const js = path.join(plugin, 'assets', 'js');
const css = path.join(plugin, 'assets', 'css');

const read = (p) => fs.readFileSync(p, 'utf8');
const scripts = ['physics.js', 'levels.js', 'sim.js', 'render.js', 'game.js']
  .map((f) => `/* ---- ${f} ---- */\n` + read(path.join(js, f)))
  .join('\n');

const styles = read(path.join(css, 'game.css'));

const config = {
  level: 1,
  lang: 'fa',
  dir: 'rtl',
  sound: true,
  canSave: false,
  showBrand: true
};

const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BYTELAB · Pixel Siege — demo</title>
<meta name="description" content="BYTELAB Pixel Siege — a pull-and-fling physics game drawn in the BYTELAB Pixel Flask identity.">
<style>
  :root {
    --navy: #0B1020;
    --panel: #141B34;
    --cyan: #22D3EE;
    --liquid: #67E8F9;
    --amber: #F59E0B;
    --white: #F8FAFC;
    --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    --sans: "Vazirmatn", "Segoe UI", Tahoma, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--navy);
    color: var(--white);
    font-family: var(--sans);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28px 16px 40px;
    gap: 20px;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px);
    background-size: 32px 32px;
    z-index: 0;
  }
  header, main, footer { position: relative; z-index: 1; width: 100%; max-width: 1100px; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .brandline { display: flex; align-items: center; gap: 14px; direction: ltr; }
  .brandline svg { display: block; }
  .kicker {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.28em;
    color: var(--liquid);
    text-transform: uppercase;
  }
  .langs { display: flex; gap: 6px; }
  .langs button {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    padding: 8px 14px;
    background: transparent;
    color: var(--white);
    border: 2px solid rgba(103, 232, 249, 0.4);
    cursor: pointer;
  }
  .langs button[aria-pressed="true"] { background: var(--cyan); color: var(--navy); border-color: var(--cyan); }
  .langs button:hover { border-color: var(--cyan); }
  main { display: flex; flex-direction: column; gap: 18px; }
  .lead { margin: 0; max-width: 62ch; line-height: 1.9; color: rgba(248, 250, 252, 0.78); font-size: 14px; }
  .meta {
    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--liquid);
  }
  .meta span { border: 1px solid rgba(103, 232, 249, 0.3); padding: 5px 9px; }
  footer {
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; color: rgba(248, 250, 252, 0.45);
    text-transform: uppercase;
  }
  footer b { color: var(--cyan); font-weight: 400; }
  @media (max-width: 640px) {
    body { padding: 18px 12px 28px; }
    .lead { font-size: 13px; }
  }
${styles}
</style>
</head>
<body>
<header>
  <div class="brandline">
    <svg class="blps__flask" viewBox="0 0 41 36" width="34" height="30" aria-hidden="true" focusable="false">
      <rect x="12" y="0" width="5" height="5" fill="#F8FAFC"/><rect x="18" y="0" width="5" height="5" fill="#F8FAFC"/><rect x="24" y="0" width="5" height="5" fill="#F8FAFC"/>
      <rect x="12" y="6" width="5" height="5" fill="#F8FAFC"/><rect x="24" y="6" width="5" height="5" fill="#F8FAFC"/>
      <rect x="6" y="12" width="5" height="5" fill="#F8FAFC"/><rect x="12" y="12" width="5" height="5" fill="#F8FAFC"/><rect x="18" y="12" width="5" height="5" fill="#F59E0B"/><rect x="24" y="12" width="5" height="5" fill="#F8FAFC"/><rect x="30" y="12" width="5" height="5" fill="#F8FAFC"/>
      <rect x="0" y="18" width="5" height="5" fill="#F8FAFC"/><rect x="6" y="18" width="5" height="5" fill="#F8FAFC"/><rect x="12" y="18" width="5" height="5" fill="#22D3EE"/><rect x="18" y="18" width="5" height="5" fill="#22D3EE"/><rect x="24" y="18" width="5" height="5" fill="#22D3EE"/><rect x="30" y="18" width="5" height="5" fill="#F8FAFC"/><rect x="36" y="18" width="5" height="5" fill="#F8FAFC"/>
      <rect x="0" y="24" width="5" height="5" fill="#F8FAFC"/><rect x="6" y="24" width="5" height="5" fill="#22D3EE"/><rect x="12" y="24" width="5" height="5" fill="#22D3EE"/><rect x="18" y="24" width="5" height="5" fill="#22D3EE"/><rect x="24" y="24" width="5" height="5" fill="#22D3EE"/><rect x="30" y="24" width="5" height="5" fill="#22D3EE"/><rect x="36" y="24" width="5" height="5" fill="#F8FAFC"/>
      <rect x="0" y="30" width="5" height="5" fill="#F8FAFC"/><rect x="6" y="30" width="5" height="5" fill="#22D3EE"/><rect x="12" y="30" width="5" height="5" fill="#22D3EE"/><rect x="18" y="30" width="5" height="5" fill="#22D3EE"/><rect x="24" y="30" width="5" height="5" fill="#22D3EE"/><rect x="30" y="30" width="5" height="5" fill="#22D3EE"/><rect x="36" y="30" width="5" height="5" fill="#F8FAFC"/>
    </svg>
    <span class="blps__wordmark"><b>BYTE</b><span>LAB</span></span>
    <span class="kicker">Pixel Siege · demo</span>
  </div>
  <div class="langs" role="group" aria-label="Language">
    <button type="button" data-lang="fa" aria-pressed="true">فارسی</button>
    <button type="button" data-lang="en" aria-pressed="false">EN</button>
  </div>
</header>

<main>
  <p class="lead" id="lead">پرنده را از تیرکمان عقب بکش و رها کن. باگ‌ها را از بین ببر، بلوک‌ها را فرو بریز و ستاره بگیر. هر پرنده یک قابلیت دارد: «بولت» در حال پرواز شتاب می‌گیرد و «اسپارک» منفجر می‌شود.</p>
  <div class="meta" aria-hidden="true">
    <span>12 LEVELS</span><span>3 BIRDS</span><span>60% NAVY / 22% CYAN / 13% WHITE / 5% AMBER</span>
  </div>
  <div class="blps" style="--blps-max-h:720px" data-bytelab-game='${JSON.stringify(config)}'></div>
</main>

<footer>
  <span><b>BYTELAB</b> · brand style guide v1.3</span>
  <span>Byte Navy #0B1020 · Lab Cyan #22D3EE · Spark Amber #F59E0B</span>
</footer>

<script>
${scripts}
</script>
<script>
(function () {
  var root = document.querySelector('.blps');
  var lead = document.getElementById('lead');
  var copy = {
    fa: { lead: lead.textContent, htmlLang: 'fa', dir: 'rtl' },
    en: {
      lead: 'Drag the bird back on the slingshot and let go. Clear every bug, topple the blocks, collect stars. Each bird has a trick: BOLT dashes mid-flight and SPARK explodes.',
      htmlLang: 'en', dir: 'ltr'
    }
  };
  var buttons = document.querySelectorAll('[data-lang]');
  function setLang(lang) {
    var cfg = JSON.parse(root.getAttribute('data-bytelab-game'));
    cfg.lang = lang;
    cfg.dir = copy[lang].dir;
    cfg.level = 1;
    root.setAttribute('data-bytelab-game', JSON.stringify(cfg));
    root.removeAttribute('data-blps-ready');
    root.innerHTML = '';
    lead.textContent = copy[lang].lead;
    document.documentElement.lang = copy[lang].htmlLang;
    document.documentElement.dir = copy[lang].dir;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    window.BYTELAB_PixelSiege.boot();
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
  });
})();
</script>
</body>
</html>
`;

const outDir = path.join(root, 'demo');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'bytelab-pixel-siege-demo.html');
fs.writeFileSync(out, html, 'utf8');
console.log('wrote', out, (html.length / 1024).toFixed(1) + ' kB');


