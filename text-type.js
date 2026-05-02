// ===== TextType — Vanilla JS port of the React Bits component =====
// Animates the `placeholder` attribute of <input> / <textarea> elements.
// No GSAP or React required.

class TextType {
  constructor(el, opts = {}) {
    this.el           = el;
    this.texts        = Array.isArray(opts.text) ? opts.text : [opts.text];
    this.typingSpeed  = opts.typingSpeed  ?? 60;
    this.deletingSpeed= opts.deletingSpeed?? 28;
    this.pauseDuration= opts.pauseDuration?? 2200;
    this.loop         = opts.loop         ?? true;
    this.showCursor   = opts.showCursor   ?? true;
    this.cursorChar   = opts.cursorCharacter ?? '▎';
    this.speedMin     = opts.variableSpeedMin;
    this.speedMax     = opts.variableSpeedMax;

    this.idx      = 0;       // current text index
    this.display  = '';      // chars shown so far
    this.deleting = false;
    this.paused   = false;   // true while the field is focused
    this.timer    = null;
    this.cursorOn = true;

    // Cursor blink (CSS-less: toggle a character in placeholder)
    if (this.showCursor) {
      setInterval(() => {
        this.cursorOn = !this.cursorOn;
        this._setPlaceholder();
      }, 530);
    }

    // Pause while the user is focused on the field
    el.addEventListener('focus', () => {
      this.paused = true;
      clearTimeout(this.timer);
      el.placeholder = '';   // hide placeholder while typing
    });
    el.addEventListener('blur', () => {
      this.paused = false;
      if (!el.value) this._tick();  // resume only if field is still empty
    });

    this._tick();
  }

  _speed() {
    if (this.deleting) return this.deletingSpeed;
    if (this.speedMin != null && this.speedMax != null)
      return Math.random() * (this.speedMax - this.speedMin) + this.speedMin;
    return this.typingSpeed;
  }

  _setPlaceholder() {
    if (this.paused || this.el.value) return;   // don't override user input
    const cursor = this.showCursor
      ? (this.cursorOn ? this.cursorChar : '\u00a0') // nbsp keeps width stable
      : '';
    this.el.placeholder = this.display + cursor;
  }

  _tick() {
    if (this.paused) return;
    const current = this.texts[this.idx];

    if (this.deleting) {
      if (this.display.length > 0) {
        this.display = this.display.slice(0, -1);
        this._setPlaceholder();
        this.timer = setTimeout(() => this._tick(), this._speed());
      } else {
        this.deleting = false;
        this.idx = (this.idx + 1) % this.texts.length;
        this.timer = setTimeout(() => this._tick(), 350);
      }
    } else {
      if (this.display.length < current.length) {
        this.display += current[this.display.length];
        this._setPlaceholder();
        this.timer = setTimeout(() => this._tick(), this._speed());
      } else {
        // Finished typing — pause, then start deleting
        if (!this.loop && this.idx === this.texts.length - 1) return;
        this.timer = setTimeout(() => {
          this.deleting = true;
          this._tick();
        }, this.pauseDuration);
      }
    }
  }

  destroy() {
    clearTimeout(this.timer);
  }
}

// ===== Initialise on target elements =====
document.addEventListener('DOMContentLoaded', () => {

  // ── Message textarea ────────────────────────────────────────────────────────
  const msgArea = document.getElementById('inputText');
  if (msgArea) {
    new TextType(msgArea, {
      text: [
        'Type your secret message here...',
        'Your secrets never leave this browser...',
        'Write anything — AES-256 will guard it...',
        'Even I can\'t read it without the key... 😈',
      ],
      typingSpeed     : 55,
      deletingSpeed   : 22,
      pauseDuration   : 2600,
      showCursor      : true,
      cursorCharacter : '▎',
      variableSpeedMin: 38,
      variableSpeedMax: 88,
    });
  }

  // ── Password input ──────────────────────────────────────────────────────────
  const pwInput = document.getElementById('password');
  if (pwInput) {
    new TextType(pwInput, {
      text: [
        'Enter a strong password...',
        'Make it long and unguessable...',
        'Mix UPPER, lower, numb3rs & $ymb0ls...',
        'Min. OKAY strength required to encrypt...',
      ],
      typingSpeed     : 58,
      deletingSpeed   : 24,
      pauseDuration   : 2400,
      showCursor      : true,
      cursorCharacter : '▎',
      variableSpeedMin: 42,
      variableSpeedMax: 90,
    });
  }
});
