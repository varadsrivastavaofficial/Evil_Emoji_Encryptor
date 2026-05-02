// ===== DecryptedText — Vanilla JS port of the React Bits component =====

class DecryptedText {
  constructor(el, opts = {}) {
    this.el         = el;
    this.text       = opts.text ?? el.textContent.trim();
    this.speed      = opts.speed ?? 50;
    this.maxIter    = opts.maxIterations ?? 10;
    this.sequential = opts.sequential ?? false;
    this.direction  = opts.revealDirection ?? 'start';
    this.chars      = (opts.characters ?? '!@#$%^&*<>?/|~=+0123456789ABCDEF').split('');
    this.animateOn  = opts.animateOn ?? 'hover';
    this.clickMode  = opts.clickMode ?? 'once';
    this.encCls     = opts.encryptedClassName ?? 'dt-encrypted';
    this.revCls     = opts.className ?? '';

    this._disp      = this.text;
    this._revealed  = new Set();
    this._animating = false;
    this._decrypted = this.animateOn !== 'click';
    this._seen      = false;
    this._timer     = null;

    el.style.whiteSpace = 'pre-wrap';
    this._render();
    this._bind();
  }

  // Unicode-safe split (handles emoji, surrogate pairs)
  _split(str) { return [...str]; }

  _randChar() { return this.chars[Math.floor(Math.random() * this.chars.length)]; }

  _shuffle(revealed) {
    return this._split(this.text).map((ch, i) => {
      if (ch === ' ') return ' ';
      if (revealed.has(i)) return this._split(this.text)[i];
      return this._randChar();
    }).join('');
  }

  _render() {
    this.el.innerHTML = '';
    this._split(this._disp).forEach((ch, i) => {
      const span = document.createElement('span');
      const done = this._revealed.has(i) || (!this._animating && this._decrypted);
      span.className = done ? this.revCls : this.encCls;
      span.textContent = ch;
      this.el.appendChild(span);
    });
  }

  _nextIdx() {
    const len = this._split(this.text).length;
    switch (this.direction) {
      case 'end': return len - 1 - this._revealed.size;
      case 'center': {
        const mid = Math.floor(len / 2);
        const off = Math.floor(this._revealed.size / 2);
        const idx = this._revealed.size % 2 === 0 ? mid + off : mid - off - 1;
        if (idx >= 0 && idx < len && !this._revealed.has(idx)) return idx;
        for (let i = 0; i < len; i++) if (!this._revealed.has(i)) return i;
        return 0;
      }
      default: return this._revealed.size;
    }
  }

  decrypt() {
    if (this._animating) return;
    clearInterval(this._timer);
    this._revealed  = new Set();
    this._animating = true;
    this._decrypted = false;
    let iter = 0;
    const len = this._split(this.text).length;

    this._timer = setInterval(() => {
      if (this.sequential) {
        if (this._revealed.size < len) {
          this._revealed.add(this._nextIdx());
          this._disp = this._shuffle(this._revealed);
          this._render();
        } else {
          this._finish();
        }
      } else {
        this._disp = this._shuffle(this._revealed);
        this._render();
        if (++iter >= this.maxIter) this._finish();
      }
    }, this.speed);
  }

  _finish() {
    clearInterval(this._timer);
    this._animating = false;
    this._decrypted = true;
    this._disp = this.text;
    this._render();
  }

  reset() {
    clearInterval(this._timer);
    this._animating = false;
    this._revealed  = new Set();
    this._decrypted = true;
    this._disp = this.text;
    this._render();
  }

  encryptInstantly() {
    clearInterval(this._timer);
    this._animating = false;
    this._revealed  = new Set();
    this._decrypted = false;
    this._disp = this._shuffle(new Set());
    this._render();
  }

  _bind() {
    switch (this.animateOn) {
      case 'hover':
        this.el.addEventListener('mouseenter', () => this.decrypt());
        this.el.addEventListener('mouseleave', () => this.reset());
        break;

      case 'click':
        this.el.style.cursor = 'pointer';
        this.encryptInstantly();
        this.el.addEventListener('click', () => {
          if (this.clickMode === 'toggle' && this._decrypted) {
            this.encryptInstantly();
          } else if (!this._decrypted && !this._animating) {
            this.decrypt();
          }
        });
        break;

      case 'view': {
        const io = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting && !this._seen) {
              this._seen = true;
              this.decrypt();
            }
          });
        }, { threshold: 0.1 });
        io.observe(this.el);
        break;
      }
    }
  }
}

// ===== Initialise on all target elements =====
document.addEventListener('DOMContentLoaded', () => {
  const HACKER = '!@#$%^&*<>?/|~=+0123456789ABCDEF';

  // ── Title (h1) — decrypt from center on page load ─────────────────────────
  const title = document.querySelector('.title');
  if (title) {
    // Keep data-text for the glitch pseudo-elements
    new DecryptedText(title, {
      animateOn      : 'view',
      sequential     : true,
      revealDirection: 'center',
      speed          : 38,
      characters     : HACKER,
      encryptedClassName: 'dt-encrypted dt-title',
    });
  }

  // ── Badges — scramble then reveal on view ──────────────────────────────────
  document.querySelectorAll('.badge').forEach(el => {
    new DecryptedText(el, {
      animateOn  : 'view',
      sequential : false,
      maxIterations: 14,
      speed      : 45,
      characters : HACKER,
      encryptedClassName: 'dt-encrypted',
    });
  });

  // ── Footer text — sequential reveal on scroll into view ───────────────────
  document.querySelectorAll('.footer p').forEach(el => {
    new DecryptedText(el, {
      animateOn      : 'view',
      sequential     : true,
      revealDirection: 'start',
      speed          : 22,
      characters     : HACKER,
      encryptedClassName: 'dt-encrypted dt-footer',
    });
  });
});
