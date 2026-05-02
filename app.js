// ===== 64-EMOJI BASE-64 TABLE =====
// 16 emojis from each of 4 categories = 64 symbols total.
// Encoding: 3 bytes → 4 emojis (6-bit groups), same math as base64.
// A 3-byte length header is prepended so no padding emoji are needed.
// Security is unchanged — the crypto (AES-256-GCM + PBKDF2) is identical.
const EMOJI64 = [
  // 00–0F │ Faces
  '😀','😄','😈','😌','😐','😔','😘','😜','😠','😤','😨','😬','😰','😴','😸','😼',
  // 10–1F │ Animals
  '🐀','🐄','🐈','🐌','🐐','🐔','🐘','🐜','🐠','🐤','🐨','🐬','🐰','🐴','🐸','🐼',
  // 20–2F │ Food
  '🍀','🍄','🍈','🍌','🍐','🍔','🍘','🍜','🍠','🍤','🍨','🍬','🍰','🍴','🍸','🍼',
  // 30–3F │ Transport
  '🚀','🚄','🚈','🚌','🚐','🚔','🚘','🚜','🚠','🚤','🚨','🚬','🚰','🚴','🚸','🚼',
];
const EMOJI64_MAP = Object.fromEntries(EMOJI64.map((e, i) => [e, i]));

function bytesToEmoji(bytes) {
  // Prepend 3-byte big-endian length so we can recover exact bytes on decode
  const N = bytes.length;
  const data = new Uint8Array(3 + N);
  data[0] = (N >> 16) & 0xFF;
  data[1] = (N >> 8)  & 0xFF;
  data[2] =  N        & 0xFF;
  data.set(bytes, 3);
  // Pad to next multiple of 3 with zeros
  const padded = new Uint8Array(Math.ceil(data.length / 3) * 3);
  padded.set(data);
  // 3 bytes → 4 emojis via 6-bit groups
  let out = '';
  for (let i = 0; i < padded.length; i += 3) {
    const b0 = padded[i], b1 = padded[i+1], b2 = padded[i+2];
    out += EMOJI64[(b0 >> 2) & 0x3F];
    out += EMOJI64[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += EMOJI64[((b1 & 0x0F) << 2) | (b2 >> 6)];
    out += EMOJI64[b2 & 0x3F];
  }
  return out;
}

function emojiToBytes(str) {
  const chars = [...str];
  if (chars.length < 4 || chars.length % 4 !== 0)
    throw new Error('Invalid emoji string — wrong format or corrupted.');
  // 4 emojis → 3 bytes
  const raw = new Uint8Array((chars.length / 4) * 3);
  for (let g = 0; g < chars.length; g += 4) {
    const c0 = EMOJI64_MAP[chars[g]];
    const c1 = EMOJI64_MAP[chars[g+1]];
    const c2 = EMOJI64_MAP[chars[g+2]];
    const c3 = EMOJI64_MAP[chars[g+3]];
    if ([c0,c1,c2,c3].some(v => v === undefined))
      throw new Error('Invalid emoji detected. Was this encrypted here?');
    const off = (g / 4) * 3;
    raw[off]   = (c0 << 2) | (c1 >> 4);
    raw[off+1] = ((c1 & 0xF) << 4) | (c2 >> 2);
    raw[off+2] = ((c2 & 0x3) << 6) | c3;
  }
  // Recover exact original byte count from 3-byte header
  const N = (raw[0] << 16) | (raw[1] << 8) | raw[2];
  if (N > raw.length - 3)
    throw new Error('Ciphertext too short — corrupted or wrong format.');
  return raw.slice(3, 3 + N);
}


// ===== CRYPTO =====
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(plaintext, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(salt.length + iv.length + cipherBuf.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(cipherBuf), 28);
  return bytesToEmoji(combined);
}

async function decryptText(emojiStr, password) {
  const bytes = emojiToBytes(emojiStr.trim());
  if (bytes.length < 29) throw new Error('Ciphertext too short — corrupted or wrong format.');
  const salt = bytes.slice(0, 16);
  const iv   = bytes.slice(16, 28);
  const data = bytes.slice(28);
  const key  = await deriveKey(password, salt);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}

// ===== STATE =====
let currentTab = 'encrypt';

// ===== UI HELPERS =====
function switchTab(tab) {
  currentTab = tab;
  document.getElementById('encryptTab').classList.toggle('tab--active', tab === 'encrypt');
  document.getElementById('decryptTab').classList.toggle('tab--active', tab === 'decrypt');

  const inputLabel  = document.getElementById('inputLabel');
  const actionIcon  = document.getElementById('actionIcon');
  const actionLabel = document.getElementById('actionLabel');
  const outputLabel = document.getElementById('outputLabel');

  if (tab === 'encrypt') {
    inputLabel.textContent  = '📝 PLAINTEXT MESSAGE';
    actionIcon.textContent  = '🔒';
    actionLabel.textContent = 'ENCRYPT';
    outputLabel.textContent = '🔐 ENCRYPTED OUTPUT';
  } else {
    inputLabel.textContent  = '🔐 EMOJI CIPHERTEXT';
    actionIcon.textContent  = '🔓';
    actionLabel.textContent = 'DECRYPT';
    outputLabel.textContent = '📝 DECRYPTED MESSAGE';
  }

  clearOutput();
  document.getElementById('inputText').value = '';
  document.getElementById('charCount').textContent = '0';
}

function clearOutput() {
  const sec = document.getElementById('outputSection');
  sec.classList.remove('visible');
  document.getElementById('outputBox').textContent = '';
  document.getElementById('errorBox').classList.remove('visible');
  document.getElementById('errorBox').textContent = '';
}

function clearAll() {
  document.getElementById('inputText').value = '';
  document.getElementById('password').value  = '';
  document.getElementById('charCount').textContent = '0';
  updateStrength('');
  clearOutput();
}

function showOutput(text) {
  const box = document.getElementById('outputBox');
  box.textContent = text;
  document.getElementById('outputSection').classList.add('visible');
}

function showError(msg) {
  const eb = document.getElementById('errorBox');
  eb.textContent = '⚠️ ' + msg;
  eb.classList.add('visible');
  document.getElementById('outputSection').classList.remove('visible');
}

async function copyOutput() {
  const text = document.getElementById('outputBox').textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ COPIED!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 COPY'; btn.classList.remove('copied'); }, 2000);
  } catch { showError('Clipboard access denied.'); }
}

