import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const FRAG_SCALE = 32

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

/** Paper-lantern silhouette spun around Y (radius, height). */
function createLanternGeometry(radial = 56, heightSeg = 72) {
  const profile = [
    new THREE.Vector2(0.02, 1.42),
    new THREE.Vector2(0.18, 1.34),
    new THREE.Vector2(0.38, 1.22),
    new THREE.Vector2(0.52, 1.08),
    new THREE.Vector2(0.68, 0.82),
    new THREE.Vector2(0.78, 0.48),
    new THREE.Vector2(0.8, 0.12),
    new THREE.Vector2(0.76, -0.28),
    new THREE.Vector2(0.64, -0.62),
    new THREE.Vector2(0.46, -0.92),
    new THREE.Vector2(0.28, -1.12),
    new THREE.Vector2(0.12, -1.24),
    new THREE.Vector2(0.04, -1.3),
  ]
  const geo = new THREE.LatheGeometry(profile, radial)
  geo.computeVertexNormals()
  return geo
}

function buildFragments(lanternGroup, mobile) {
  const radial = mobile ? 40 : 56
  const heightSeg = mobile ? 48 : 72
  const baseGeo = createLanternGeometry(radial, heightSeg)
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
    color: new THREE.Color(0xc45a18),
    roughness: 0.55,
    metalness: 0.05,
    emissive: new THREE.Color(0xff7a1a),
    emissiveIntensity: 1.15,
    side: THREE.DoubleSide,
  })

  const list = []
  const TWO_PI = Math.PI * 2
  const tmpN = new THREE.Vector3()
  const tmpC = new THREE.Vector3()

  for (const { s: seed, t: triList } of cellMap.values()) {
    if (!triList.length) continue
    const vc = triList.length * 3
    const pArr = new Float32Array(vc * 3)
    const nArr = new Float32Array(vc * 3)
    const uvArr = new Float32Array(vc * 2)
    let vi = 0
    tmpC.set(0, 0, 0)
    tmpN.set(0, 0, 0)

    for (const tri of triList) {
      for (let v = 0; v < 3; v++) {
        const sv = tri * 3 + v
        const px = pos[sv * 3]
        const py = pos[sv * 3 + 1]
        const pz = pos[sv * 3 + 2]
        pArr[vi * 3] = px
        pArr[vi * 3 + 1] = py
        pArr[vi * 3 + 2] = pz
        nArr[vi * 3] = nrm[sv * 3]
        nArr[vi * 3 + 1] = nrm[sv * 3 + 1]
        nArr[vi * 3 + 2] = nrm[sv * 3 + 2]
        uvArr[vi * 2] = uvData[sv * 2]
        uvArr[vi * 2 + 1] = uvData[sv * 2 + 1]
        tmpC.x += px
        tmpC.y += py
        tmpC.z += pz
        tmpN.x += nrm[sv * 3]
        tmpN.y += nrm[sv * 3 + 1]
        tmpN.z += nrm[sv * 3 + 2]
        vi++
      }
    }

    tmpC.multiplyScalar(1 / vc)
    if (tmpN.lengthSq() < 1e-8) {
      tmpN.set(tmpC.x, 0, tmpC.z)
    }
    tmpN.normalize()

    const cx = tmpC.x
    const cy = tmpC.y
    const cz = tmpC.z
    const cellCenter = tmpC.clone()
    const cellNormal = tmpN.clone()

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
    const up = Math.abs(cellNormal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
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
      maxAngle: 0.55 + rnd[1] * 0.85,
      lift: 0,
    }
    lanternGroup.add(mesh)
    list.push(mesh)
  }

  nonIndexed.dispose()
  return { list, mat }
}

/**
 * Meshkat fracture lantern — Voronoi shell + luminous wireframe core.
 * Hover peels fragments; scroll orbits through stages.
 */
