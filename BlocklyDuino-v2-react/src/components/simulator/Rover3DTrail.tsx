import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, Line } from 'three';

const ROVER_SCALE = 0.4;

export function Rover3DTrail({ trail }: { trail: { x: number; z: number }[] }) {
  const lineObj = useMemo(() => {
    if (trail.length < 2) return null;
    const points = trail.map((p) => [p.x * ROVER_SCALE, 0.02, p.z * ROVER_SCALE]).flat();

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));

    const material = new LineBasicMaterial({
      color: '#7C3AED',
      transparent: true,
      opacity: 0.4,
      linewidth: 2,
    });

    return new Line(geometry, material);
  }, [trail]);

  if (!lineObj) return null;

  return <primitive object={lineObj} />;
}
