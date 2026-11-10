import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePrefersReducedMotion } from "./hooks";

/* ------------------------------------------------------------------ */
/* Shield geometry — built from a 2D shape, extruded. No model download */
/* ------------------------------------------------------------------ */
function shieldGeometry() {
  const w = 1.15;
  const h = 1.5;
  const s = new THREE.Shape();
  s.moveTo(0, h);
  s.bezierCurveTo(w * 0.55, h * 0.92, w * 0.98, h * 0.72, w * 0.98, h * 0.28);
  s.bezierCurveTo(w * 0.98, -h * 0.28, w * 0.66, -h * 0.72, 0, -h);
  s.bezierCurveTo(-w * 0.66, -h * 0.72, -w * 0.98, -h * 0.28, -w * 0.98, h * 0.28);
  s.bezierCurveTo(-w * 0.98, h * 0.72, -w * 0.55, h * 0.92, 0, h);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3,
    curveSegments: 28,
  });
  geo.center();
  return geo;
}

/* ------------------------------------------------------------------ */
/* Network nodes + edges orbiting the shield                           */
/* ------------------------------------------------------------------ */
const NODE_COUNT = 26;

function NetworkShell({ reduced }) {
  const group = useRef();

  const { positions, edges } = useMemo(() => {
    const pts = [];
    const R = 2.35;
    // Fibonacci sphere for an even, non-clumpy distribution.
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < NODE_COUNT; i++) {
      const y = 1 - (i / (NODE_COUNT - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      pts.push(
        new THREE.Vector3(Math.cos(theta) * r * R, y * R * 0.78, Math.sin(theta) * r * R)
      );
    }

    // Connect each node to its two nearest neighbours → readable topology.
    const idx = [];
    pts.forEach((p, i) => {
      const dists = pts
        .map((q, j) => ({ j, d: p.distanceTo(q) }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      dists.forEach((o) => {
        const a = Math.min(i, o.j);
        const b = Math.max(i, o.j);
        const key = `${a}-${b}`;
        if (!idx.includes(key)) idx.push(key);
      });
    });

    const seg = [];
    idx.forEach((k) => {
      const [a, b] = k.split("-").map(Number);
      seg.push(pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z);
    });

    return {
      positions: new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])),
      edges: new Float32Array(seg),
    };
  }, []);

  useFrame((state) => {
    if (!group.current || reduced) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.11;
    group.current.rotation.x = Math.sin(t * 0.18) * 0.09;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.075}
          color="#b8ff2e"
          sizeAttenuation
          transparent
          opacity={0.9}
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edges, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.28} />
      </lineSegments>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The shield                                                          */
/* ------------------------------------------------------------------ */
function Shield({ reduced }) {
  const mesh = useRef();
  const inner = useRef();
  const geo = useMemo(() => shieldGeometry(), []);
  const edge = useMemo(() => new THREE.EdgesGeometry(geo, 24), [geo]);

  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const px = state.pointer.x;
    const py = state.pointer.y;

    if (mesh.current) {
      // Gentle idle sway + mouse parallax, damped so it never snaps.
      const targetY = px * 0.42 + Math.sin(t * 0.4) * 0.07;
      const targetX = -py * 0.3 + Math.cos(t * 0.33) * 0.05;
      mesh.current.rotation.y += (targetY - mesh.current.rotation.y) * 0.055;
      mesh.current.rotation.x += (targetX - mesh.current.rotation.x) * 0.055;
      mesh.current.position.y = Math.sin(t * 0.75) * 0.075;
    }
    if (inner.current) {
      inner.current.rotation.y = mesh.current?.rotation.y ?? 0;
      inner.current.rotation.x = mesh.current?.rotation.x ?? 0;
      inner.current.position.y = mesh.current?.position.y ?? 0;
    }
  });

  return (
    <group>
      <mesh ref={mesh} geometry={geo} castShadow={false}>
        <meshStandardMaterial
          color="#0d1522"
          metalness={0.72}
          roughness={0.32}
          emissive="#b8ff2e"
          emissiveIntensity={0.1}
          envMapIntensity={1}
        />
      </mesh>
      <lineSegments ref={inner} geometry={edge}>
        <lineBasicMaterial color="#b8ff2e" transparent opacity={0.85} />
      </lineSegments>
    </group>
  );
}

/* Subtle drifting particles for depth. */
function Particles({ reduced }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const n = 90;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 9;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (reduced || !ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.025;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#94a3b8" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

/* Pointer parallax applied to the whole rig, damped. */
function Rig({ reduced }) {
  const { camera, pointer } = useThree();
  useFrame(() => {
    if (reduced) return;
    camera.position.x += (pointer.x * 0.55 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 0.4 + 0.15 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({ reduced }) {
  return (
    <>
      <Rig reduced={reduced} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 5]} intensity={2.1} color="#ffffff" />
      <directionalLight position={[-5, -2, -4]} intensity={1.3} color="#22d3ee" />
      <pointLight position={[0, -3, 3]} intensity={9} distance={12} color="#b8ff2e" />
      <Shield reduced={reduced} />
      <NetworkShell reduced={reduced} />
      <Particles reduced={reduced} />
    </>
  );
}

export default function HeroVisual() {
  const reduced = usePrefersReducedMotion();

  return (
    <Canvas
      className="ms-hero__scene"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.15, 5.4], fov: 42 }}
      frameloop={reduced ? "demand" : "always"}
      aria-hidden="true"
      role="presentation"
    >
      <Suspense fallback={null}>
        <Scene reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}
