import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'

const FRAG_SCALE = 42

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

/** Paper-lantern silhouette (radius, height) — same fracture format as the donut demo. */
function createLanternGeometry(radial = 72) {
  const profile = [
    new THREE.Vector2(0.02, 1.55),
    new THREE.Vector2(0.22, 1.45),
    new THREE.Vector2(0.42, 1.3),
    new THREE.Vector2(0.58, 1.1),
    new THREE.Vector2(0.74, 0.78),
    new THREE.Vector2(0.86, 0.4),
    new THREE.Vector2(0.9, 0.0),
    new THREE.Vector2(0.86, -0.4),
    new THREE.Vector2(0.72, -0.78),
    new THREE.Vector2(0.52, -1.1),
    new THREE.Vector2(0.32, -1.32),
    new THREE.Vector2(0.14, -1.45),
    new THREE.Vector2(0.03, -1.52),
  ]
  const geo = new THREE.LatheGeometry(profile, radial)
  geo.computeVertexNormals()
  return geo
}

function buildFragments(lanternGroup, textures, mobile) {
  const radial = mobile ? 48 : 80
  const baseGeo = createLanternGeometry(radial)
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
    map: textures.diffuse,
    normalMap: textures.normal,
    roughnessMap: textures.arm,
    roughness: 1.0,
    metalness: 0.0,
    emissive: new THREE.Color(0xff4d00),
    emissiveIntensity: 0,
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
    if (tmpN.lengthSq() < 1e-8) tmpN.set(tmpC.x, 0, tmpC.z)
    tmpN.normalize()

    const cx = tmpC.x
    const cy = tmpC.y
    const cz = tmpC.z
    const cellCenter = tmpC.clone()
    const cellNormal = tmpN.clone()

    const SHRINK = 0.955
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

    const fragMat = mat.clone()
    const mesh = new THREE.Mesh(geo, fragMat)
    mesh.position.copy(cellCenter).addScaledVector(cellNormal, 0.015)
    mesh.userData = {
      cellCenter,
      cellNormal,
      rotAxis,
      maxAngle: 0.85 + rnd[1] * 1.1,
      lift: 0,
      heat: rnd[0],
    }
    lanternGroup.add(mesh)
    list.push(mesh)
  }

  nonIndexed.dispose()
  mat.dispose()
  return { list }
}

