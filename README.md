# 😈 Evil Emoji Encryptor

> Encrypt your secret messages into chaotic emoji sequences using military-grade cryptography — fully client-side, zero-knowledge, zero dependencies.

![Evil Emoji Encryptor](https://img.shields.io/badge/AES--256--GCM-Encrypted-00ff88?style=for-the-badge&logo=shield&logoColor=black)
![PBKDF2](https://img.shields.io/badge/PBKDF2-600K%20Iterations-9d00ff?style=for-the-badge)
![Zero Knowledge](https://img.shields.io/badge/Zero-Knowledge-ff0040?style=for-the-badge)
![Client Side](https://img.shields.io/badge/Client--Side-Only-00ff88?style=for-the-badge)

---

## ✨ Features

- 🔐 **AES-256-GCM** authenticated encryption via the browser's native WebCrypto API
- 🔑 **PBKDF2** key derivation with **600,000 iterations** (OWASP 2023 standard)
- 😈 **64-emoji base-64 encoding** — ciphertext output in faces 😀, animals 🐘, food 🍕, and transport 🚀
- 👁️ **EvilEye WebGL background** with real-time cursor-tracked pupil
- 🌟 **BorderGlow card** — interactive edge-glow that follows your mouse
- ✍️ **Animated placeholder text** cycling through hacker-themed messages
- 🔓 **DecryptedText title** — scramble-to-reveal animation on load
- 🛡️ **Password strength enforcement** — minimum "OKAY" required to encrypt
- 🔒 **Zero network calls** — your data never leaves your browser

---

## 🛡️ Security Architecture

```
Plaintext
   │
   ▼
PBKDF2-HMAC-SHA256 (password + random 16-byte salt, 600,000 iterations)
   │
   ▼
AES-256-GCM (random 12-byte IV)
   │
   ▼
[16B salt | 12B IV | ciphertext + 16B auth tag]
   │
   ▼
Base-64 Emoji Encoding (64 symbols, 3 bytes → 4 emojis)
   │
   ▼
😀🐘🍕🚀😈🐬🍔🚦...
```

| Layer | Algorithm | Detail |
|---|---|---|
| Key Derivation | PBKDF2-HMAC-SHA256 | 600,000 iterations, random 16-byte salt |
| Encryption | AES-256-GCM | Random 12-byte IV, 16-byte auth tag |
| Encoding | Base-64 Emoji | 64 symbols across 4 emoji categories |
| Runtime | WebCrypto API | Browser-native, audited, hardware-accelerated |

> **The emoji layer is cosmetic** — security lives entirely in AES-256-GCM + PBKDF2. Whether you use 2 emojis or 256, the cryptographic strength is identical.

---

## ♾️ Do Encrypted Emojis Expire?

**No. Encrypted emoji blobs never expire.**

The emoji layer is purely cosmetic — it is a Base-64 encoding of the raw AES-256-GCM ciphertext. There are no timestamps, no TTLs, and no server-side state involved whatsoever.

| Property | Value |
|---|---|
| Expiry | **Never** |
| TTL / Timestamp | None embedded |
| Server dependency | None (fully client-side) |
| Decryptable forever? | ✅ Yes — as long as you have the password |

As long as you keep the password you used to encrypt a message, you can decrypt the emoji blob **years or decades later** in any modern browser. The cryptographic strength (AES-256-GCM + PBKDF2) does not degrade over time.

> **The only way a blob becomes unrecoverable is if you lose the password.** Use a long, random passphrase and store it safely.

---

## 🚀 Getting Started

### Run locally
```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/Evil_Emoji_Encryptor.git
cd Evil_Emoji_Encryptor

# Serve with any static server
python -m http.server 5500
# → open http://localhost:5500
```

No build step, no `npm install`, no dependencies. Just open `index.html`.

### Deploy to Vercel
Push to GitHub, then import at [vercel.com/new](https://vercel.com/new). Vercel auto-detects the static site — no configuration needed beyond the included `vercel.json`.

---

## 🎨 Tech Stack

| Category | Technology |
|---|---|
| Encryption | [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) (browser built-in) |
| WebGL Background | Raw WebGL — port of [React Bits EvilEye](https://reactbits.dev) |
| Border Glow | Vanilla JS — port of [React Bits BorderGlow](https://reactbits.dev) |
| Text Animations | Vanilla JS — port of [React Bits DecryptedText & TextType](https://reactbits.dev) |
| Fonts | [Orbitron](https://fonts.google.com/specimen/Orbitron) + [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono) via Google Fonts |
| Hosting | [Vercel](https://vercel.com) |

---

## 📁 Project Structure

```
Evil_Emoji_Encryptor/
├── index.html          # App shell & markup
├── style.css           # Core design system & component styles
├── app.js              # Encryption engine + UI logic
├── background.js       # EvilEye WebGL background (raw WebGL)
├── border-glow.js      # BorderGlow interactive card effect
├── border-glow.css     # BorderGlow component styles
├── decrypted-text.js   # DecryptedText scramble-reveal animation
├── text-type.js        # TextType animated placeholder effect
└── vercel.json         # Static site deployment config
```

---

## 🔒 Privacy Guarantee

- **No server** — the app is pure HTML/CSS/JS with no backend
- **No analytics** — zero tracking scripts
- **No storage** — nothing is written to `localStorage` or cookies
- **No network** — encryption/decryption happens entirely in your browser tab
- The only external request is Google Fonts (font files only, no user data)

---

## ⚠️ Disclaimer

This tool is provided for educational and personal privacy purposes. The author is not responsible for any misuse. Strong encryption is only as secure as your password — use a long, random passphrase.

---

## 📄 License

MIT — free to use, modify, and distribute.