export default function SignalLanternCanvas({ sectionRef }) {
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
    const lanternGroup = new THREE.Group()
    scrollGroup.add(lanternGroup)
    scrollGroup.rotation.x = 0.12
    scrollGroup.position.y = 0.15

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.z = 5.6

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      mobile ? 1.15 : 1.65,
      0.85,
      0.12,
    )
    composer.addPass(bloomPass)

    scene.add(new THREE.AmbientLight(0xffc891, 0.22))
    const key = new THREE.DirectionalLight(0xffe0b8, 1.4)
    key.position.set(3.2, 4.2, 5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x6a7a99, 0.25)
    fill.position.set(-4, -2, -3)
    scene.add(fill)
    const flame = new THREE.PointLight(0xff7a1a, 4.5, 14, 1.1)
    flame.position.set(0, 0.1, 0)
    lanternGroup.add(flame)
    const flameSoft = new THREE.PointLight(0xffc060, 2.2, 8, 1.6)
    flameSoft.position.set(0, -0.15, 0)
    lanternGroup.add(flameSoft)

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
          float wf = wireMask(vBary, 1.35);
          vec3 base = vec3(0.18, 0.04, 0.0);
          vec3 edge = vec3(1.4, 0.45, 0.08);
          vec3 hot = vec3(2.4, 1.35, 0.35);
          vec3 col = mix(base, edge, wf);
          col = mix(col, hot, wf * 0.7);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    })

    const coreGeo = createLanternGeometry(mobile ? 32 : 48, mobile ? 40 : 56)
    coreGeo.scale(0.92, 0.92, 0.92)
    const core = new THREE.Mesh(addBarycentricCoords(coreGeo), wireMaterial)
    lanternGroup.add(core)

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffb040,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 28, 28), glowMat)
    glow.position.y = 0.05
    glow.scale.set(1, 1.45, 1)
    lanternGroup.add(glow)

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff6a14,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 32), haloMat)
    halo.scale.set(0.85, 1.15, 0.85)
    lanternGroup.add(halo)

    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xff8c28,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const aura = new THREE.Mesh(new THREE.SphereGeometry(1.65, 32, 32), auraMat)
    aura.scale.set(0.9, 1.2, 0.9)
    lanternGroup.add(aura)

    const { list: fragments, mat: fragMat } = buildFragments(lanternGroup, mobile)

    const rcGeo = createLanternGeometry(mobile ? 24 : 36, mobile ? 32 : 48)
    const rcMesh = new THREE.Mesh(rcGeo, new THREE.MeshBasicMaterial({ visible: false }))
    lanternGroup.add(rcMesh)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)
    const hover = { point: new THREE.Vector3(), active: 0 }
    const localHover = new THREE.Vector3()

    const params = {
      hoverRadius: mobile ? 1.05 : 0.9,
      liftDist: 0.34,
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

      const p = smoothP
      const stage = p * 2
      let px = 0
      let py = 0.15
      let rx = 0.12
      let ry = 0
      let rz = 0
      if (stage < 1) {
        const t = stage
        px = THREE.MathUtils.lerp(0, -2.0, t)
        py = THREE.MathUtils.lerp(0.15, 0.05, t)
        rx = THREE.MathUtils.lerp(0.12, Math.PI * 0.28, t)
        ry = THREE.MathUtils.lerp(0, -Math.PI * 0.45, t)
        rz = THREE.MathUtils.lerp(0, Math.PI * 0.12, t)
      } else {
        const t = stage - 1
        px = THREE.MathUtils.lerp(-2.0, 2.0, t)
        py = THREE.MathUtils.lerp(0.05, 0.1, t)
        rx = THREE.MathUtils.lerp(Math.PI * 0.28, -Math.PI * 0.22, t)
        ry = THREE.MathUtils.lerp(-Math.PI * 0.45, Math.PI * 0.45, t)
        rz = THREE.MathUtils.lerp(Math.PI * 0.12, -Math.PI * 0.12, t)
      }
      scrollGroup.position.set(px, py, 0)
      scrollGroup.rotation.set(rx, ry, rz)

      if (smoothP < 0.03) idleY += dt * 0.32
      lanternGroup.rotation.y = idleY

      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObject(rcMesh)
      if (hits.length > 0) {
        lanternGroup.worldToLocal(localHover.copy(hits[0].point))
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
        frag.userData.lift = THREE.MathUtils.lerp(
          frag.userData.lift,
          target,
          1 - Math.exp(-speed * 60 * dt),
        )
        const lift = frag.userData.lift
        frag.position.copy(cellCenter).addScaledVector(cellNormal, 0.012 + lift * params.liftDist)
        frag.quaternion.setFromAxisAngle(rotAxis, lift * maxAngle)
      }

      const pulse = 0.5 + 0.5 * Math.sin(now * 0.0035)
      const flicker = 0.5 + 0.5 * Math.sin(now * 0.011) * Math.sin(now * 0.007)
      const glowAmt = 1 + hover.active * 0.85 + pulse * 0.2 + flicker * 0.15

      flame.intensity = 3.8 * glowAmt
      flameSoft.intensity = 1.8 * glowAmt
      fragMat.emissiveIntensity = 0.95 + hover.active * 0.7 + pulse * 0.25 + flicker * 0.15

      glowMat.opacity = 0.75 + hover.active * 0.25 + pulse * 0.12
      glow.scale.setScalar(1.05 + hover.active * 0.35 + pulse * 0.08)
      glow.scale.y = glow.scale.x * 1.45

      haloMat.opacity = 0.22 + hover.active * 0.2 + pulse * 0.06
      halo.scale.set(0.82 + hover.active * 0.12, 1.12 + hover.active * 0.15, 0.82 + hover.active * 0.12)

      auraMat.opacity = 0.1 + hover.active * 0.16 + pulse * 0.04
      aura.scale.set(0.88 + hover.active * 0.18, 1.18 + hover.active * 0.2, 0.88 + hover.active * 0.18)

      bloomPass.strength = (mobile ? 1.05 : 1.55) + hover.active * 0.45 + pulse * 0.12

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
      fragments.forEach((m) => m.geometry.dispose())
      fragMat.dispose()
      core.geometry.dispose()
      wireMaterial.dispose()
      glow.geometry.dispose()
      glowMat.dispose()
      halo.geometry.dispose()
      haloMat.dispose()
      aura.geometry.dispose()
      auraMat.dispose()
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
