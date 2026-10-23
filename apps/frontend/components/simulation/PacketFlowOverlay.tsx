'use client';

import { useEffect, useRef, useCallback } from 'react';

interface EdgeData {
  id: string;
  source: { x: number; y: number };
  target: { x: number; y: number };
  sourcePosition?: string;
  targetPosition?: string;
  qps: number;
  errorRate: number;
}

interface PacketFlowOverlayProps {
  edges: EdgeData[];
  isRunning: boolean;
  qps: number;
}

interface Particle {
  x: number; y: number;
  progress: number;
  speed: number;
  edgeId: string;
  alive: boolean;
  size: number;
  opacity: number;
  color: string;
}

function getEdgePath(
  sx: number, sy: number, tx: number, ty: number,
  sp?: string, tp?: string
): (t: number) => { x: number; y: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  const cx1 = sp === 'left' || sp === 'right' ? sx + dx * 0.5 : sx;
  const cy1 = sp === 'top' || sp === 'bottom' ? sy + dy * 0.5 : sy + dy * 0.25;
  const cx2 = tp === 'left' || tp === 'right' ? tx - dx * 0.5 : tx;
  const cy2 = tp === 'top' || tp === 'bottom' ? ty - dy * 0.5 : ty - dy * 0.25;
  return (t: number) => {
    const u = 1 - t;
    const x = u * u * u * sx + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * tx;
    const y = u * u * u * sy + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * ty;
    return { x, y };
  };
}

export function PacketFlowOverlay({ edges, isRunning, qps }: PacketFlowOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match parent
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isRunning) {
      particlesRef.current = [];
      return;
    }

    const activeEdges = edges.filter((e) => e.qps > 0);
    if (activeEdges.length === 0) return;

    // Spawn new particles based on QPS
    const now = Date.now();
    const spawnInterval = Math.max(16, 500 - qps / 20);
    if (now - lastSpawnRef.current > spawnInterval && activeEdges.length > 0) {
      const edge = activeEdges[Math.floor(Math.random() * activeEdges.length)];
      const edgeQps = edge.qps;
      const spawnCount = Math.max(1, Math.min(5, Math.floor(edgeQps / 200)));

      for (let i = 0; i < spawnCount; i++) {
        const pathFn = getEdgePath(
          edge.source.x, edge.source.y,
          edge.target.x, edge.target.y,
          edge.sourcePosition, edge.targetPosition
        );
        const start = pathFn(0);
        particlesRef.current.push({
          x: start.x,
          y: start.y,
          progress: 0,
          speed: 0.005 + Math.random() * 0.015,
          edgeId: edge.id,
          alive: true,
          size: 2 + Math.random() * 3,
          opacity: 0.4 + Math.random() * 0.6,
          color: edge.errorRate > 50 ? '#ef4444' : edge.errorRate > 10 ? '#f59e0b' : '#FF6600',
        });
      }
      lastSpawnRef.current = now;
    }

    // Cap total particles
    if (particlesRef.current.length > 300) {
      particlesRef.current = particlesRef.current.slice(-300);
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current
      .map((p) => {
        const edge = activeEdges.find((e) => e.id === p.edgeId);
        if (!edge) return { ...p, alive: false };

        const newProgress = p.progress + p.speed;
        if (newProgress > 1) return { ...p, alive: false };

        const pathFn = getEdgePath(
          edge.source.x, edge.source.y,
          edge.target.x, edge.target.y,
          edge.sourcePosition, edge.targetPosition
        );
        const pos = pathFn(newProgress);
        return { ...p, x: pos.x, y: pos.y, progress: newProgress, color: edge.errorRate > 50 ? '#ef4444' : edge.errorRate > 10 ? '#f59e0b' : '#FF6600' };
      })
      .filter((p) => p.alive);

    // Draw all particles
    for (const p of particlesRef.current) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();

      // Glow effect
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity * 0.15;
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [edges, isRunning, qps]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
