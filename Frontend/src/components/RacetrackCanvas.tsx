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

  // Track Dimensions
  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 280;
  const CENTER_X = CANVAS_WIDTH / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  
  // Base ovals radii
  const BASE_RX = 310;
  const BASE_RY = 75;
  const LANE_WIDTH = 7;

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const tick = () => {
      // 1. Clear Canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Draw Grass/Grit Background
      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 3. Draw Asphalt Track Base (from outer to inner)
      const outerLaneOffset = room.players.length * LANE_WIDTH;
      ctx.fillStyle = '#181922'; // Asphalt color
      ctx.beginPath();
      ctx.ellipse(CENTER_X, CENTER_Y, BASE_RX + outerLaneOffset + 8, BASE_RY + outerLaneOffset + 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0a0c10'; // Inner field grass cutout
      ctx.beginPath();
      ctx.ellipse(CENTER_X, CENTER_Y, BASE_RX - 8, BASE_RY - 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Draw Individual Lanes and Markings
      room.players.forEach((_, idx) => {
        const rx = BASE_RX + idx * LANE_WIDTH;
        const ry = BASE_RY + idx * LANE_WIDTH;

        // Lane border line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(CENTER_X, CENTER_Y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 5. Draw Start/Finish Line
      // Standard racing checkered line (located on left center track, angle = Math.PI)
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CENTER_X - (BASE_RX + room.players.length * LANE_WIDTH), CENTER_Y);
      ctx.lineTo(CENTER_X - (BASE_RX - LANE_WIDTH), CENTER_Y);
      ctx.stroke();
      
      // Checkered pattern overlay
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(CENTER_X - (BASE_RX + room.players.length * LANE_WIDTH), CENTER_Y);
      ctx.lineTo(CENTER_X - (BASE_RX - LANE_WIDTH), CENTER_Y);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // 6. Spawn Smoke Particles for Fast Players (WPM > 90)
      room.players.forEach((player, idx) => {
        if (player.wpm > 90 && room.status === 'in-progress' && !player.finished) {
          const rx = BASE_RX + idx * LANE_WIDTH;
          const ry = BASE_RY + idx * LANE_WIDTH;
          
          // Progress parameter goes from 0 (start line) to 1 (finish line)
          const t = player.progress / 100;
          
          // Counter-clockwise layout: start at angle Math.PI, sweep backwards clockwise
          const angle = Math.PI - t * Math.PI * 2;
          
          const carX = CENTER_X + rx * Math.cos(angle);
          const carY = CENTER_Y + ry * Math.sin(angle);
          
          // Tangent angle
          const carAngle = Math.atan2(-ry * Math.cos(angle), rx * Math.sin(angle));

          // Spawn particle at rear of car (approx -12px back)
          const ex = carX - Math.cos(carAngle) * 10;
          const ey = carY - Math.sin(carAngle) * 10;

          if (Math.random() < 0.4) {
            particlesRef.current.push({
              x: ex,
              y: ey,
              vx: -Math.cos(carAngle) * (Math.random() * 1.5 + 0.5) + (Math.random() - 0.5) * 0.3,
              vy: -Math.sin(carAngle) * (Math.random() * 1.5 + 0.5) + (Math.random() - 0.5) * 0.3,
              size: Math.random() * 3 + 2,
              alpha: 0.8
            });
          }
        }
      });

      // 7. Update and Draw Particles
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

      // 8. Draw Player Cars
      room.players.forEach((player, idx) => {
        const isMe = player.id === myId;
        const rx = BASE_RX + idx * LANE_WIDTH;
        const ry = BASE_RY + idx * LANE_WIDTH;

        const t = player.progress / 100;
        const angle = Math.PI - t * Math.PI * 2;
        
        const carX = CENTER_X + rx * Math.cos(angle);
        const carY = CENTER_Y + ry * Math.sin(angle);
        
        // Tangent angle
        const carAngle = Math.atan2(-ry * Math.cos(angle), rx * Math.sin(angle));

        ctx.save();
        ctx.translate(carX, carY);
        ctx.rotate(carAngle);

        // Draw car glow shadow
        ctx.shadowColor = isMe ? '#06b6d4' : '#8b5cf6'; // Cyan vs Purple
        ctx.shadowBlur = isMe ? 10 : 6;

        // Draw car main chassis
        ctx.fillStyle = isMe ? '#06b6d4' : '#8b5cf6';
        ctx.beginPath();
        // Nosecone front, wider engine sidepods rear
        ctx.moveTo(-10, -3);
        ctx.lineTo(-4, -3);
        ctx.lineTo(-4, -5);
        ctx.lineTo(6, -5);
        ctx.lineTo(8, -2);
        ctx.lineTo(8, 2);
        ctx.lineTo(6, 5);
        ctx.lineTo(-4, 5);
        ctx.lineTo(-4, 3);
        ctx.lineTo(-10, 3);
        ctx.closePath();
        ctx.fill();

        // Draw spoiler (rear wing)
        ctx.shadowBlur = 0; // Disable shadow for details
        ctx.fillStyle = '#0c0d12';
        ctx.fillRect(7, -6, 2, 12);
        ctx.fillStyle = isMe ? '#06b6d4' : '#8b5cf6';
        ctx.fillRect(7, -8, 2, 2);
        ctx.fillRect(7, 6, 2, 2);

        // Draw wheels
        ctx.fillStyle = '#020205';
        ctx.fillRect(-7, -6, 4, 2); // Front-left
        ctx.fillRect(-7, 4, 4, 2);  // Front-right
        ctx.fillRect(3, -7, 4, 2);  // Rear-left
        ctx.fillRect(3, 5, 4, 2);   // Rear-right

        // Draw helmet/cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 9. Draw Player Names above their cars (only if not overlapping or for hover clarity, we draw a small name tag)
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = isMe ? '#22d3ee' : '#cbd5e1';
        ctx.textAlign = 'center';
        
        // Offset name tag vertically depending on car position (top vs bottom of loop)
        const textYOffset = Math.sin(angle) > 0 ? 18 : -14;
        const nameLabel = `${player.name.substring(0, 8)} (${player.wpm} WPM)`;
        
        ctx.fillStyle = 'rgba(10, 11, 14, 0.75)';
        const textWidth = ctx.measureText(nameLabel).width;
        ctx.fillRect(carX - textWidth/2 - 4, carY + textYOffset - 8, textWidth + 8, 11);
        
        ctx.fillStyle = isMe ? '#22d3ee' : '#cbd5e1';
        ctx.fillText(nameLabel, carX, carY + textYOffset);
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
        height={CANVAS_HEIGHT}
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
          background: '#0a0c10',
          width: '100%',
          maxWidth: '900px'
        }}
      />
    </div>
  );
};
