import { useRef, useEffect } from 'react';
import type { AiSprite } from '../../constants';

const GRID_SIZE = 40;
const ROBOT_SIZE = 24;

type Point = { x: number; y: number };

export function RobotSimulator({ sprite, trail, size }: { sprite: AiSprite; trail: Point[]; size?: number }) {
  const viewSize = size ?? 400;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewSize * dpr;
    canvas.height = viewSize * dpr;
    ctx.scale(dpr, dpr);

    const cx = viewSize / 2;
    const cy = viewSize / 2;

    // Fond
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, viewSize, viewSize);

    // Grille
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= viewSize; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, viewSize); ctx.stroke();
    }
    for (let y = 0; y <= viewSize; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(viewSize, y); ctx.stroke();
    }

    // Axes centraux
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, viewSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(viewSize, cy); ctx.stroke();
    ctx.setLineDash([]);

    // Labels axe
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let x = -4; x <= 4; x++) {
      const px = cx + x * GRID_SIZE;
      ctx.fillText(String(x), px, cy - 4);
    }
    ctx.textAlign = 'right';
    for (let y = -4; y <= 4; y++) {
      if (y === 0) continue;
      const py = cy - y * GRID_SIZE;
      ctx.fillText(String(y), cx - 4, py + 3);
    }

    // Traînée (trail)
    if (trail.length > 1) {
      ctx.strokeStyle = '#7C3AED';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      const scale = GRID_SIZE;
      ctx.moveTo(cx + trail[0].x * scale, cy - trail[0].y * scale);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(cx + trail[i].x * scale, cy - trail[i].y * scale);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Robot
    const angle = ((sprite.direction - 90) * Math.PI) / 180;
    const rx = cx + sprite.x * GRID_SIZE;
    const ry = cy - sprite.y * GRID_SIZE;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle);

    // Ombre
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Corps du robot
    ctx.fillStyle = '#0F766E';
    const hw = ROBOT_SIZE / 2;
    const rh = ROBOT_SIZE * 1.2;
    ctx.beginPath();
    ctx.moveTo(-hw + 4, -rh / 2);
    ctx.lineTo(hw - 4, -rh / 2);
    ctx.quadraticCurveTo(hw, -rh / 2, hw, -rh / 2 + 4);
    ctx.lineTo(hw, rh / 2 - 4);
    ctx.quadraticCurveTo(hw, rh / 2, hw - 4, rh / 2);
    ctx.lineTo(-hw + 4, rh / 2);
    ctx.quadraticCurveTo(-hw, rh / 2, -hw, rh / 2 - 4);
    ctx.lineTo(-hw, -rh / 2 + 4);
    ctx.quadraticCurveTo(-hw, -rh / 2, -hw + 4, -rh / 2);
    ctx.closePath();
    ctx.fill();

    // Tête (capteur avant)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#14B8A6';
    ctx.fillRect(-4, -ROBOT_SIZE / 2 - 6, 8, 8);

    // Yeux (LEDs)
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(-5, -4, 2.5, 0, Math.PI * 2);
    ctx.arc(5, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Infos position
    ctx.fillStyle = '#475569';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`x: ${sprite.x}  y: ${sprite.y}  dir: ${sprite.direction}°`, 8, viewSize - 8);

  }, [sprite, trail, viewSize]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border"
      style={{ borderColor: 'var(--color-border)', aspectRatio: '1' }}
    />
  );
}
