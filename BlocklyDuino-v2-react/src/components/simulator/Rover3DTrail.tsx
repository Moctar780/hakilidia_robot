import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial } from 'three';

const ROVER_SCALE = 0.4;
const MAX_TRAIL_POINTS = 200;

export function Rover3DTrail({ trail }: { trail: { x: number; z: number }[] }) {
  const { geometry, material } = useMemo(() => {
    const points = trail.map((p) => [p.x * ROVER_SCALE, 0.02, p.z * ROVER_SCALE]).flat();

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(points, 3));

    const mat = new LineBasicMaterial({
      color: '#7C3AED',
      transparent: true,
      opacity: 0.4,
      linewidth: 2,
    });

    return { geometry: geo, material: mat };
  }, [trail]);

  if (trail.length < 2) return null;

  return (
    <line geometry={geometry} material={material} />
  );
}
