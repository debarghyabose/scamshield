import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Line, PerformanceMonitor } from '@react-three/drei'
import {
  STATUS_COLORS,
  circlePoints,
  dotTexture,
  makeAlertGeometry,
  makeCheckGeometry,
  makeKeyholeGeometry,
  makePlateGeometry,
  makeRimGeometry,
  outlinePoints,
  radialTexture,
  shieldHalfWidth,
  verticalFadeTexture,
} from './shieldGeometry'

/*
  The ScamShield hero scene.

  All animated parts read two shared refs instead of React state, so the
  scene never re-renders during animation:
    - color: the current (smoothly interpolated) status colour
    - fx:    status, when it changed, and click pulses
*/

const PLATFORM_Y = -2.02
const damp = (dt, speed) => 1 - Math.exp(-dt * speed)

// Pointer position across the whole window, for a gentle parallax that
// works even when the cursor isn't over the canvas.
const pointer = { x: 0, y: 0 }
function usePointerParallax(enabled) {
  useEffect(() => {
    if (!enabled) return
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled])
}

/* ------------------------------------------------------------------ */

function Shield({ color, fx, reduced, lite, onPulse }) {
  const floatRef = useRef()
  const spinRef = useRef()
  const glassRef = useRef()
  const coreRef = useRef()
  const edgeFront = useRef()
  const edgeInner = useRef()
  const edgeCore = useRef()
  const lightRef = useRef()
  const emblemRefs = { keyhole: useRef(), check: useRef(), alert: useRef() }
  const emblemMaterial = useMemo(
    () => new THREE.MeshPhysicalMaterial({ metalness: 0.2, roughness: 0.3, clearcoat: 1, toneMapped: false }),
    [],
  )
  const emblemMat = useRef(emblemMaterial)
  const white = useMemo(() => new THREE.Color('#ffffff'), [])
  const spin = useRef({ angle: 0, v: 0 })
  const [hovered, setHovered] = useState(false)

  const geo = useMemo(
    () => ({
      rim: makeRimGeometry(),
      glass: makePlateGeometry(0.8, 0.08, 0.015),
      core: makePlateGeometry(0.62, 0.03, 0),
      keyhole: makeKeyholeGeometry(),
      check: makeCheckGeometry(),
      alert: makeAlertGeometry(),
    }),
    [],
  )
  const outline = useMemo(() => outlinePoints(1.035, 0.16), [])
  const innerOutline = useMemo(() => outlinePoints(0.785, 0.15), [])
  const coreOutline = useMemo(() => outlinePoints(0.62, 0.03), [])

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
    return () => (document.body.style.cursor = '')
  }, [hovered])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const f = fx.current
    const since = t - f.changedAt
    const status = f.status
    const scanning = status === 'scanning'
    const motion = reduced ? 0.15 : 1

    // Spin: fast while scanning, then ease back to face the camera.
    const s = spin.current
    s.v = THREE.MathUtils.lerp(s.v, scanning ? 4.2 * motion + 0.4 : 0, damp(dt, scanning ? 1.6 : 2.2))
    s.v += f.kick
    f.kick = 0
    s.angle += s.v * dt
    if (!scanning && s.v < 0.8) {
      const nearest = Math.round(s.angle / (Math.PI * 2)) * Math.PI * 2
      s.angle = THREE.MathUtils.lerp(s.angle, nearest, damp(dt, 2.5))
    }

    const sway = Math.sin(t * 0.45) * 0.32 * motion
    const g = spinRef.current
    g.rotation.y = s.angle + sway + pointer.x * 0.3 * motion
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -pointer.y * 0.16 * motion, damp(dt, 3))

    // Float + status-specific transient motion
    const fl = floatRef.current
    fl.position.y = Math.sin(t * 1.1) * 0.08 * motion
    fl.position.x = 0
    let scale = hovered ? 1.03 : 1
    if (status === 'safe' && since < 0.8) scale += Math.sin((since / 0.8) * Math.PI) * 0.07 * (reduced ? 0.3 : 1)
    if (status === 'dangerous' && since < 0.7 && !reduced) fl.position.x = Math.sin(since * 70) * 0.05 * (1 - since / 0.7)
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, scale, damp(dt, 10)))

    // Colours
    edgeFront.current.material.color.copy(color.current)
    edgeInner.current.material.color.copy(color.current)
    edgeCore.current.material.color.copy(color.current)
    coreRef.current.material.color.copy(color.current)
    const glass = glassRef.current.material
    if (glass.transmission > 0) glass.attenuationColor.copy(color.current)
    else glass.color.copy(color.current).lerp(white, 0.86)

    let glow = 0.55
    if (status === 'suspicious') glow = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 4))
    if (status === 'dangerous') glow = 0.7 + 0.25 * Math.sin(t * 9)
    if (scanning) glow = 0.5 + 0.3 * Math.sin(t * 6)
    emblemMat.current.color.copy(color.current)
    emblemMat.current.emissive.copy(color.current)
    emblemMat.current.emissiveIntensity = glow
    coreRef.current.material.opacity = 0.1 + glow * 0.12
    lightRef.current.color.copy(color.current)
    lightRef.current.intensity = 6 + glow * 10

    // Emblem swap
    const active = status === 'safe' ? 'check' : status === 'suspicious' || status === 'dangerous' ? 'alert' : 'keyhole'
    for (const [key, ref] of Object.entries(emblemRefs)) {
      const m = ref.current
      const target = key === active ? 1 : 0.001
      const v = THREE.MathUtils.lerp(m.scale.x, target, damp(dt, 9))
      m.scale.setScalar(v)
      m.visible = v > 0.01
    }
  })

  return (
    <group ref={floatRef}>
      <group
        ref={spinRef}
        onClick={(e) => {
          e.stopPropagation()
          onPulse()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/* Metallic rim */}
        <mesh geometry={geo.rim} castShadow>
          <meshPhysicalMaterial
            color="#dfe5ee"
            metalness={0.92}
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.12}
            envMapIntensity={1.25}
          />
        </mesh>

        {/* Glass face */}
        <mesh ref={glassRef} geometry={geo.glass}>
          {lite ? (
            <meshPhysicalMaterial
              color="#eef3fb"
              roughness={0.1}
              metalness={0.05}
              clearcoat={1}
              transparent
              opacity={0.88}
            />
          ) : (
            <meshPhysicalMaterial
              color="#f6f9ff"
              roughness={0.08}
              metalness={0}
              transmission={0.92}
              thickness={0.45}
              ior={1.35}
              clearcoat={1}
              attenuationColor="#2f6bff"
              attenuationDistance={1.6}
            />
          )}
        </mesh>

        {/* Inner holographic core */}
        <mesh ref={coreRef} geometry={geo.core} position={[0, 0, -0.01]}>
          <meshBasicMaterial transparent opacity={0.16} toneMapped={false} depthWrite={false} />
        </mesh>
        <Line ref={edgeCore} points={coreOutline} lineWidth={1} transparent opacity={0.55} toneMapped={false} />

        {/* Edge lighting */}
        <Line ref={edgeFront} points={outline} lineWidth={2} transparent opacity={0.95} toneMapped={false} />
        <Line ref={edgeInner} points={innerOutline} lineWidth={1.25} transparent opacity={0.7} toneMapped={false} />

        {/* Emblems */}
        <group position={[0, 0.02, 0.1]}>
          <mesh ref={emblemRefs.keyhole} geometry={geo.keyhole} material={emblemMaterial} />
          <mesh ref={emblemRefs.check} geometry={geo.check} material={emblemMaterial} scale={0.001} />
          <mesh ref={emblemRefs.alert} geometry={geo.alert} material={emblemMaterial} scale={0.001} />
        </group>

        {/* Back emblem so a fast spin never shows an empty face */}
        <mesh geometry={geo.keyhole} position={[0, 0.02, -0.1]} rotation={[0, Math.PI, 0]}>
          <meshStandardMaterial color="#c9d2de" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      <pointLight ref={lightRef} position={[0, 0.2, 1.6]} distance={5} decay={2} />
      <ScanBeam fx={fx} color={color} reduced={reduced} />
      <EnergyRing fx={fx} reduced={reduced} />
    </group>
  )
}

