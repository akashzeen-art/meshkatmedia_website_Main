import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const FRAG_SCALE = 28
const TORUS_R = 1.85
const TORUS_r = 0.38

function hash2(px, py) {
  const a = Math.sin(px * 127.1 + py * 311.7) * 43758.5453
  const b = Math.sin(px * 269.5 + py * 183.3) * 43758.5453
  return [a - Math.floor(a), b - Math.floor(b)]
}

function cellSeed(u, v) {
  const n = [Math.floor(u * FRAG_SCALE), Math.floor(v * FRAG_SCALE)]
  const f = [u * FRAG_SCALE - n[0], v * FRAG_SCALE - n[1]]
  let md = Infinity
  let best = [...n]
  for (let j = -2; j <= 2; j++) {
    for (let i = -2; i <= 2; i++) {
      const o = hash2(n[0] + i, n[1] + j)
      const r = [i + o[0] - f[0], j + o[1] - f[1]]
      const d = r[0] * r[0] + r[1] * r[1]
      if (d < md) {
        md = d
        best = [n[0] + i + o[0], n[1] + j + o[1]]
      }
    }
  }
  return [best[0] / FRAG_SCALE, best[1] / FRAG_SCALE]
}

function addBarycentricCoords(geo) {
  const g = geo.toNonIndexed()
  const count = g.attributes.position.count
  const bary = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 3) {
    bary[i * 3] = 1
    bary[i * 3 + 1] = 0
    bary[i * 3 + 2] = 0
    bary[(i + 1) * 3] = 0
    bary[(i + 1) * 3 + 1] = 1
    bary[(i + 1) * 3 + 2] = 0
    bary[(i + 2) * 3] = 0
    bary[(i + 2) * 3 + 1] = 0
    bary[(i + 2) * 3 + 2] = 1
  }
  g.setAttribute('barycentric', new THREE.BufferAttribute(bary, 3))
  return g
}

function smoothstep(min, max, v) {
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)))
  return t * t * (3 - 2 * t)
}

function buildFragments(ringGroup) {
  const baseGeo = new THREE.TorusGeometry(TORUS_R, TORUS_r, 72, 96)
  const nonIndexed = baseGeo.toNonIndexed()
  baseGeo.dispose()

  const pos = nonIndexed.attributes.position.array
  const nrm = nonIndexed.attributes.normal.array
  const uvData = nonIndexed.attributes.uv.array
  const tris = pos.length / 9

  const cellMap = new Map()
  for (let t = 0; t < tris; t++) {
    const uc = (uvData[t * 6] + uvData[t * 6 + 2] + uvData[t * 6 + 4]) / 3
    const vc = (uvData[t * 6 + 1] + uvData[t * 6 + 3] + uvData[t * 6 + 5]) / 3
    const s = cellSeed(uc, vc)
    const k = `${s[0].toFixed(9)}_${s[1].toFixed(9)}`
    if (!cellMap.has(k)) cellMap.set(k, { s, t: [] })
    cellMap.get(k).t.push(t)
  }

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1c2430),
    roughness: 0.7,
    metalness: 0.4,
    emissive: new THREE.Color(0x0a1018),
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  })

  const list = []
  const TWO_PI = Math.PI * 2

  for (const { s: seed, t: triList } of cellMap.values()) {
    if (!triList.length) continue
    const vc = triList.length * 3
    const pArr = new Float32Array(vc * 3)
    const nArr = new Float32Array(vc * 3)
    const uvArr = new Float32Array(vc * 2)
    let vi = 0
    for (const tri of triList) {
      for (let v = 0; v < 3; v++) {
        const sv = tri * 3 + v
        pArr[vi * 3] = pos[sv * 3]
        pArr[vi * 3 + 1] = pos[sv * 3 + 1]
        pArr[vi * 3 + 2] = pos[sv * 3 + 2]
        nArr[vi * 3] = nrm[sv * 3]
        nArr[vi * 3 + 1] = nrm[sv * 3 + 1]
        nArr[vi * 3 + 2] = nrm[sv * 3 + 2]
        uvArr[vi * 2] = uvData[sv * 2]
        uvArr[vi * 2 + 1] = uvData[sv * 2 + 1]
        vi++
      }
    }

    const phi = seed[0] * TWO_PI
    const theta = seed[1] * TWO_PI
    const cx = (TORUS_R + TORUS_r * Math.cos(theta)) * Math.cos(phi)
    const cy = (TORUS_R + TORUS_r * Math.cos(theta)) * Math.sin(phi)
    const cz = TORUS_r * Math.sin(theta)
    const cellCenter = new THREE.Vector3(cx, cy, cz)
    const majorPt = new THREE.Vector3(TORUS_R * Math.cos(phi), TORUS_R * Math.sin(phi), 0)
    const cellNormal = cellCenter.clone().sub(majorPt).normalize()

    const SHRINK = 0.965
    for (let i = 0; i < pArr.length; i += 3) {
      pArr[i] = (pArr[i] - cx) * SHRINK
      pArr[i + 1] = (pArr[i + 1] - cy) * SHRINK
      pArr[i + 2] = (pArr[i + 2] - cz) * SHRINK
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pArr, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(nArr, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))

    const rnd = hash2(seed[0] * 137.53, seed[1] * 137.53)
    const up = Math.abs(cellNormal.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)
    const tang = new THREE.Vector3().crossVectors(cellNormal, up).normalize()
    const bitang = new THREE.Vector3().crossVectors(cellNormal, tang)
    const aa = rnd[0] * TWO_PI
    const rotAxis = tang.clone().multiplyScalar(Math.cos(aa)).addScaledVector(bitang, Math.sin(aa)).normalize()

    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(cellCenter).addScaledVector(cellNormal, 0.012)
    mesh.userData = {
      cellCenter,
      cellNormal,
      rotAxis,
      maxAngle: 0.65 + rnd[1] * 0.85,
      lift: 0,
    }
    ringGroup.add(mesh)
    list.push(mesh)
  }

  nonIndexed.dispose()
  return { list, mat }
}

