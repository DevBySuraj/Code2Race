import React, { useEffect, useRef } from 'react';
import type { Room } from '../types';

interface RacetrackCanvasProps {
  room: Room;
  myId: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export const RacetrackCanvas: React.FC<RacetrackCanvasProps> = ({ room, myId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Dimensions
  const CANVAS_WIDTH = 900;
  const LANE_HEIGHT = 46;
  const PADDING_Y = 16;
  
  // Calculate dynamic canvas height based on the number of players
  const canvasHeight = Math.max(120, room.players.length * LANE_HEIGHT + PADDING_Y * 2);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const tick = () => {
      const height = canvas.height;
      const width = canvas.width;

      // 1. Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // 2. Draw Grass/Grit Background
      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(0, 0, width, height);

      // 3. Draw Road Asphalt Base
      // Left 100px is reserved for player name lanes. Road starts at x=100.
      ctx.fillStyle = '#181922'; // Asphalt color
      ctx.fillRect(100, PADDING_Y, width - 140, height - PADDING_Y * 2);

      // 4. Draw Individual Lanes and Divider Stripes
      room.players.forEach((player, idx) => {
        const isMe = player.id === myId;
        const laneY = PADDING_Y + idx * LANE_HEIGHT;

        // Draw Player Name on the left (own track label)
        ctx.font = isMe ? 'bold 12px sans-serif' : '11px sans-serif';
        ctx.fillStyle = isMe ? '#22d3ee' : '#9ca3af';
        ctx.textAlign = 'left';
        
        const nameLabel = `${player.name.substring(0, 10)}${isMe ? ' (You)' : ''}`;
        ctx.fillText(nameLabel, 10, laneY + LANE_HEIGHT / 2 + 4);

        // Draw lane divider dash line (except the last lane)
        if (idx < room.players.length - 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 2;
          ctx.setLineDash([12, 12]);
          ctx.beginPath();
          ctx.moveTo(100, laneY + LANE_HEIGHT);
          ctx.lineTo(width - 40, laneY + LANE_HEIGHT);
          ctx.stroke();
          ctx.setLineDash([]); // Reset dash
        }
      });

      // 5. Draw Start Line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(100, PADDING_Y);
      ctx.lineTo(100, height - PADDING_Y);
      ctx.stroke();

      // 6. Draw Checkered Finish Line (F1 Grid)
      const finishX = width - 40;
      const sqSize = 8;
      for (let y = PADDING_Y; y < height - PADDING_Y; y += sqSize) {
        for (let xOffset = 0; xOffset < 16; xOffset += sqSize) {
          const isBlack = (Math.floor(y / sqSize) + Math.floor(xOffset / sqSize)) % 2 === 0;
          ctx.fillStyle = isBlack ? '#000000' : '#ffffff';
          ctx.fillRect(finishX + xOffset, y, sqSize, sqSize);
        }
      }

      // 7. Spawn Smoke Particles for Fast Players (WPM > 90)
      room.players.forEach((player, idx) => {
        if (player.wpm > 90 && room.status === 'in-progress' && !player.finished) {
          const startX = 120; // Safe car start offset
          const endX = width - 50;  // Finish line stop
          
          const t = player.progress / 100;
          const carX = startX + t * (endX - startX);
          const carY = PADDING_Y + idx * LANE_HEIGHT + LANE_HEIGHT / 2;

          // Spawn particle at rear of car (approx -10px back)
          const ex = carX - 10;
          const ey = carY;

          if (Math.random() < 0.4) {
            particlesRef.current.push({
              x: ex,
              y: ey,
              vx: -(Math.random() * 1.5 + 0.5),
              vy: (Math.random() - 0.5) * 0.3,
              size: Math.random() * 3 + 2,
              alpha: 0.8
            });
          }
        }
      });

      // 8. Update and Draw Particles
      const nextParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
        p.size += 0.15;

        if (p.alpha > 0) {
          ctx.fillStyle = `rgba(156, 163, 175, ${p.alpha})`; // Slate-400 smoke
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          nextParticles.push(p);
        }
      });
      particlesRef.current = nextParticles;

      // 9. Draw Player Cars
      room.players.forEach((player, idx) => {
        const isMe = player.id === myId;
        const startX = 120; // Safe start offset
        const endX = width - 50;  // Finish line position
        
        const t = player.progress / 100;
        const carX = startX + t * (endX - startX);
        const carY = PADDING_Y + idx * LANE_HEIGHT + LANE_HEIGHT / 2;

        ctx.save();
        ctx.translate(carX, carY);
        // Straight road means carAngle = 0

        // Draw car glow shadow
        ctx.shadowColor = isMe ? '#06b6d4' : '#8b5cf6'; // Cyan vs Purple
        ctx.shadowBlur = isMe ? 10 : 6;

        // Draw car main chassis (facing right)
        ctx.fillStyle = isMe ? '#06b6d4' : '#8b5cf6';
        ctx.beginPath();
        // Nosecone front (right), wider engine sidepods rear (left)
        ctx.moveTo(10, -3);
        ctx.lineTo(4, -3);
        ctx.lineTo(4, -5);
        ctx.lineTo(-6, -5);
        ctx.lineTo(-8, -2);
        ctx.lineTo(-8, 2);
        ctx.lineTo(-6, 5);
        ctx.lineTo(4, 5);
        ctx.lineTo(4, 3);
        ctx.lineTo(10, 3);
        ctx.closePath();
        ctx.fill();

        // Draw spoiler (rear wing)
        ctx.shadowBlur = 0; // Disable shadow for details
        ctx.fillStyle = '#0c0d12';
        ctx.fillRect(-9, -6, 2, 12);
        ctx.fillStyle = isMe ? '#06b6d4' : '#8b5cf6';
        ctx.fillRect(-9, -8, 2, 2);
        ctx.fillRect(-9, 6, 2, 2);

        // Draw wheels
        ctx.fillStyle = '#020205';
        ctx.fillRect(-5, -7, 4, 2); // Rear-left
        ctx.fillRect(-5, 5, 4, 2);  // Rear-right
        ctx.fillRect(3, -6, 4, 2);  // Front-left
        ctx.fillRect(3, 4, 4, 2);   // Front-right

        // Draw helmet/cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 10. Draw Player speed tag above their cars
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = isMe ? '#22d3ee' : '#cbd5e1';
        ctx.textAlign = 'center';
        
        const speedLabel = `${player.wpm} WPM`;
        ctx.fillText(speedLabel, carX, carY - 11);
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animId);
  }, [room.players, room.status, myId]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={canvasHeight}
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
          background: '#0a0c10',
          width: '100%',
          maxWidth: '900px',
          transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)' // Smooth height transition
        }}
      />
    </div>
  );
};
