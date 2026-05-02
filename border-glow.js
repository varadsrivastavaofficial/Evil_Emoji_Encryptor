// ===== BorderGlow — Vanilla JS port of the React Bits component =====
class BorderGlow {
  constructor(el, opts = {}) {
    this.el             = el;
    this.edgeSensitivity= opts.edgeSensitivity ?? 13;
    this.glowColor      = opts.glowColor       ?? '130 100 50';
    this.backgroundColor= opts.backgroundColor ?? 'rgb(8,10,22)';
    this.borderRadius   = opts.borderRadius    ?? 6;
    this.glowRadius     = opts.glowRadius      ?? 80;
    this.glowIntensity  = opts.glowIntensity   ?? 1.2;
    this.coneSpread     = opts.coneSpread      ?? 31;
    this.animated       = opts.animated        ?? true;
    this.colors         = opts.colors          ?? ['#00ff88','#9d00ff','#ff0040'];
    this.fillOpacity    = opts.fillOpacity     ?? 0.2;
    this._setup();
    this._applyVars();
    this._bindEvents();
    if (this.animated) this._runSweep();
  }

  _setup() {
    const el = this.el;
    // Move existing children into .border-glow-inner
    const inner = document.createElement('div');
    inner.className = 'border-glow-inner';
    while (el.firstChild) inner.appendChild(el.firstChild);
    // Edge-light span (must come before inner for z-index)
    const edgeLight = document.createElement('span');
    edgeLight.className = 'edge-light';
    el.appendChild(edgeLight);
    el.appendChild(inner);
    el.classList.add('border-glow-card');
  }

  _applyVars() {
    const el = this.el;
    // Parse HSL
    const m = this.glowColor.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
    const [h, s, l] = m ? [m[1], m[2], m[3]] : [130, 100, 50];
    const base = `${h}deg ${s}% ${l}%`;
    [['',[100]],['-60',[60]],['-50',[50]],['-40',[40]],['-30',[30]],['-20',[20]],['-10',[10]]]
      .forEach(([k,[op]]) => el.style.setProperty(
        `--glow-color${k}`,
        `hsl(${base} / ${Math.min(op * this.glowIntensity, 100)}%)`
      ));

    // Gradient vars
    const positions = ['80% 55%','69% 34%','8% 6%','41% 38%','86% 85%','82% 18%','51% 4%'];
    const names     = ['one','two','three','four','five','six','seven'];
    const colorMap  = [0, 1, 2, 0, 1, 2, 1];
    positions.forEach((pos, i) => {
      const c = this.colors[Math.min(colorMap[i], this.colors.length - 1)];
      el.style.setProperty(`--gradient-${names[i]}`,
        `radial-gradient(at ${pos}, ${c} 0px, transparent 50%)`);
    });
    el.style.setProperty('--gradient-base', `linear-gradient(${this.colors[0]} 0 100%)`);

    // Config vars
    el.style.setProperty('--card-bg',          this.backgroundColor);
    el.style.setProperty('--edge-sensitivity',  this.edgeSensitivity);
    el.style.setProperty('--border-radius',    `${this.borderRadius}px`);
    el.style.setProperty('--glow-padding',     `${this.glowRadius}px`);
    el.style.setProperty('--cone-spread',       this.coneSpread);
    el.style.setProperty('--fill-opacity',      this.fillOpacity);
  }

  _bindEvents() {
    this.el.addEventListener('pointermove', e => {
      const rect = this.el.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const cx = rect.width / 2,       cy = rect.height / 2;
      const dx = x - cx, dy = y - cy;
      const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
      const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
      const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;
      this.el.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
      this.el.style.setProperty('--cursor-angle',   `${deg.toFixed(3)}deg`);
    });
  }

  _anim({ start=0, end=100, duration=1000, delay=0, easeIn=false, onUpdate, onEnd }) {
    const ease = easeIn ? x => x*x*x : x => 1 - Math.pow(1-x, 3);
    setTimeout(() => {
      const t0 = performance.now();
      const tick = () => {
        const t = Math.min((performance.now() - t0) / duration, 1);
        onUpdate(start + (end - start) * ease(t));
        if (t < 1) requestAnimationFrame(tick);
        else if (onEnd) onEnd();
      };
      requestAnimationFrame(tick);
    }, delay);
  }

  _runSweep() {
    const el = this.el, a0 = 110, a1 = 465;
    el.classList.add('sweep-active');
    el.style.setProperty('--cursor-angle', `${a0}deg`);
    this._anim({ duration: 500, onUpdate: v => el.style.setProperty('--edge-proximity', v) });
    this._anim({ easeIn: true, duration: 1500, end: 50,
      onUpdate: v => el.style.setProperty('--cursor-angle', `${(a1-a0)*(v/100)+a0}deg`) });
    this._anim({ duration: 2250, delay: 1500, start: 50, end: 100,
      onUpdate: v => el.style.setProperty('--cursor-angle', `${(a1-a0)*(v/100)+a0}deg`) });
    this._anim({ easeIn: true, duration: 1500, delay: 2500, start: 100, end: 0,
      onUpdate: v => el.style.setProperty('--edge-proximity', v),
      onEnd: () => el.classList.remove('sweep-active') });
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const card = document.querySelector('.card');
  if (card) {
    new BorderGlow(card, {
      edgeSensitivity : 13,
      glowColor       : '130 100 55',   // green to match --green: #00ff88
      backgroundColor : 'rgb(8,10,22)',
      borderRadius    : 6,
      glowRadius      : 80,
      glowIntensity   : 1.3,
      coneSpread      : 31,
      animated        : true,
      colors          : ['#00ff88', '#9d00ff', '#ff0040'],
      fillOpacity     : 0.18,
    });
  }
});