/**
 * Meshkat signal ring — connectivity artifact behind post-hero content.
 * Hover peels the shell open; scroll orbits the ring through stages.
 */
export default function SignalRingCanvas({ sectionRef }) {
  const canvasRef = useRef(null)
  const hostRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x07090d)

    const scrollGroup = new THREE.Group()
    scene.add(scrollGroup)
    const ringGroup = new THREE.Group()
    scrollGroup.add(ringGroup)
    scrollGroup.rotation.x = 0.18

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.z = 6.4

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      mobile ? 0.48 : 0.75,
      0.4,
      0.58,
    )
    composer.addPass(bloomPass)

    scene.add(new THREE.AmbientLight(0xffe8d0, 0.34))
    const key = new THREE.DirectionalLight(0xffd8b0, 2.5)
    key.position.set(3.2, 4.2, 5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x8899cc, 0.45)
    fill.position.set(-4, -2, -3)
    scene.add(fill)
    const ember = new THREE.PointLight(0xff6a1a, 1.4, 12)
    ember.position.set(0, 0.4, 2.2)
    scene.add(ember)

    const wireMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 barycentric;
        varying vec3 vBary;
        void main() {
          vBary = barycentric;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vBary;
        float wireMask(vec3 b, float t) {
          vec3 d = fwidth(b);
          vec3 a = smoothstep(vec3(0.0), d * t, b);
          return 1.0 - min(a.x, min(a.y, a.z));
        }
        void main() {
          float wf = wireMask(vBary, 1.55);
          vec3 col = mix(vec3(0.04, 0.05, 0.08), vec3(1.0, 0.38, 0.08), wf);
          col = mix(col, vec3(1.0, 0.7, 0.25) * 2.0, wf * 0.5);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    })

    const core = new THREE.Mesh(
      addBarycentricCoords(new THREE.TorusGeometry(TORUS_R, TORUS_r * 0.92, 56, 72)),
      wireMaterial,
    )
    ringGroup.add(core)

    const { list: fragments, mat: fragMat } = buildFragments(ringGroup)

    const rcMesh = new THREE.Mesh(
      new THREE.TorusGeometry(TORUS_R, TORUS_r, 48, 64),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    ringGroup.add(rcMesh)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)
    const hover = { point: new THREE.Vector3(), active: 0 }
    const localHover = new THREE.Vector3()

    const params = {
      hoverRadius: mobile ? 0.95 : 0.78,
      liftDist: 0.3,
      liftSpeedUp: 0.16,
      liftSpeedDown: 0.055,
    }

    let scrollP = 0
    let smoothP = 0
    let raf = 0
    let last = performance.now()
    let idleY = 0

    const resize = () => {
      const w = Math.max(1, host.clientWidth)
      const h = Math.max(1, host.clientHeight)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      composer.setSize(w, h)
      bloomPass.setSize(w, h)
    }

    const updateScroll = () => {
      const section = sectionRef?.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const total = Math.max(1, rect.height - window.innerHeight)
      scrollP = Math.min(1, Math.max(0, -rect.top / total))
    }

    const onMove = (e) => {
      const rect = host.getBoundingClientRect()
      if (e.clientY < rect.top || e.clientY > rect.bottom) {
        mouse.set(-999, -999)
        return
      }
      mouse.x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1
    }

    const onTouch = (e) => {
      const t = e.touches[0]
      if (!t) return
      onMove(t)
    }

    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      smoothP += (scrollP - smoothP) * (1 - Math.exp(-dt * 3.2))

      /* Stage motion: center → left → right */
      const p = smoothP
      const stage = p * 2
      let px = 0
      let rx = 0.18
      let ry = 0
      let rz = 0
      if (stage < 1) {
        const t = stage
        px = THREE.MathUtils.lerp(0, -2.1, t)
        rx = THREE.MathUtils.lerp(0.18, Math.PI * 0.42, t)
        ry = THREE.MathUtils.lerp(0, -Math.PI * 0.55, t)
        rz = THREE.MathUtils.lerp(0, Math.PI * 0.2, t)
      } else {
        const t = stage - 1
        px = THREE.MathUtils.lerp(-2.1, 2.1, t)
        rx = THREE.MathUtils.lerp(Math.PI * 0.42, -Math.PI * 0.4, t)
        ry = THREE.MathUtils.lerp(-Math.PI * 0.55, Math.PI * 0.55, t)
        rz = THREE.MathUtils.lerp(Math.PI * 0.2, -Math.PI * 0.2, t)
      }
      scrollGroup.position.x = px
      scrollGroup.rotation.set(rx, ry, rz)

      if (smoothP < 0.03) idleY += dt * 0.28
      ringGroup.rotation.y = idleY

      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObject(rcMesh)
      if (hits.length > 0) {
        ringGroup.worldToLocal(localHover.copy(hits[0].point))
        hover.point.copy(localHover)
        hover.active = Math.min(hover.active + dt * 5, 1)
      } else {
        hover.active = Math.max(hover.active - dt * 2.4, 0)
      }

      for (const frag of fragments) {
        const { cellCenter, cellNormal, rotAxis, maxAngle } = frag.userData
        let target = 0
        if (hover.active > 0.01) {
          const dist = cellCenter.distanceTo(hover.point)
          target = (1 - smoothstep(0.35, params.hoverRadius, dist)) * hover.active
        }
        const speed = target > frag.userData.lift ? params.liftSpeedUp : params.liftSpeedDown
        frag.userData.lift = THREE.MathUtils.lerp(frag.userData.lift, target, 1 - Math.exp(-speed * 60 * dt))
        const lift = frag.userData.lift
        frag.position.copy(cellCenter).addScaledVector(cellNormal, 0.012 + lift * params.liftDist)
        frag.quaternion.setFromAxisAngle(rotAxis, lift * maxAngle)
      }

      ember.intensity = 1.2 + hover.active * 0.8 + Math.sin(now * 0.002) * 0.15
      composer.render()
    }

    resize()
    updateScroll()
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    window.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateScroll, { passive: true })
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      fragments.forEach((m) => {
        m.geometry.dispose()
      })
      fragMat.dispose()
      core.geometry.dispose()
      wireMaterial.dispose()
      rcMesh.geometry.dispose()
      rcMesh.material.dispose()
      composer.dispose()
      renderer.dispose()
    }
  }, [sectionRef])

  return (
    <div className="signal-canvas-host" ref={hostRef} aria-hidden="true">
      <canvas ref={canvasRef} className="signal-webgl" />
      <div className="signal-scanlines" />
    </div>
  )
}