/* ------------------------------------------------------------------ */

function ScanBeam({ fx, reduced }) {
  const group = useRef()
  const disc = useRef()
  const ring = useRef()
  const curtain = useRef()
  const opacity = useRef(0)
  const alpha = useMemo(() => radialTexture(), [])
  const fade = useMemo(() => verticalFadeTexture(), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const on = fx.current.status === 'scanning'
    opacity.current = THREE.MathUtils.lerp(opacity.current, on ? 1 : 0, damp(dt, on ? 6 : 4))
    const o = opacity.current
    group.current.visible = o > 0.01
    if (!group.current.visible) return
    const y = Math.sin(t * (reduced ? 0.8 : 2.1)) * 1.38 - 0.05
    const hw = shieldHalfWidth(y) + 0.3
    group.current.position.y = y
    disc.current.scale.set(hw, hw * 0.55, 1)
    ring.current.scale.set(hw, hw * 0.55, 1)
    disc.current.material.opacity = 0.55 * o
    ring.current.material.opacity = 0.95 * o
    curtain.current.scale.x = hw * 2
    curtain.current.material.opacity = 0.12 * o
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={disc} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color={STATUS_COLORS.scanning} alphaMap={alpha} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.97, 1, 96]} />
        <meshBasicMaterial color={STATUS_COLORS.scanning} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={curtain} position={[0, -0.12, 0.3]}>
        <planeGeometry args={[1, 0.24]} />
        <meshBasicMaterial color={STATUS_COLORS.scanning} alphaMap={fade} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function EnergyRing({ fx, reduced }) {
  const group = useRef()
  const a = useRef()
  const b = useRef()
  const level = useRef(0)
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const on = fx.current.status === 'dangerous'
    level.current = THREE.MathUtils.lerp(level.current, on ? 1 : 0, damp(dt, on ? 5 : 3))
    const l = level.current
    group.current.visible = l > 0.01
    if (!group.current.visible) return
    const pulse = reduced ? 1 : 1 + Math.sin(t * 6) * 0.03
    const intro = 0.7 + 0.3 * l
    group.current.scale.setScalar(pulse * intro)
    a.current.rotation.z += dt * (reduced ? 0.2 : 1.2)
    b.current.rotation.z -= dt * (reduced ? 0.15 : 0.8)
    a.current.material.opacity = 0.85 * l
    b.current.material.opacity = 0.4 * l
  })
  return (
    <group ref={group} visible={false} rotation={[Math.PI / 2 - 0.22, 0, 0]}>
      <mesh ref={a}>
        <torusGeometry args={[1.7, 0.018, 12, 160, Math.PI * 1.6]} />
        <meshBasicMaterial color={STATUS_COLORS.dangerous} transparent toneMapped={false} />
      </mesh>
      <mesh ref={b}>
        <torusGeometry args={[1.86, 0.008, 8, 160, Math.PI * 1.2]} />
        <meshBasicMaterial color={STATUS_COLORS.dangerous} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */

const RINGS = [
  { r: 2.0, rot: [Math.PI / 2.25, 0, 0.28], speed: 0.22, opacity: 0.45 },
  { r: 2.25, rot: [Math.PI / 1.75, 0.35, -0.2], speed: -0.15, opacity: 0.3 },
  { r: 2.5, rot: [Math.PI / 2.05, -0.3, 0.1], speed: 0.1, opacity: 0.18 },
]

function OrbitRings({ color, fx, reduced, count = RINGS.length }) {
  const refs = useRef([])
  useFrame((state, dt) => {
    const boost = fx.current.status === 'scanning' ? 3.2 : 1
    const motion = reduced ? 0.15 : 1
    refs.current.forEach((g, i) => {
      if (!g) return
      g.rotation.z += RINGS[i].speed * dt * boost * motion
      g.children.forEach((c) => c.material.color.copy(color.current))
    })
  })
  return RINGS.slice(0, count).map((ring, i) => (
    <group key={i} rotation={ring.rot}>
      <group ref={(el) => (refs.current[i] = el)}>
        <mesh>
          <torusGeometry args={[ring.r, 0.006, 6, 200]} />
          <meshBasicMaterial transparent opacity={ring.opacity} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh position={[ring.r, 0, 0]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial toneMapped={false} />
        </mesh>
        {i === 0 && (
          <mesh position={[-ring.r * 0.7, ring.r * 0.714, 0]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial toneMapped={false} />
          </mesh>
        )}
      </group>
    </group>
  ))
}

function Particles({ count, color, fx, reduced }) {
  const points = useRef()
  const data = useMemo(() => {
    const home = new Float32Array(count)
    const radius = new Float32Array(count)
    const angle = new Float32Array(count)
    const speed = new Float32Array(count)
    const y = new Float32Array(count)
    const homeY = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      home[i] = radius[i] = 1.5 + Math.random() * 1.4
      angle[i] = Math.random() * Math.PI * 2
      speed[i] = 0.05 + Math.random() * 0.15
      homeY[i] = y[i] = -1.8 + Math.random() * 3.6
    }
    return { home, radius, angle, speed, y, homeY, positions: new Float32Array(count * 3) }
  }, [count])
  const sprite = useMemo(() => dotTexture(), [])

  useFrame((state, dt) => {
    const scanning = fx.current.status === 'scanning'
    const motion = reduced ? 0.15 : 1
    const d = Math.min(dt, 0.05)
    const { home, radius, angle, speed, y, homeY, positions } = data
    for (let i = 0; i < count; i++) {
      angle[i] += speed[i] * d * (scanning ? 4 : 1) * motion
      if (scanning && !reduced) {
        radius[i] -= d * (0.8 + speed[i] * 5)
        y[i] += (0 - y[i]) * d * 0.9
        if (radius[i] < 0.35) {
          radius[i] = 2.6 + Math.random() * 0.4
          y[i] = -1.6 + Math.random() * 3.2
        }
      } else {
        radius[i] += (home[i] - radius[i]) * d * 1.5
        y[i] += (homeY[i] - y[i]) * d * 1.2
      }
      positions[i * 3] = Math.cos(angle[i]) * radius[i]
      positions[i * 3 + 1] = y[i] + Math.sin(angle[i] * 3 + i) * 0.04
      positions[i * 3 + 2] = Math.sin(angle[i]) * radius[i]
    }
    const geom = points.current.geometry
    geom.attributes.position.needsUpdate = true
    points.current.material.color.copy(color.current)
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} map={sprite} transparent opacity={0.85} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
  )
}

function Platform({ color, fx, reduced, lite }) {
  const glow = useRef()
  const rings = useRef()
  const dashed = useRef()
  const beam = useRef()
  const shock = useRef()
  const shockState = useRef({ start: -10, status: 'idle' })
  const alpha = useMemo(() => radialTexture(), [])
  const fade = useMemo(() => verticalFadeTexture(), [])
  const dashPts = useMemo(() => circlePoints(1.42, 0, 160), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const f = fx.current
    const motion = reduced ? 0.15 : 1
    glow.current.material.color.copy(color.current)
    beam.current.material.color.copy(color.current)
    rings.current.children.forEach((m) => m.material.color.copy(color.current))
    dashed.current.material.color.copy(color.current)
    dashed.current.parent.rotation.y += dt * 0.25 * motion * (f.status === 'scanning' ? 3 : 1)
    beam.current.material.opacity = (f.status === 'scanning' ? 0.09 : 0.045) + Math.sin(t * 2) * 0.008

    // Shockwave on result
    if (f.status !== shockState.current.status) {
      shockState.current = { status: f.status, start: t }
    }
    const s = shock.current
    const since = t - shockState.current.start
    const isResult = ['safe', 'suspicious', 'dangerous'].includes(f.status)
    if (isResult && since < 1.3) {
      const p = since / 1.3
      s.visible = true
      s.scale.setScalar(1 + p * (reduced ? 0.6 : 2.2))
      s.material.opacity = (1 - p) * 0.7
      s.material.color.copy(color.current)
    } else {
      s.visible = false
    }
  })

  return (
    <group position={[0, PLATFORM_Y, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[1.72, 1.84, 0.14, 96]} />
        <meshPhysicalMaterial color="#f3f5f9" metalness={0.25} roughness={0.35} clearcoat={0.7} envMapIntensity={0.9} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[1.9, 1.95, 0.1, 96]} />
        <meshPhysicalMaterial color="#e6eaf0" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh ref={glow} position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.66, 64]} />
        <meshBasicMaterial alphaMap={alpha} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={rings} position={[0, 0.074, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {[
          [0.62, 0.628, 0.35],
          [1.02, 1.03, 0.45],
          [1.6, 1.615, 0.7],
        ].map(([a, b, o], i) => (
          <mesh key={i}>
            <ringGeometry args={[a, b, 128]} />
            <meshBasicMaterial transparent opacity={o} toneMapped={false} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <group position={[0, 0.076, 0]}>
        <Line ref={dashed} points={dashPts} dashed dashSize={0.06} gapSize={0.08} lineWidth={1.5} toneMapped={false} />
      </group>
      <mesh ref={shock} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[1.5, 1.56, 128]} />
        <meshBasicMaterial transparent toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Soft projection cone */}
      <mesh ref={beam} position={[0, 1.0, 0]}>
        <cylinderGeometry args={[1.05, 1.55, 1.9, 64, 1, true]} />
        <meshBasicMaterial alphaMap={fade} transparent side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {!lite && <ContactShadows position={[0, -0.18, 0]} opacity={0.35} scale={7} blur={2.6} far={1.2} resolution={256} />}
    </group>
  )
}

/* ------------------------------------------------------------------ */

function CameraRig({ compact }) {
  const { camera, size } = useThree()
  useFrame((_, dt) => {
    const aspect = size.width / size.height
    let z = compact ? 8.3 : 8.7
    if (aspect < 1) z += (1 - aspect) * 5
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, z, damp(dt, 4))
    camera.lookAt(0, -0.35, 0)
  })
  return null
}

function StatusDriver({ status, color, fx }) {
  const target = useMemo(() => new THREE.Color(), [])
  useFrame((state, dt) => {
    const f = fx.current
    if (f.status !== status) {
      f.status = status
      f.changedAt = state.clock.elapsedTime
    }
    target.set(STATUS_COLORS[status] || STATUS_COLORS.idle)
    color.current.lerp(target, damp(dt, 4))
  })
  return null
}

/*
  Quality presets per device tier (see hooks/useWebGL.js).
  PerformanceMonitor steps down one level if the frame rate drops.
*/
const QUALITY = {
  full: { dpr: [1, 2], particles: 170, glass: true, shadows: true, env: 256, rings: 3, antialias: true },
  medium: { dpr: [1, 1.5], particles: 100, glass: false, shadows: true, env: 128, rings: 3, antialias: true },
  lite: { dpr: [1, 1.25], particles: 50, glass: false, shadows: false, env: 64, rings: 2, antialias: false },
}
const STEP_DOWN = { full: 'medium', medium: 'lite', lite: 'lite' }

export default function ShieldScene({ status = 'idle', tier = 'full', reduced = false, compact = false, active = true }) {
  const [degradeSteps, setDegradeSteps] = useState(0)
  let level = tier in QUALITY ? tier : 'lite'
  if (compact && level === 'full') level = 'medium'
  for (let i = 0; i < degradeSteps; i++) level = STEP_DOWN[level]
  const q = QUALITY[level]
  const lite = !q.glass
  const [antialias] = useState(q.antialias) // fixed for the lifetime of the WebGL context
  const color = useRef(new THREE.Color(STATUS_COLORS[status] || STATUS_COLORS.idle))
  const fx = useRef({ status, changedAt: 0, kick: 0 })
  usePointerParallax(!reduced)

  return (
    <Canvas
      dpr={q.dpr}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0.35, 8.6], fov: 34 }}
      gl={{ antialias, alpha: true, powerPreference: level === 'full' ? 'high-performance' : 'default' }}
      shadows={false}
      style={{ touchAction: 'pan-y' }}
    >
      <PerformanceMonitor onDecline={() => setDegradeSteps((n) => Math.min(n + 1, 2))} flipflops={3} />
      <StatusDriver status={status} color={color} fx={fx} />
      <CameraRig compact={compact} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.3} />
      <pointLight position={[-2.6, 1.2, -1.5]} intensity={8} color="#6fd3ff" distance={6} />
      <pointLight position={[2.6, 1.2, -1.5]} intensity={8} color="#6b8dff" distance={6} />

      <Environment resolution={q.env} frames={1}>
        <color attach="background" args={['#eef1f6']} />
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -3]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#d6e4ff" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[6, 2.5, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[0, 0, 6]} scale={3} />
        <Lightformer form="rect" intensity={0.6} color="#0b1220" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>

      <group position={[0, 0.1, 0]}>
        <Shield color={color} fx={fx} reduced={reduced} lite={lite} onPulse={() => (fx.current.kick = reduced ? 1.5 : 7)} />
        <OrbitRings color={color} fx={fx} reduced={reduced} count={q.rings} />
        <Particles count={compact ? Math.round(q.particles * 0.7) : q.particles} color={color} fx={fx} reduced={reduced} />
      </group>
      <Platform color={color} fx={fx} reduced={reduced} lite={!q.shadows} />
    </Canvas>
  )
}
