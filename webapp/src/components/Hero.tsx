import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, ContactShadows, PresentationControls } from '@react-three/drei';
import { Physics, useSphere, usePlane } from '@react-three/cannon';
import * as THREE from 'three';

// Utility function to generate a realistic pool ball texture
function createBallTexture(color: string, number?: string, isStripe?: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Base color or white base for stripes
    ctx.fillStyle = isStripe ? '#ffffff' : color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isStripe) {
        // Draw the colored stripe
        ctx.fillStyle = color;
        ctx.fillRect(0, 48, canvas.width, 160);
    }

    if (number) {
        // Draw the white circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Centered vertically, horizontally slightly offset for better spherical mapping wrapping
        ctx.arc(128, 128, 45, 0, Math.PI * 2);
        // Draw an identical circle on the other side of the UV map 
        ctx.arc(384, 128, 45, 0, Math.PI * 2);
        ctx.fill();

        // Draw the number inside the circles
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(number, 128, 130);
        ctx.fillText(number, 384, 130);

        // Optional small underscore for 6 and 9
        if (number === '6' || number === '9') {
            ctx.fillRect(115, 155, 26, 4);
            ctx.fillRect(371, 155, 26, 4);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
}

// A single Billiard Ball Component (Physics enabled)
function BilliardBall({
    startPosition,
    color,
    number,
    isStripe
}: {
    startPosition: [number, number, number],
    color: string,
    number?: string,
    isStripe?: boolean
}) {
    // Generate texture once per ball
    const texture = useMemo(() => createBallTexture(color, number, isStripe), [color, number, isStripe]);

    // Apply physics
    const [ref, api] = useSphere(() => ({
        mass: 1, // 1 kg standard mass
        position: startPosition,
        args: [1], // radius 1
        material: { friction: 0.1, restitution: 0.7 }, // bouncy and slightly slippery like real phenolic resin
        linearDamping: 0.4, // Simulate table felt friction slowing the ball down
        angularDamping: 0.4
    }));

    // Mouse interaction - hit the ball
    const handlePointerOver = () => {
        // Apply a random energetic impulse to scatter it
        const impulseX = (Math.random() - 0.5) * 15;
        const impulseZ = (Math.random() - 0.5) * 15;
        api.applyImpulse([impulseX, 0, impulseZ], [0, 0, 0]);
        // Also apply some random spin
        api.applyTorque([(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5]);
    };

    return (
        <mesh
            ref={ref as any}
            onPointerOver={handlePointerOver}
            castShadow
            receiveShadow
        >
            <sphereGeometry args={[1, 64, 64]} />
            <meshPhysicalMaterial
                map={texture}
                color={number ? "#ffffff" : color} // If it has a texture map, base color is white to let map show perfectly. Otherwise solid.
                roughness={0.15}
                metalness={0.0}
                clearcoat={1.0} // Shiny glossy outer layer
                clearcoatRoughness={0.1}
            />
        </mesh>
    );
}

// Invisible boundary planes to keep balls on the "table"
function TableBoundaries() {
    // Floor
    usePlane(() => ({ position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], material: { friction: 0.2, restitution: 0.5 } }));

    // Invisible Rails preventing balls flying off
    // North rail
    usePlane(() => ({ position: [0, 0, -8], rotation: [0, 0, 0], material: { restitution: 0.8 } }));
    // South rail
    usePlane(() => ({ position: [0, 0, 8], rotation: [0, Math.PI, 0], material: { restitution: 0.8 } }));
    // East rail
    usePlane(() => ({ position: [10, 0, 0], rotation: [0, -Math.PI / 2, 0], material: { restitution: 0.8 } }));
    // West rail
    usePlane(() => ({ position: [-10, 0, 0], rotation: [0, Math.PI / 2, 0], material: { restitution: 0.8 } }));

    // Ceiling (just in case they get hit too hard)
    usePlane(() => ({ position: [0, 5, 0], rotation: [Math.PI / 2, 0, 0], material: { restitution: 0.2 } }));

    return null;
}

// A stylised Snooker/Pool Cue
function PoolCue() {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHover] = useState(false);

    useFrame(({ clock, mouse }) => {
        if (groupRef.current) {
            // Smoothly track mouse position to point the cue
            if (hovered) {
                const targetZ = mouse.x * -2;
                const targetY = mouse.y * 2 + 1;
                groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.1;
                groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.1;
                groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 2) * 0.05;
            } else {
                // Return to rested float
                groupRef.current.position.z += (0 - groupRef.current.position.z) * 0.05;
                groupRef.current.position.y += (1 - groupRef.current.position.y) * 0.05;
            }
        }
    });

    return (
        <group
            ref={groupRef}
            position={[8, 1, 0]}
            rotation={[0, 0, Math.PI / 2.2]}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            {/* Main Shaft (Wood) */}
            <mesh position={[0, -5, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.4, 10, 32]} />
                <meshStandardMaterial color="#8B5A2B" roughness={0.4} />
            </mesh>
            {/* Butt wrap (Black handle) */}
            <mesh position={[0, -8, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.4, 4, 32]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>
            {/* Ferrule (White tip base) */}
            <mesh position={[0, 0.1, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.2, 0.2, 32]} />
                <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </mesh>
            {/* Tip (Blue) */}
            <mesh position={[0, 0.25, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.2, 0.1, 32]} />
                <meshStandardMaterial color="#4169E1" roughness={0.9} />
            </mesh>
        </group>
    );
}

