// === EvilEye WebGL Background ===
// Vanilla JS port of the React Bits EvilEye component (no OGL / no React needed).
// Uses the identical vertex + fragment shaders from the original component.
(function () {
  'use strict';

  // ── Configuration (mirrors EvilEye props) ────────────────────────────────────
  const CFG = {
    eyeColor      : '#ff3737',
    intensity     : 2.1,
    pupilSize     : 1.8,
    irisWidth     : 0.35,
    glowIntensity : 0.45,
    scale         : 0.8,
    noiseScale    : 1.0,
    pupilFollow   : 2.0,
    flameSpeed    : 1.0,
    backgroundColor: '#05050a'   // matches CSS --dark
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function hexToVec3(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    ];
  }

  // CPU noise texture (identical to the React component's generateNoiseTexture)
  function generateNoiseTexture(size) {
    const data = new Uint8Array(size * size * 4);

    function hash(x, y, s) {
      let n = x * 374761393 + y * 668265263 + s * 1274126177;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function noise(px, py, freq, seed) {
      const fx = (px / size) * freq, fy = (py / size) * freq;
      const ix = Math.floor(fx),     iy = Math.floor(fy);
      const tx = fx - ix,            ty = fy - iy;
      const w  = freq | 0;
      const v00 = hash(((ix     % w) + w) % w, ((iy     % w) + w) % w, seed);
      const v10 = hash((((ix+1) % w) + w) % w, ((iy     % w) + w) % w, seed);
      const v01 = hash(((ix     % w) + w) % w, (((iy+1) % w) + w) % w, seed);
      const v11 = hash((((ix+1) % w) + w) % w, (((iy+1) % w) + w) % w, seed);
      return v00*(1-tx)*(1-ty) + v10*tx*(1-ty) + v01*(1-tx)*ty + v11*tx*ty;
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0, amp = 0.4, tot = 0;
        for (let o = 0; o < 8; o++) {
          const f = 32 * (1 << o);
          v += amp * noise(x, y, f, o * 31);
          tot += amp;
          amp *= 0.65;
        }
        v /= tot;
        v = Math.max(0, Math.min(1, (v - 0.5) * 2.2 + 0.5));
        const val = Math.round(v * 255);
        const i   = (y * size + x) * 4;
        data[i] = data[i+1] = data[i+2] = val;
        data[i+3] = 255;
      }
    }
    return data;
  }

  // ── Shaders (identical to EvilEye component) ─────────────────────────────────
  const VERT = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}`;

  const FRAG = `
precision highp float;

uniform float     uTime;
uniform vec3      uResolution;
uniform sampler2D uNoiseTexture;
uniform float     uPupilSize;
uniform float     uIrisWidth;
uniform float     uGlowIntensity;
uniform float     uIntensity;
uniform float     uScale;
uniform float     uNoiseScale;
uniform vec2      uMouse;
uniform float     uPupilFollow;
uniform float     uFlameSpeed;
uniform vec3      uEyeColor;
uniform vec3      uBgColor;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
  uv /= uScale;
  float ft = uTime * uFlameSpeed;

  float polarRadius = length(uv) * 2.0;
  float polarAngle  = (2.0 * atan(uv.x, uv.y)) / 6.28 * 0.3;
  vec2  polarUv     = vec2(polarRadius, polarAngle);

  vec4 noiseA = texture2D(uNoiseTexture, polarUv * vec2(0.2, 7.0) * uNoiseScale + vec2(-ft * 0.1, 0.0));
  vec4 noiseB = texture2D(uNoiseTexture, polarUv * vec2(0.3, 4.0) * uNoiseScale + vec2(-ft * 0.2, 0.0));
  vec4 noiseC = texture2D(uNoiseTexture, polarUv * vec2(0.1, 5.0) * uNoiseScale + vec2(-ft * 0.1, 0.0));

  float distanceMask = 1.0 - length(uv);

  float innerRing = clamp(-1.0 * ((distanceMask - 0.7) / uIrisWidth), 0.0, 1.0);
  innerRing = (innerRing * distanceMask - 0.2) / 0.28;
  innerRing += noiseA.r - 0.5;
  innerRing *= 1.3;
  innerRing = clamp(innerRing, 0.0, 1.0);

  float outerRing = clamp(-1.0 * ((distanceMask - 0.5) / 0.2), 0.0, 1.0);
  outerRing = (outerRing * distanceMask - 0.1) / 0.38;
  outerRing += noiseC.r - 0.5;
  outerRing *= 1.3;
  outerRing = clamp(outerRing, 0.0, 1.0);

  innerRing += outerRing;

  float innerEye = distanceMask - 0.1 * 2.0;
  innerEye *= noiseB.r * 2.0;

  vec2  pupilOffset = uMouse * uPupilFollow * 0.12;
  vec2  pupilUv     = uv - pupilOffset;
  float pupil       = 1.0 - length(pupilUv * vec2(9.0, 2.3));
  pupil *= uPupilSize;
  pupil  = clamp(pupil, 0.0, 1.0);
  pupil /= 0.35;

  float outerEyeGlow = 1.0 - length(uv * vec2(0.5, 1.5));
  outerEyeGlow = clamp(outerEyeGlow + 0.5, 0.0, 1.0);
  outerEyeGlow += noiseC.r - 0.5;
  float outerBgGlow = outerEyeGlow;
  outerEyeGlow = pow(outerEyeGlow, 2.0);
  outerEyeGlow += distanceMask;
  outerEyeGlow *= uGlowIntensity;
  outerEyeGlow  = clamp(outerEyeGlow, 0.0, 1.0);
  outerEyeGlow *= pow(1.0 - distanceMask, 2.0) * 2.5;

  outerBgGlow += distanceMask;
  outerBgGlow  = pow(outerBgGlow, 0.5);
  outerBgGlow *= 0.15;

  vec3 color = uEyeColor * uIntensity
    * clamp(max(innerRing + innerEye, outerEyeGlow + outerBgGlow) - pupil, 0.0, 3.0);
  color += uBgColor;

  gl_FragColor = vec4(color, 1.0);
}`;

  // ── WebGL setup ──────────────────────────────────────────────────────────────
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) { console.warn('EvilEye: WebGL not supported'); return; }

  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('Shader error:', gl.getShaderInfoLog(s));
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER,   VERT));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    console.error('Program link error:', gl.getProgramInfoLog(prog));

  // Fullscreen triangle (same geometry as OGL Triangle)
  const posLoc = gl.getAttribLocation(prog, 'position');
  const uvLoc  = gl.getAttribLocation(prog, 'uv');

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 2,0, 0,2]), gl.STATIC_DRAW);

  // Noise texture
  const NOISE_SIZE = 256;
  const noiseTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NOISE_SIZE, NOISE_SIZE, 0,
                gl.RGBA, gl.UNSIGNED_BYTE, generateNoiseTexture(NOISE_SIZE));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  // Uniform locations
  const U = {};
  ['uTime','uResolution','uNoiseTexture','uPupilSize','uIrisWidth',
   'uGlowIntensity','uIntensity','uScale','uNoiseScale','uMouse',
   'uPupilFollow','uFlameSpeed','uEyeColor','uBgColor'
  ].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

  // Pre-compute constant vec3 values
  const eyeCol = hexToVec3(CFG.eyeColor);
  const bgCol  = hexToVec3(CFG.backgroundColor);

  // ── Mouse tracking ───────────────────────────────────────────────────────────
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  document.addEventListener('mousemove', e => {
    mouse.tx =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // ── Resize ───────────────────────────────────────────────────────────────────
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Render loop ──────────────────────────────────────────────────────────────
  function render(ts) {
    requestAnimationFrame(render);

    // Smooth mouse lerp (matches React component's 0.05 factor)
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);

    // Noise texture → unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);
    gl.uniform1i(U.uNoiseTexture, 0);

    // Uniforms
    gl.uniform1f(U.uTime,          ts * 0.001);
    gl.uniform3f(U.uResolution,    canvas.width, canvas.height,
                                   canvas.width / canvas.height);
    gl.uniform1f(U.uPupilSize,     CFG.pupilSize);
    gl.uniform1f(U.uIrisWidth,     CFG.irisWidth);
    gl.uniform1f(U.uGlowIntensity, CFG.glowIntensity);
    gl.uniform1f(U.uIntensity,     CFG.intensity);
    gl.uniform1f(U.uScale,         CFG.scale);
    gl.uniform1f(U.uNoiseScale,    CFG.noiseScale);
    gl.uniform2f(U.uMouse,         mouse.x, mouse.y);
    gl.uniform1f(U.uPupilFollow,   CFG.pupilFollow);
    gl.uniform1f(U.uFlameSpeed,    CFG.flameSpeed);
    gl.uniform3fv(U.uEyeColor,     eyeCol);
    gl.uniform3fv(U.uBgColor,      bgCol);

    // Draw fullscreen triangle
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  requestAnimationFrame(render);
})();
