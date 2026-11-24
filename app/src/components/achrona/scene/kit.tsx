import { Clone, useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { ComponentProps } from 'react'

// Buildings: Kenney Fantasy Town Kit (CC0). Islands: Hakan Bacon's Floating Islands (free, no attribution).
export const KENNEY = (name: string) => `/models/kenney/${name}.glb`
export const ISLANDS = '/models/islands/FloatingIsland.glb'

/** The world's light colours, shared by every scene module. */
export const LIGHT = {
  curse: '#a52bd9',
  curseHi: '#c75cf2',
  pink: '#e292f4',
  royal: '#3b74ff',
  frost: '#e1e7ff',
  ember: '#ff4a3d',
  amber: '#ff9a3c',
  lantern: '#ffb35c',
} as const

const tinted = new WeakSet<THREE.Object3D>()

/** Kenney's daylight palette (pink roofs, bright stone) pulled into moonlight, once per cached model. */
function nightTint(scene: THREE.Object3D) {
  if (tinted.has(scene)) return
  tinted.add(scene)
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const material = object.material as THREE.MeshStandardMaterial
    material.color.multiply(new THREE.Color('#9d92c9'))
    material.emissive = new THREE.Color('#2b1f4d')
    material.emissiveMap = material.map
    material.emissiveIntensity = 0.7
    material.roughness = 0.85
  })
}

/** A Kenney model placed in the world. */
export function Prop({
  name,
  ...props
}: { name: string } & Omit<ComponentProps<typeof Clone>, 'object'>) {
  const { scene } = useGLTF(KENNEY(name))
  nightTint(scene)
  return <Clone object={scene} castShadow receiveShadow {...props} />
}

/** A building assembled from wall panels (one per side, per floor) and a roof. */
export function House({
  position,
  floors = 1,
  wall = 'wall-window-shutters',
  door = 'wall-door',
  roof = 'roof-gable',
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number]
  floors?: number
  wall?: string
  door?: string
  roof?: string
  rotation?: number
  scale?: number
}) {
  const sides = [0, Math.PI / 2, Math.PI, -Math.PI / 2]
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {Array.from({ length: floors }, (_, floor) =>
        sides.map((angle, side) => (
          <Prop
            key={`${floor}-${side}`}
            name={floor === 0 && side === 0 ? door : wall}
            position={[0, floor, 0]}
            rotation={[0, angle, 0]}
          />
        )),
      )}
      <Prop name={roof} position={[0, floors, 0]} />
    </group>
  )
}

/** The islands pack ships dark daylight textures; lift them with Achrona's violet night glow. */
export function useNightMaterial(material: THREE.Material, glow = '#5a64b8') {
  return useMemo(() => {
    const night = (material as THREE.MeshStandardMaterial).clone()
    night.color = new THREE.Color('#ffffff')
    night.metalness = 0
    night.roughness = 0.9
    // Re-use the texture as a faint violet self-glow so the rock keeps its form under a night sky.
    night.emissive = new THREE.Color(glow)
    night.emissiveMap = night.map
    night.emissiveIntensity = 1.05
    return night
  }, [material, glow])
}

/** A raw ShaderMaterial built once; callers animate `uniforms.uTime` in useFrame. */
export function useShader(
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
  options: Partial<THREE.ShaderMaterialParameters> = {},
) {
  // Uniform values are read once; later changes go through material.uniforms.
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        ...options,
      }),
    [vertexShader, fragmentShader],
  )
}

export const UV_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

for (const name of [
  'wall',
  'wall-window-shutters',
  'wall-window-round',
  'wall-door',
  'roof-high-point',
  'roof-gable',
  'lantern',
]) {
  useGLTF.preload(KENNEY(name))
}
useGLTF.preload(ISLANDS)