function togglePassword() {
  const pw = document.getElementById('password');
  const btn = document.getElementById('togglePw');
  if (pw.type === 'password') { pw.type = 'text'; btn.textContent = '🙈'; }
  else { pw.type = 'password'; btn.textContent = '👁'; }
}

// ===== STRENGTH METER =====
function getPasswordScore(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 14) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function updateStrength(pw) {
  const score = getPasswordScore(pw);
  const fill  = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  const hint  = document.getElementById('strengthHint');
  const levels = [
    { pct: '0%',   color: 'transparent', text: '—' },
    { pct: '20%',  color: '#ff0040',     text: 'WEAK' },
    { pct: '40%',  color: '#ff6600',     text: 'FAIR' },
    { pct: '60%',  color: '#ffcc00',     text: 'OKAY' },
    { pct: '80%',  color: '#88ff00',     text: 'GOOD' },
    { pct: '100%', color: '#00ff88',     text: 'STRONG' },
  ];
  const lvl = pw.length === 0 ? levels[0] : levels[score] || levels[5];
  fill.style.width      = lvl.pct;
  fill.style.background = lvl.color;
  fill.style.boxShadow  = pw.length ? `0 0 8px ${lvl.color}` : 'none';
  label.textContent     = lvl.text;

  // Show hint when password is too weak to encrypt
  if (hint) {
    if (pw.length > 0 && score < 3) {
      hint.textContent = '⚠️ Minimum "OKAY" required to encrypt — add uppercase, numbers, or symbols.';
      hint.classList.add('visible');
    } else {
      hint.classList.remove('visible');
    }
  }
}

// ===== MAIN ACTION =====
async function handleAction() {
  const input    = document.getElementById('inputText').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('actionBtn');
  const errorBox = document.getElementById('errorBox');

  errorBox.classList.remove('visible');

  if (!input)    { showError('Please enter some text.'); return; }
  if (!password) { showError('Please enter a password.'); return; }

  // Loading state
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> PROCESSING…';
  btn.classList.add('btn--loading');

  try {
    if (currentTab === 'encrypt') {
      // ── Hard password-strength gate ──────────────────────────────
      const score = getPasswordScore(password);
      if (score < 3) {
        showError('Password too weak to encrypt. Use 8+ characters with uppercase, numbers, or symbols (minimum \'OKAY\' strength).');
        return;
      }
      const result = await encryptText(input, password);
      showOutput(result);
    } else {
      const result = await decryptText(input, password);
      showOutput(result);
    }
  } catch (err) {
    const msg = err.message.includes('operation-specific reason')
      ? 'Decryption failed — wrong password or corrupted data.'
      : err.message;
    showError(msg);
  } finally {
    btn.disabled = false;
    btn.classList.remove('btn--loading');
    const icon  = currentTab === 'encrypt' ? '🔒' : '🔓';
    const label = currentTab === 'encrypt' ? 'ENCRYPT' : 'DECRYPT';
    btn.innerHTML = `<span id="actionIcon">${icon}</span><span id="actionLabel">${label}</span>`;
  }
}

// ===== EVENT LISTENERS =====
document.getElementById('inputText').addEventListener('input', function() {
  document.getElementById('charCount').textContent = this.value.length;
});
document.getElementById('password').addEventListener('input', function() {
  updateStrength(this.value);
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAction();
});

// ===== INFO POPUP =====
function toggleInfo() {
  const popup = document.getElementById('infoPopup');
  const btn   = document.getElementById('infoBtn');
  const isOpen = popup.classList.toggle('visible');
  popup.setAttribute('aria-hidden', !isOpen);
  btn.classList.toggle('active', isOpen);
}

// Close info popup when clicking outside
document.addEventListener('click', e => {
  const popup = document.getElementById('infoPopup');
  const btn   = document.getElementById('infoBtn');
  if (popup.classList.contains('visible') && !popup.contains(e.target) && e.target !== btn) {
    popup.classList.remove('visible');
    popup.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
  }
});
