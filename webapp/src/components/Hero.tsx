import { useMemo, useRef, useEffect } from 'react';
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

    // Track ball position in a ref (updated via a single subscription)
    const posRef = useRef<[number, number, number]>([...startPosition]);

    // Apply physics
    const [ref, api] = useSphere(() => ({
        mass: 1,
        position: startPosition,
        args: [1], // radius 1
        material: { friction: 0.1, restitution: 0.7 },
        linearDamping: 0.6, // Slightly higher damping for smoother following
        angularDamping: 0.4
    }));

    // Subscribe ONCE to track position — clean up on unmount
    useEffect(() => {
        const unsub = api.position.subscribe((p) => {
            posRef.current = [p[0], p[1], p[2]];
        });
        return unsub;
    }, [api.position]);

    // Mouse interaction - hit the ball on direct hover
    const handlePointerOver = () => {
        const impulseX = (Math.random() - 0.5) * 12;
        const impulseZ = (Math.random() - 0.5) * 12;
        const impulseY = (Math.random() - 0.5) * 8;
        api.applyImpulse([impulseX, impulseY, impulseZ], [0, 0, 0]);
        api.applyTorque([(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5]);
    };

    // Every frame: apply a smooth attraction force towards the mouse pointer
    useFrame(({ mouse, viewport }) => {
        // Convert normalised mouse coords (-1..1) to world-space XY
        const targetX = (mouse.x * viewport.width) / 2;
        const targetY = (mouse.y * viewport.height) / 2;

        const [bx, by, bz] = posRef.current;
        const dx = targetX - bx;
        const dy = targetY - by;
        const dz = 0 - bz; // Pull towards z=0 plane

        // Strength scales with distance so balls far away catch up faster
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const strength = Math.min(dist * 0.8, 6); // Capped so they don't overshoot

        if (dist > 0.01) {
            // Normalise direction, multiply by strength
            const factor = strength / dist;
            api.applyForce([dx * factor * 2.5, dy * factor * 2.5, dz * factor * 1.5], [0, 0, 0]);
        }
    });

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
                color={number ? "#ffffff" : color}
                roughness={0.15}
                metalness={0.0}
                clearcoat={1.0}
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


export default function HeroScene() {
    return (
        <div className="w-full h-full absolute inset-0 -z-10 bg-background-light opacity-60 pointer-events-auto">
            <Canvas shadows className="w-full h-full pointer-events-auto">
                <PerspectiveCamera makeDefault position={[0, 8, 15]} fov={35} />
                <color attach="background" args={['transparent']} />

                {/* Lighting setup based on a premium pool hall */}
                <ambientLight intensity={1.2} />
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
                    <Physics gravity={[0, 0, 0]} allowSleep={false}>
                        <TableBoundaries />

                        {/* Cue Ball */}
                        <BilliardBall startPosition={[-3, 0, 0]} color="#ffffff" />

                        {/* 1-Ball (Solid Yellow) */}
                        <BilliardBall startPosition={[1.5, 2, -0.9]} color="#facc15" number="1" />
                        {/* 2-Ball (Solid Blue) */}
                        <BilliardBall startPosition={[2, -1, 1]} color="#2563eb" number="2" />
                        {/* 3-Ball (Solid Red) */}
                        <BilliardBall startPosition={[1.5, 1, 0.9]} color="#dc2626" number="3" />
                        {/* 4-Ball (Solid Purple) */}
                        <BilliardBall startPosition={[2.5, 0, -2]} color="#6b21a8" number="4" />
                        {/* 5-Ball (Solid Orange) */}
                        <BilliardBall startPosition={[3, 2, 1]} color="#ea580c" number="5" />
                        {/* 6-Ball (Solid Green) */}
                        <BilliardBall startPosition={[1, -2, -1]} color="#059467" number="6" />
                        {/* 7-Ball (Solid Maroon) */}
                        <BilliardBall startPosition={[0, 2, -2]} color="#7f1d1d" number="7" />
                        {/* 8-Ball (Black) */}
                        <BilliardBall startPosition={[0, 0, 0]} color="#111111" number="8" />
                        {/* 9-Ball (Stripe Yellow) */}
                        <BilliardBall startPosition={[3, -2, 0]} color="#facc15" number="9" isStripe />
                        {/* 10-Ball (Stripe Blue) */}
                        <BilliardBall startPosition={[-2, 2, 2]} color="#2563eb" number="10" isStripe />
                        {/* 11-Ball (Stripe Red) */}
                        <BilliardBall startPosition={[3, 1, -1.8]} color="#dc2626" number="11" isStripe />
                        {/* 12-Ball (Stripe Purple) */}
                        <BilliardBall startPosition={[-1, -2, 1]} color="#6b21a8" number="12" isStripe />
                        {/* 13-Ball (Stripe Orange) */}
                        <BilliardBall startPosition={[-2, 0, -2]} color="#ea580c" number="13" isStripe />
                        {/* 14-Ball (Stripe Green) */}
                        <BilliardBall startPosition={[3, 1, 1.8]} color="#059467" number="14" isStripe />
                        {/* 15-Ball (Stripe Maroon) */}
                        <BilliardBall startPosition={[-3, -1, 2]} color="#7f1d1d" number="15" isStripe />

                    </Physics>

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

            {/* <div className="absolute top-4 left-6 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold text-slate-700 dark:text-emerald-100 uppercase tracking-widest flex items-center gap-2 pointer-events-none">
                <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Interactive Floating Physics
            </div> */}
        </div>
    );
}
