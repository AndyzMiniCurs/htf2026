import { ContactShadows, OrbitControls, Sparkles } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { ClaudeFamiliar } from './ClaudeFamiliar.tsx'

/** A small stage to look at Claude from every side while the battle is being built. */
export default function FamiliarPreview() {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [10, 7, 16], fov: 38 }}>
      <color attach="background" args={['#0c0f1a']} />
      <hemisphereLight args={['#9fb0ff', '#1a1530', 1.2]} />
      <directionalLight position={[6, 12, 8]} intensity={2.4} castShadow />
      <pointLight position={[0, 4, 6]} color="#ffb48a" intensity={30} distance={20} />
      <group scale={0.5} position={[0, 0.6, 0]}>
        <ClaudeFamiliar />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 64]} />
        <meshStandardMaterial color="#151a29" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[5.6, 5.8, 96]} />
        <meshBasicMaterial color="#e0b66a" toneMapped={false} />
      </mesh>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.6} scale={14} blur={2.5} far={6} />
      <Sparkles count={40} scale={[12, 6, 12]} position={[0, 3, 0]} size={3} color="#ffb48a" />
      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={30}
        target={[0, 2, 0]}
        autoRotate
        autoRotateSpeed={1.2}
      />
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.7} />
        <Vignette darkness={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
