import * as THREE from 'three'

/*
  Geometry helpers for the ScamShield 3D shield.
  The silhouette is a classic "heater" shield drawn with curves, then scaled
  to build the rim, glass face and inner layers.
*/

export { STATUS_COLORS } from './shieldColors'

export function makeShieldShape(k = 1) {
  const s = new THREE.Shape()
  s.moveTo(0, 1.34 * k)
  s.quadraticCurveTo(0.56 * k, 1.08 * k, 1.06 * k, 1.18 * k)
  s.lineTo(1.06 * k, 0.24 * k)
  s.bezierCurveTo(1.06 * k, -0.62 * k, 0.52 * k, -1.14 * k, 0, -1.52 * k)
  s.bezierCurveTo(-0.52 * k, -1.14 * k, -1.06 * k, -0.62 * k, -1.06 * k, 0.24 * k)
  s.lineTo(-1.06 * k, 1.18 * k)
  s.quadraticCurveTo(-0.56 * k, 1.08 * k, 0, 1.34 * k)
  return s
}

/** Points along the outline, for glowing edge lines. */
export function outlinePoints(k, z, count = 160) {
  return makeShieldShape(k)
    .getSpacedPoints(count)
    .map((p) => new THREE.Vector3(p.x, p.y, z))
}

/** Approximate half-width of the shield silhouette at height y (k = 1). */
export function shieldHalfWidth(y) {
  if (y > 1.25) return 0.9
  if (y >= 0.24) return 1.06
  const t = Math.min(1, (0.24 - y) / 1.76)
  return 1.06 * Math.sqrt(Math.max(0, 1 - t * t))
}

export function makeRimGeometry() {
  const outer = makeShieldShape(1)
  const inner = makeShieldShape(0.8)
  outer.holes.push(inner)
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 5,
    curveSegments: 64,
  })
  geo.translate(0, 0, -0.13)
  return geo
}

export function makePlateGeometry(k, depth, bevel = 0.02) {
  const geo = new THREE.ExtrudeGeometry(makeShieldShape(k), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 64,
  })
  geo.translate(0, 0, -depth / 2)
  return geo
}

function extrude(shapes, depth = 0.06) {
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 32,
  })
  geo.translate(0, 0, -depth / 2)
  return geo
}

/** Keyhole — shown while idle or scanning. */
export function makeKeyholeGeometry() {
  const r = 0.2
  const cy = 0.2
  const a1 = -1.12
  const a2 = Math.PI + 1.12
  const s = new THREE.Shape()
  s.moveTo(-0.15, -0.44)
  s.lineTo(0.15, -0.44)
  s.lineTo(Math.cos(a1) * r, cy + Math.sin(a1) * r)
  s.absarc(0, cy, r, a1, a2, false)
  s.lineTo(-0.15, -0.44)
  return extrude(s)
}

/** Check mark — shown for SAFE. */
export function makeCheckGeometry() {
  const s = new THREE.Shape()
  s.moveTo(-0.46, 0.02)
  s.lineTo(-0.14, -0.3)
  s.lineTo(0.46, 0.3)
  s.lineTo(0.35, 0.41)
  s.lineTo(-0.14, -0.08)
  s.lineTo(-0.35, 0.13)
  s.lineTo(-0.46, 0.02)
  return extrude(s)
}

/** Exclamation mark — shown for SUSPICIOUS and DANGEROUS. */
export function makeAlertGeometry() {
  const bar = new THREE.Shape()
  bar.moveTo(-0.075, 0.46)
  bar.lineTo(0.075, 0.46)
  bar.lineTo(0.05, -0.1)
  bar.lineTo(-0.05, -0.1)
  bar.lineTo(-0.075, 0.46)
  const dot = new THREE.Shape()
  dot.absarc(0, -0.3, 0.085, 0, Math.PI * 2, false)
  return extrude([bar, dot])
}

/* ---------- Canvas textures (generated, no network) ---------- */

const cache = {}

function canvasTexture(key, size, draw) {
  if (cache[key]) return cache[key]
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  cache[key] = tex
  return tex
}

export const radialTexture = () =>
  canvasTexture('radial', 256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.45)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })

export const dotTexture = () =>
  canvasTexture('dot', 64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.8)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2)
    ctx.fill()
  })

export const verticalFadeTexture = () =>
  canvasTexture('vfade', 128, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(255,255,255,1)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })

export function circlePoints(r, y = 0, count = 128) {
  const pts = []
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r))
  }
  return pts
}
