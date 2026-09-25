"use client";
import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, ContactShadows } from '@react-three/drei';
import { RefreshCw, Box } from 'lucide-react';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.5} position={[0, -1, 0]} />;
}

function FallbackPot() {
  return (
    <group position={[0, -0.6, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 0.9, 1.2, 32]} />
        <meshStandardMaterial color="#d4a373" roughness={0.9} />
      </mesh>
      {/* Inner hollow */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.15, 0.85, 1.15, 32]} />
        <meshStandardMaterial color="#4a3b2c" roughness={1} />
      </mesh>
    </group>
  );
}

export default function Craft3DViewer({ modelUrl }: { modelUrl?: string }) {
  const [showAR, setShowAR] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '500px', backgroundColor: '#f0ede6', borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        
        <Suspense fallback={null}>
          {modelUrl ? <Model url={modelUrl} /> : <FallbackPot />}
          <Environment preset="sunset" />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
        </Suspense>
        
        <OrbitControls autoRotate autoRotateSpeed={1} enableZoom={true} enablePan={false} />
      </Canvas>

      {/* AR Button Overlay */}
      <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => {
            // In a real app, this would trigger WebXR or QuickLook
            alert("AR Mode: On a mobile device, this opens the native AR viewer to place the craft in your room.");
          }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            padding: '10px 16px', borderRadius: '24px', 
            backgroundColor: '#1a1a1a', color: 'white', 
            border: 'none', cursor: 'pointer', fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
          <Box size={18} /> View in your room (AR)
        </button>
      </div>

      <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(255,255,255,0.8)', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}>
        3D Interactive
      </div>
    </div>
  );
}
