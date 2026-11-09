/* Headless 2D canvas recorder — turns draw calls into primitives for rasterising. */
function parseColor(c) {
  if (!c || typeof c !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
  c = c.trim();
  if (c[0] === '#') {
    const hex = c.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16), a: 1
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16), a: 1
    };
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map(s => parseFloat(s));
    return { r: p[0] | 0, g: p[1] | 0, b: p[2] | 0, a: p.length > 3 ? p[3] : 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

class Recorder {
  constructor(w, h) {
    this.ops = [];
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.globalAlpha = 1;
    this.path = [];
    this.cur = null;
    this.w = w; this.h = h;
  }
  save() { this.stack.push(this.m.slice()); }
  restore() { if (this.stack.length) this.m = this.stack.pop(); }
  translate(x, y) { const m = this.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; }
  scale(x, y) { const m = this.m; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; }
  rotate(a) {
    const m = this.m, c = Math.cos(a), s = Math.sin(a);
    const a0 = m[0], b0 = m[1], c0 = m[2], d0 = m[3];
    m[0] = a0 * c + c0 * s; m[1] = b0 * c + d0 * s;
    m[2] = a0 * -s + c0 * c; m[3] = b0 * -s + d0 * c;
  }
  setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
  clearRect() { }
  _tp(x, y) { const m = this.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  beginPath() { this.path = []; this.cur = null; }
  closePath() { if (this.cur) this.cur.closed = true; }
  moveTo(x, y) { this.cur = { pts: [this._tp(x, y)], closed: false }; this.path.push(this.cur); }
  lineTo(x, y) { if (!this.cur) this.moveTo(x, y); else this.cur.pts.push(this._tp(x, y)); }
  rect(x, y, w, h) {
    this.cur = { pts: [this._tp(x, y), this._tp(x + w, y), this._tp(x + w, y + h), this._tp(x, y + h)], closed: true };
    this.path.push(this.cur);
  }
  arc(cx, cy, r, a0, a1, ccw) {
    const steps = 28;
    let span = a1 - a0;
    if (!ccw && span < 0) span += Math.PI * 2;
    if (ccw && span > 0) span -= Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + span * i / steps;
      pts.push(this._tp(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    this.cur = { pts, closed: false, arc: true };
    this.path.push(this.cur);
  }
  fill() {
    for (const p of this.path) {
      if (!p.pts.length) continue;
      const col = parseColor(this.fillStyle);
      this.ops.push({ t: 'poly', pts: p.pts, color: col, alpha: col.a * this.globalAlpha });
    }
  }
  stroke() {
    const col = parseColor(this.strokeStyle);
    const lw = this.lineWidth * Math.hypot(this.m[0], this.m[1]);
    for (const p of this.path) {
      const pts = p.closed ? p.pts.concat([p.pts[0]]) : p.pts;
      if (pts.length < 2) continue;
      this.ops.push({ t: 'line', pts, color: col, alpha: col.a * this.globalAlpha, w: Math.max(1, lw) });
    }
  }
  fillRect(x, y, w, h) {
    const pts = [this._tp(x, y), this._tp(x + w, y), this._tp(x + w, y + h), this._tp(x, y + h)];
    const col = parseColor(this.fillStyle);
    this.ops.push({ t: 'poly', pts, color: col, alpha: col.a * this.globalAlpha });
  }
  strokeRect(x, y, w, h) {
    const pts = [this._tp(x, y), this._tp(x + w, y), this._tp(x + w, y + h), this._tp(x, y + h), this._tp(x, y)];
    const col = parseColor(this.strokeStyle);
    this.ops.push({ t: 'line', pts, color: col, alpha: col.a * this.globalAlpha, w: Math.max(1, this.lineWidth * Math.hypot(this.m[0], this.m[1])) });
  }
  fillText() { }
  strokeText() { }
  measureText(t) { return { width: (t || '').length * 6 }; }
  setLineDash() { }
  createLinearGradient() { return { addColorStop() { } }; }
  createPattern() { return null; }
  clip() { }
  ellipse(x, y, rx, ry) { this.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2); }
  quadraticCurveTo(cx, cy, x, y) { this.lineTo(x, y); }
  bezierCurveTo(a, b, c, d, x, y) { this.lineTo(x, y); }
}

module.exports = { Recorder };