export default function HeroScene() {
    return (
        <div className="w-full h-[500px] lg:h-[600px] relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-emerald-900/10 to-transparent border border-white/20 backdrop-blur-sm">
            <Canvas shadows className="w-full h-full pointer-events-auto">
                <PerspectiveCamera makeDefault position={[0, 8, 15]} fov={35} />
                <color attach="background" args={['transparent']} />

                {/* Lighting setup based on a premium pool hall */}
                <ambientLight intensity={0.4} />
                <spotLight
                    position={[0, 15, 0]}
                    angle={0.6}
                    penumbra={0.5}
                    intensity={2}
                    castShadow
                    shadow-bias={-0.0001}
                />
                <pointLight position={[-10, 10, 10]} intensity={0.5} color="#e6f2ff" />

                <PresentationControls
                    global
                    rotation={[0, 0.3, 0]}
                    polar={[-Math.PI / 3, Math.PI / 3]}
                    azimuth={[-Math.PI / 1.4, Math.PI / 2]}
                >
                    <Physics gravity={[0, -20, 0]} allowSleep={false}>
                        <TableBoundaries />

                        {/* Cue Ball */}
                        <BilliardBall startPosition={[-3, 1, 0]} color="#ffffff" />

                        {/* 8-Ball (Black) */}
                        <BilliardBall startPosition={[0, 1, 0]} color="#111111" number="8" />

                        {/* 1-Ball (Solid Yellow) */}
                        <BilliardBall startPosition={[1.5, 1, -0.9]} color="#facc15" number="1" />

                        {/* 3-Ball (Solid Red) */}
                        <BilliardBall startPosition={[1.5, 1, 0.9]} color="#dc2626" number="3" />

                        {/* 9-Ball (Stripe Yellow) */}
                        <BilliardBall startPosition={[3, 1, 0]} color="#facc15" number="9" isStripe />

                        {/* 11-Ball (Stripe Red) */}
                        <BilliardBall startPosition={[3, 1, -1.8]} color="#dc2626" number="11" isStripe />

                        {/* 14-Ball (Stripe Green) */}
                        <BilliardBall startPosition={[3, 1, 1.8]} color="#059467" number="14" isStripe />

                    </Physics>

                    {/* Visual Pool Cue */}
                    <PoolCue />

                </PresentationControls>

                {/* Realistic table surface reflection underneath */}
                <ContactShadows
                    position={[0, 0, 0]}
                    opacity={0.5}
                    scale={40}
                    blur={1.5}
                    far={4}
                    color="#012015"
                />

                <Environment preset="studio" />
            </Canvas>

            {/* Aesthestic Overlays */}
            <div className="absolute top-4 left-6 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold text-slate-700 dark:text-emerald-100 uppercase tracking-widest flex items-center gap-2 pointer-events-none">
                <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Interactive 3D Engine
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-500/70 tracking-widest uppercase pointer-events-none">
                Drag to rotate • Hover to animate
            </div>
        </div>
    );
}
