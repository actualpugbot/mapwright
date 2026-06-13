import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { BuildPlan } from "@/mapart/buildPlan";
import { forEachBlock } from "@/mapart/buildPlan";
import { blockLookup, textureUrl, type LoadedPalette } from "@/mapart/palette";

/** Above this many cubes we skip the 3D view to stay responsive. */
const MAX_INSTANCES = 220_000;

interface Group {
  blockId: string;
  url: string | null;
  color: readonly [number, number, number];
  positions: { x: number; y: number; z: number }[];
}

function buildGroups(
  plan: BuildPlan,
  palette: LoadedPalette,
  sliceMax: number,
  showSupports: boolean,
): { groups: Group[]; total: number } {
  const lookup = blockLookup(palette);
  const byId = new Map<string, Group>();
  let total = 0;
  forEachBlock(plan, (x, y, z, blockId, isSupport) => {
    if (y > sliceMax) return;
    if (isSupport && !showSupports) return;
    let g = byId.get(blockId);
    if (!g) {
      const info = lookup.get(blockId);
      g = {
        blockId,
        url: info ? textureUrl(palette, info.texture) : null,
        color: info?.rgb ?? ([120, 120, 120] as const),
        positions: [],
      };
      byId.set(blockId, g);
    }
    g.positions.push({ x, y, z });
    total++;
  });
  return { groups: [...byId.values()], total };
}

function InstancedBlocks({
  positions,
  texture,
  color,
  geometry,
}: {
  positions: { x: number; y: number; z: number }[];
  texture: THREE.Texture | null;
  color: readonly [number, number, number];
  geometry: THREE.BoxGeometry;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0,
    });
    if (texture) m.map = texture;
    else m.color = new THREE.Color(color[0] / 255, color[1] / 255, color[2] / 255);
    return m;
  }, [texture, color]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    positions.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [positions]);

  return <instancedMesh ref={ref} args={[geometry, material, positions.length]} castShadow receiveShadow />;
}

function Scene({
  plan,
  palette,
  sliceMax,
  showSupports,
}: {
  plan: BuildPlan;
  palette: LoadedPalette;
  sliceMax: number;
  showSupports: boolean;
}) {
  const { groups } = useMemo(
    () => buildGroups(plan, palette, sliceMax, showSupports),
    [plan, palette, sliceMax, showSupports],
  );
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  // Preload all textures once (suspense). Keep alignment with urls list.
  const urls = useMemo(
    () => Array.from(new Set(groups.map((g) => g.url).filter((u): u is string => !!u))),
    [groups],
  );
  const loaded = useTexture(urls);
  const texByUrl = useMemo(() => {
    const arr = Array.isArray(loaded) ? loaded : [loaded];
    const m = new Map<string, THREE.Texture>();
    urls.forEach((u, i) => {
      const t = arr[i] as THREE.Texture | undefined;
      if (t) {
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        t.colorSpace = THREE.SRGBColorSpace;
        m.set(u, t);
      }
    });
    return m;
  }, [loaded, urls]);

  const cx = -plan.width / 2;
  const cz = -plan.length / 2;

  return (
    <group position={[cx, 0, cz]}>
      {groups.map((g) => (
        <InstancedBlocks
          key={g.blockId}
          positions={g.positions}
          texture={g.url ? texByUrl.get(g.url) ?? null : null}
          color={g.color}
          geometry={geometry}
        />
      ))}
    </group>
  );
}

interface BuildPreview3DProps {
  plan: BuildPlan;
  palette: LoadedPalette;
  sliceMax: number;
  showSupports: boolean;
}

export function BuildPreview3D({ plan, palette, sliceMax, showSupports }: BuildPreview3DProps) {
  const tooBig = plan.visibleCount + plan.supportCount > MAX_INSTANCES;
  const span = Math.max(plan.width, plan.length);

  if (tooBig) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ink-400">
        This build has {(plan.visibleCount + plan.supportCount).toLocaleString()} blocks —
        too many for the live 3D preview. Use a smaller size to preview in 3D (export still
        works at any size).
      </div>
    );
  }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [span * 0.7, span * 0.6, span * 0.9], fov: 45, far: span * 6 + 100 }}
      className="!absolute inset-0"
    >
      <color attach="background" args={["#eef0ed"]} />
      <hemisphereLight intensity={0.75} groundColor="#dde1dc" />
      <directionalLight position={[span, span * 1.4, span * 0.6]} intensity={1.5} castShadow />
      <Suspense fallback={null}>
        <Scene plan={plan} palette={palette} sliceMax={sliceMax} showSupports={showSupports} />
      </Suspense>
      <OrbitControls makeDefault enableDamping target={[0, plan.height / 3, 0]} />
    </Canvas>
  );
}
