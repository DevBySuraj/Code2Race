import React, { useState, useEffect } from 'react';

// Finger color codes for optimal touch typing
const FINGER_COLORS: Record<string, string> = {
  'pinky-l': 'rgba(239, 68, 68, 0.4)',  // Soft Red
  'ring-l': 'rgba(249, 115, 22, 0.4)',  // Soft Orange
  'middle-l': 'rgba(234, 179, 8, 0.4)', // Soft Yellow
  'index-l': 'rgba(16, 185, 129, 0.4)',  // Soft Green
  'index-r': 'rgba(16, 185, 129, 0.4)',  // Soft Green
  'middle-r': 'rgba(234, 179, 8, 0.4)', // Soft Yellow
  'ring-r': 'rgba(249, 115, 22, 0.4)',  // Soft Orange
  'pinky-r': 'rgba(239, 68, 68, 0.4)',  // Soft Red
  'thumb': 'rgba(6, 182, 212, 0.4)',    // Soft Cyan
};

interface KeyConfig {
  key: string;
  label: string;
  finger: string;
  width?: string;
}

const ROWS: KeyConfig[][] = [
  [
    { key: '1', label: '1', finger: 'pinky-l' },
    { key: '2', label: '2', finger: 'ring-l' },
    { key: '3', label: '3', finger: 'middle-l' },
    { key: '4', label: '4', finger: 'index-l' },
    { key: '5', label: '5', finger: 'index-l' },
    { key: '6', label: '6', finger: 'index-r' },
    { key: '7', label: '7', finger: 'index-r' },
    { key: '8', label: '8', finger: 'middle-r' },
    { key: '9', label: '9', finger: 'ring-r' },
    { key: '0', label: '0', finger: 'pinky-r' },
    { key: 'BACKSPACE', label: 'Backspace', finger: 'pinky-r', width: '85px' }
  ],
  [
    { key: 'TAB', label: 'Tab', finger: 'pinky-l', width: '55px' },
    { key: 'Q', label: 'Q', finger: 'pinky-l' },
    { key: 'W', label: 'W', finger: 'ring-l' },
    { key: 'E', label: 'E', finger: 'middle-l' },
    { key: 'R', label: 'R', finger: 'index-l' },
    { key: 'T', label: 'T', finger: 'index-l' },
    { key: 'Y', label: 'Y', finger: 'index-r' },
    { key: 'U', label: 'U', finger: 'index-r' },
    { key: 'I', label: 'I', finger: 'middle-r' },
    { key: 'O', label: 'O', finger: 'ring-r' },
    { key: 'P', label: 'P', finger: 'pinky-r' }
  ],
  [
    { key: 'CAPSLOCK', label: 'Caps', finger: 'pinky-l', width: '65px' },
    { key: 'A', label: 'A', finger: 'pinky-l' },
    { key: 'S', label: 'S', finger: 'ring-l' },
    { key: 'D', label: 'D', finger: 'middle-l' },
    { key: 'F', label: 'F', finger: 'index-l' },
    { key: 'G', label: 'G', finger: 'index-l' },
    { key: 'H', label: 'H', finger: 'index-r' },
    { key: 'J', label: 'J', finger: 'index-r' },
    { key: 'K', label: 'K', finger: 'middle-r' },
    { key: 'L', label: 'L', finger: 'ring-r' },
    { key: 'ENTER', label: 'Enter', finger: 'pinky-r', width: '85px' }
  ],
  [
    { key: 'SHIFT', label: 'Shift', finger: 'pinky-l', width: '95px' },
    { key: 'Z', label: 'Z', finger: 'pinky-l' },
    { key: 'X', label: 'X', finger: 'ring-l' },
    { key: 'C', label: 'C', finger: 'middle-l' },
    { key: 'V', label: 'V', finger: 'index-l' },
    { key: 'B', label: 'B', finger: 'index-l' },
    { key: 'N', label: 'N', finger: 'index-r' },
    { key: 'M', label: 'M', finger: 'index-r' },
    { key: ' ', label: 'Space', finger: 'thumb', width: '280px' }
  ]
];

export const VirtualKeyboard: React.FC = () => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let k = e.key.toUpperCase();
      // Handle special naming mappings
      if (k === ' ') k = ' '; // Map literal space character
      
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.add(k);
        return next;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let k = e.key.toUpperCase();
      if (k === ' ') k = ' ';
      
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '1.25rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.4rem', 
        alignItems: 'center', 
        background: 'rgba(10, 11, 14, 0.4)',
        borderColor: 'rgba(255, 255, 255, 0.04)',
        boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 4px 24px rgba(0,0,0,0.5)',
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}
    >
      {ROWS.map((row, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', gap: '0.4rem', width: '100%', justifyContent: 'center' }}>
          {row.map((cfg) => {
            const isPressed = pressedKeys.has(cfg.key);
            const fingerColor = FINGER_COLORS[cfg.finger] || 'rgba(255, 255, 255, 0.1)';

            return (
              <div
                key={cfg.key}
                style={{
                  width: cfg.width || '45px',
                  height: '42px',
                  borderRadius: '6px',
                  background: isPressed 
                    ? 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)' 
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isPressed
                    ? '1px solid var(--primary)'
                    : `1px solid ${fingerColor}`,
                  boxShadow: isPressed 
                    ? '0 0 12px var(--primary-glow)' 
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: isPressed ? 700 : 500,
                  color: isPressed ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.1s ease',
                  userSelect: 'none',
                  boxSizing: 'border-box'
                }}
              >
                {cfg.label}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
