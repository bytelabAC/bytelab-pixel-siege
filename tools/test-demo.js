/* Verify the single-file demo: structure, inline script syntax, config JSON. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'demo', 'bytelab-pixel-siege-demo.html');
const html = fs.readFileSync(file, 'utf8');

const problems = [];
if (!/<!doctype html>/i.test(html)) problems.push('missing doctype');
if (!html.includes('data-bytelab-game')) problems.push('missing game mount point');

// config json
const m = html.match(/data-bytelab-game='([^']+)'/);
let config = null;
if (!m) problems.push('no config attribute');
else {
  try { config = JSON.parse(m[1]); } catch (e) { problems.push('config JSON invalid: ' + e.message); }
}
console.log('config:', JSON.stringify(config));

// inline scripts
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]);
console.log('inline scripts:', blocks.length);
blocks.forEach((src, i) => {
  try {
    new vm.Script(src, { filename: 'inline-' + i + '.js' });
  } catch (e) {
    problems.push('script ' + i + ' syntax error: ' + e.message);
  }
});

// css balance
const style = html.match(/<style>([\s\S]*?)<\/style>/);
if (!style) problems.push('no inline style');
else {
  const css = style[1];
  const open = (css.match(/{/g) || []).length;
  const close = (css.match(/}/g) || []).length;
  if (open !== close) problems.push(`css braces unbalanced ${open}/${close}`);
}

// references that would break offline
if (/src=["']https?:/i.test(html) || /href=["']https?:/i.test(html)) problems.push('remote reference found (demo should be offline-safe)');
if (/src=["'](?!data:)[^"']*\.js/i.test(html)) problems.push('external script reference');

// sanity: expected brand tokens
['#0B1020', '#141B34', '#22D3EE', '#67E8F9', '#F59E0B', '#F8FAFC'].forEach((hex) => {
  if (!html.toUpperCase().includes(hex)) problems.push('missing brand token ' + hex);
});

console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'DEMO OK — single file, offline, ' + (html.length / 1024).toFixed(1) + ' kB');
process.exit(problems.length ? 1 : 0);
