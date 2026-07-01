import { useMemo } from 'react';

const GRID_SIZE = 2; // 2 unités par case
const GRID_EXTENT = 8; // -8 à +8 cases

export function Rover3DScene() {
  const gridLines = useMemo(() => {
    const lines: { x: number; z: number; isAxis: boolean }[] = [];
    for (let i = -GRID_EXTENT; i <= GRID_EXTENT; i++) {
      lines.push({ x: i * GRID_SIZE, z: -GRID_EXTENT * GRID_SIZE, isAxis: i === 0 });
      lines.push({ x: i * GRID_SIZE, z: GRID_EXTENT * GRID_SIZE, isAxis: i === 0 });
      lines.push({ x: -GRID_EXTENT * GRID_SIZE, z: i * GRID_SIZE, isAxis: i === 0 });
      lines.push({ x: GRID_EXTENT * GRID_SIZE, z: i * GRID_SIZE, isAxis: i === 0 });
    }
    return lines;
  }, []);

  return (
    <group>
      {/* Sol visuel (la physique a son propre collider dans PhysicsManager.createGround) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[GRID_EXTENT * 2 * GRID_SIZE + 4, GRID_EXTENT * 2 * GRID_SIZE + 4]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>

      {/* Grille */}
      {gridLines.map((line, i) => (
        <mesh key={i} position={[line.x, 0, line.z]}>
          {line.isAxis ? (
            <boxGeometry args={[0.05, 0.02, GRID_EXTENT * 2 * GRID_SIZE + 2]} />
          ) : (
            <boxGeometry args={[0.03, 0.01, GRID_EXTENT * 2 * GRID_SIZE + 2]} />
          )}
          <meshStandardMaterial color={line.isAxis ? '#94a3b8' : '#e2e8f0'} />
        </mesh>
      ))}

      {/* Grille axe Z */}
      {gridLines.map((line, i) => (
        <mesh key={`z-${i}`} position={[line.z, 0, line.x]} rotation={[0, Math.PI / 2, 0]}>
          {line.isAxis ? (
            <boxGeometry args={[0.05, 0.02, GRID_EXTENT * 2 * GRID_SIZE + 2]} />
          ) : (
            <boxGeometry args={[0.03, 0.01, GRID_EXTENT * 2 * GRID_SIZE + 2]} />
          )}
          <meshStandardMaterial color={line.isAxis ? '#94a3b8' : '#e2e8f0'} />
        </mesh>
      ))}

      {/* Marqueurs d'axes */}
      <mesh position={[GRID_EXTENT * GRID_SIZE + 1, 0.05, 0]}>
        <boxGeometry args={[0.5, 0.1, 0.1]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 0.05, GRID_EXTENT * GRID_SIZE + 1]}>
        <boxGeometry args={[0.1, 0.1, 0.5]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>

      {/* Limites du monde */}
      <mesh position={[0, 0.5, -GRID_EXTENT * GRID_SIZE - 1]}>
        <boxGeometry args={[GRID_EXTENT * 2 * GRID_SIZE + 2, 1, 0.3]} />
        <meshStandardMaterial color="#fca5a5" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, 0.5, GRID_EXTENT * GRID_SIZE + 1]}>
        <boxGeometry args={[GRID_EXTENT * 2 * GRID_SIZE + 2, 1, 0.3]} />
        <meshStandardMaterial color="#fca5a5" transparent opacity={0.3} />
      </mesh>
      <mesh position={[-GRID_EXTENT * GRID_SIZE - 1, 0.5, 0]}>
        <boxGeometry args={[0.3, 1, GRID_EXTENT * 2 * GRID_SIZE + 2]} />
        <meshStandardMaterial color="#fca5a5" transparent opacity={0.3} />
      </mesh>
      <mesh position={[GRID_EXTENT * GRID_SIZE + 1, 0.5, 0]}>
        <boxGeometry args={[0.3, 1, GRID_EXTENT * 2 * GRID_SIZE + 2]} />
        <meshStandardMaterial color="#fca5a5" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