/**
 * Fracture lantern in Digital-Donut format:
 * PBR stone shell · barycentric fire wireframe · UnrealBloom · hover peel.
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
    scene.background = new THREE.Color(0x080808)

    const scrollGroup = new THREE.Group()
    scene.add(scrollGroup)
    const lanternGroup = new THREE.Group()
    scrollGroup.add(lanternGroup)
    scrollGroup.rotation.x = 0.15
    scrollGroup.position.y = 0.1

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    camera.position.z = 6.2

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      mobile ? 0.6 : 0.85,
      0.45,
      0.55,
    )
    composer.addPass(bloomPass)

    const fxaaPass = new ShaderPass(FXAAShader)
    fxaaPass.uniforms.resolution.value.set(1, 1)
    composer.addPass(fxaaPass)

    scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    const dirLight = new THREE.DirectionalLight(0xfff4e0, 2.8)
    dirLight.position.set(3, 4, 5)
    scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0xaabbff, 0.5)
    fillLight.position.set(-4, -2, -3)
    scene.add(fillLight)

    const textureLoader = new THREE.TextureLoader()
    const diffuse = textureLoader.load(
      'https://raw.githubusercontent.com/danielyl123/person/refs/heads/main/diffuse.jpg',
    )
    const normalTex = textureLoader.load(
      'https://raw.githubusercontent.com/danielyl123/person/refs/heads/main/normal.jpg',
    )
    const arm = textureLoader.load(
      'https://raw.githubusercontent.com/danielyl123/person/refs/heads/main/arm.jpg',
    )
    ;[diffuse, normalTex, arm].forEach((tex) => {
      tex.repeat.set(2, 2)
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    })
    diffuse.colorSpace = THREE.SRGBColorSpace

    const wireMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 barycentric;
        varying vec3 vBary;
        void main() {
          vBary = barycentric;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vBary;
        float wireMask(vec3 b, float t) {
          vec3 d = fwidth(b);
          vec3 a = smoothstep(vec3(0.0), d * t, b);
          return 1.0 - min(a.x, min(a.y, a.z));
        }
        void main() {
          float wf = wireMask(vBary, 1.6);
          vec3 col = mix(vec3(0.07, 0.01, 0.0), vec3(1.0, 0.28, 0.04), wf);
          col = mix(col, vec3(1.0, 0.8, 0.3) * 2.2, wf * 0.55);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    })

    const coreGeo = createLanternGeometry(mobile ? 48 : 72)
    coreGeo.scale(0.94, 0.94, 0.94)
    const core = new THREE.Mesh(addBarycentricCoords(coreGeo), wireMaterial)
    lanternGroup.add(core)

    const { list: fragments } = buildFragments(
      lanternGroup,
      { diffuse, normal: normalTex, arm },
      mobile,
    )

    const rcMesh = new THREE.Mesh(
      createLanternGeometry(mobile ? 32 : 48),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    lanternGroup.add(rcMesh)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)
    const hover = { point: new THREE.Vector3(), active: 0 }
    const localHover = new THREE.Vector3()

    const fragParams = {
      hoverRadius: mobile ? 1.15 : 0.95,
      liftDist: 0.48,
      liftSpeedUp: 0.22,
      liftSpeedDown: 0.07,
    }

    const baseBloom = mobile ? 0.6 : 0.85
    let scrollP = 0
    let smoothP = 0
    let raf = 0
    let last = performance.now()
    let idleY = 0
    let intro = 0

    const resize = () => {
      const w = Math.max(1, host.clientWidth)
      const h = Math.max(1, host.clientHeight)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      composer.setSize(w, h)
      bloomPass.setSize(w, h)
      fxaaPass.uniforms.resolution.value.set(1 / w, 1 / h)
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

      intro = Math.min(1, intro + dt / 2.4)
      const easeIntro = 1 - Math.pow(1 - intro, 3)

      smoothP += (scrollP - smoothP) * (1 - Math.exp(-dt * 2.2))

      const p = smoothP
      const stage = p * 2
      let px = 0
      let py = THREE.MathUtils.lerp(-0.8, 0.1, easeIntro)
      let rx = 0.15
      let ry = THREE.MathUtils.lerp(Math.PI, 0, easeIntro)
      let rz = 0

      if (stage < 1) {
        const t = stage
        px = THREE.MathUtils.lerp(0, -2.3, t)
        rx = THREE.MathUtils.lerp(0.15, Math.PI * 0.5, t)
        ry = THREE.MathUtils.lerp(ry, -Math.PI * 0.6, t)
        rz = THREE.MathUtils.lerp(0, Math.PI * 0.25, t)
      } else {
        const t = stage - 1
        px = THREE.MathUtils.lerp(-2.3, 2.3, t)
        rx = THREE.MathUtils.lerp(Math.PI * 0.5, -Math.PI * 0.5, t)
        ry = THREE.MathUtils.lerp(-Math.PI * 0.6, Math.PI * 0.6, t)
        rz = THREE.MathUtils.lerp(Math.PI * 0.25, -Math.PI * 0.25, t)
      }

      scrollGroup.position.set(px, py, 0)
      scrollGroup.rotation.set(rx, ry, rz)

      if (smoothP < 0.02 && intro >= 1) idleY += dt * ((Math.PI * 2) / 22)
      lanternGroup.rotation.y = idleY

      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObject(rcMesh)
      if (hits.length > 0) {
        lanternGroup.worldToLocal(localHover.copy(hits[0].point))
        hover.point.copy(localHover)
        hover.active = Math.min(hover.active + dt * 5, 1)
      } else {
        hover.active = Math.max(hover.active - dt * 2.5, 0)
      }

      let openGlow = 0
      for (const frag of fragments) {
        const { cellCenter, cellNormal, rotAxis, maxAngle, heat } = frag.userData
        let target = 0
        if (hover.active > 0.01) {
          const dist = cellCenter.distanceTo(hover.point)
          target = (1 - smoothstep(0.25, fragParams.hoverRadius, dist)) * hover.active
        }
        const speed = target > frag.userData.lift ? fragParams.liftSpeedUp : fragParams.liftSpeedDown
        frag.userData.lift = THREE.MathUtils.lerp(frag.userData.lift, target, speed)
        const lift = frag.userData.lift
        openGlow = Math.max(openGlow, lift)

        frag.position
          .copy(cellCenter)
          .addScaledVector(cellNormal, 0.015 + lift * fragParams.liftDist)
        frag.quaternion.setFromAxisAngle(rotAxis, lift * maxAngle)
        frag.scale.setScalar(1 + lift * 0.08)

        /* Bright glowing pieces when peeled open */
        const glow = lift * lift
        frag.material.emissive.setRGB(
          1.0,
          0.22 + heat * 0.2 + glow * 0.35,
          0.02 + glow * 0.08,
        )
        frag.material.emissiveIntensity = glow * (2.8 + heat * 1.4)
        frag.material.roughness = 1.0 - glow * 0.55
      }

      bloomPass.strength = baseBloom + openGlow * 0.75
      bloomPass.threshold = Math.max(0.2, 0.55 - openGlow * 0.25)

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
        m.material.dispose()
      })
      core.geometry.dispose()
      wireMaterial.dispose()
      rcMesh.geometry.dispose()
      rcMesh.material.dispose()
      diffuse.dispose()
      normalTex.dispose()
      arm.dispose()
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
