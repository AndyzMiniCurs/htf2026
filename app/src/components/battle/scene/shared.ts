import * as THREE from 'three'

/** Where things stand in the arena. The island's top is at y = 0. */
export const BEAST = new THREE.Vector3(0, 3.6, -0.6)
export const CLAUDE_SPOT = new THREE.Vector3(-5.6, 0, 0.2)
/** Spells fly from just below the camera, as if the guardian cast them. */
export const CASTER = new THREE.Vector3(0, 1.2, 11)

/**
 * Per-frame signals shared inside the canvas without React renders: hits and the strike
 * bump them, the camera, the creature and the lens decay them.
 */
export type BattleFx = { shake: number; pulse: number }
export const createFx = (): BattleFx => ({ shake: 0, pulse: 0 })

/** Seconds on the page clock, so the scene and the HTML overlay share one timebase. */
export const nowSeconds = () => performance.now() / 1000

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInCubic = (t: number) => t * t * t

const textures = new Map<string, { texture: THREE.CanvasTexture; aspect: number }>()

/** A soft round glow for additive sprites. */
export function glowTexture(): THREE.CanvasTexture {
  return cached('glow', () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 128, 128)
    }
    return { canvas, aspect: 1 }
  }).texture
}

/** A line of glowing monospace text, for code tokens and damage numbers. */
export function textTexture(text: string, color: string, weight = 600) {
  return cached(`text:${text}:${color}:${weight}`, () => {
    const px = 64
    const font = `${weight} ${px}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
    const probe = document.createElement('canvas').getContext('2d')
    if (probe) probe.font = font
    const width = Math.ceil((probe?.measureText(text).width ?? px * text.length * 0.6) + px)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = px * 2
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.font = font
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = color
      ctx.shadowBlur = 18
      ctx.fillStyle = color
      ctx.fillText(text, width / 2, px)
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText(text, width / 2, px)
    }
    return { canvas, aspect: width / (px * 2) }
  })
}

function cached(key: string, draw: () => { canvas: HTMLCanvasElement; aspect: number }) {
  const hit = textures.get(key)
  if (hit) return hit
  const { canvas, aspect } = draw()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const entry = { texture, aspect }
  textures.set(key, entry)
  return entry
}

/** Ashima/Stefan Gustavson 3D simplex noise (MIT), for the creature's writhing surface. */
export const SIMPLEX_3D = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`
