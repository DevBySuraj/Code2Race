import React, { useState, useEffect, useRef } from 'react';
import type { Room } from '../types';
import { Timer } from 'lucide-react';
import { VirtualKeyboard } from './VirtualKeyboard';
import { RacetrackCanvas } from './RacetrackCanvas';

interface GameInterfaceProps {
  room: Room;
  myId: string;
  onProgressUpdate: (wpm: number, accuracy: number, progress: number) => void;
  onLeaveRoom: () => void;
}

export const GameInterface: React.FC<GameInterfaceProps> = ({
  room,
  myId,
  onProgressUpdate,
  onLeaveRoom
}) => {
  const [typedText, setTypedText] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Typing state
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Local Stats
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const inputRef = useRef<HTMLInputElement>(null);
  const promptText = room.text;

  // Auto-focus input when the game starts or when clicking the typing container
  useEffect(() => {
    if (room.status === 'in-progress') {
      inputRef.current?.focus();
      setStartTime(Date.now());
    }
  }, [room.status]);

  // Calculate live stats
  useEffect(() => {
    if (room.status !== 'in-progress' || !startTime) return;

    const timeElapsedSec = (Date.now() - startTime) / 1000;
    if (timeElapsedSec <= 0.5) return;

    // Count correct characters typed so far
    let correctCount = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === promptText[i]) {
        correctCount++;
      }
    }

    // Standard WPM calculation: (correct characters / 5) / minutes
    const words = correctCount / 5;
    const minutes = timeElapsedSec / 60;
    const calculatedWpm = Math.round(words / minutes);

    // Accuracy calculation: (correct keystrokes / total keystrokes) * 100
    const calculatedAccuracy = typedText.length > 0 
      ? Math.round((correctCount / typedText.length) * 100) 
      : 100;

    setWpm(calculatedWpm);
    setAccuracy(calculatedAccuracy);

    // Progress percentage based on characters typed
    const progressPercent = (typedText.length / promptText.length) * 100;

    // Send status update to the server
    onProgressUpdate(calculatedWpm, calculatedAccuracy, progressPercent);

  }, [typedText, startTime, promptText.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (room.status !== 'in-progress') return;

    const val = e.target.value;
    
    // Prevent typing beyond the prompt length
    if (val.length > promptText.length) return;

    // Hardcore mode check: Typo resets progress to 0
    if (room.mode === 'hardcore') {
      if (val.length > 0 && val[val.length - 1] !== promptText[val.length - 1]) {
        setTypedText('');
        setCurrentIndex(0);
        return;
      }
    }

    setTypedText(val);
    setCurrentIndex(val.length);
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
      
      {/* 1. Track representation for racing */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Race Track</span>
          <span className="badge badge-ready" style={{ textTransform: 'none', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--secondary)' }}>
            Status: RACING
          </span>
        </h3>
        <RacetrackCanvas room={room} myId={myId} />
      </div>

      {/* 2. Main Typing Board */}
      <div className="glass-panel" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <Timer size={18} />
              <span>Time Left: <strong style={{ color: room.timeLeft <= 10 ? 'var(--error)' : 'var(--text-primary)' }}>{room.timeLeft}s</strong></span>
            </div>
          </div>
          <button className="btn btn-outline" onClick={onLeaveRoom} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            Leave Race
          </button>
        </div>

        {/* Hidden Input to capture typing */}
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleInputChange}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1
          }}
          disabled={room.status !== 'in-progress' || currentIndex === promptText.length}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {/* Typing prompt rendering */}
        <div 
          className="typing-prompt-container"
          onClick={handleContainerClick}
          style={{ cursor: 'text' }}
        >
          {promptText.split('').map((char, index) => {
            const classes = ['char'];
            
            if (index < currentIndex) {
              if (typedText[index] === char) {
                classes.push('char-correct');
              } else {
                classes.push('char-incorrect');
              }
            }
            if (index === currentIndex) {
              classes.push('char-current');
            }

            // Blind mode obfuscation
            const displayChar = (room.mode === 'blind' && index > currentIndex)
              ? (char === ' ' ? ' ' : '•')
              : char;

            return (
              <span key={index} className={classes.join(' ')}>
                {displayChar}
              </span>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {currentIndex === promptText.length ? (
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Finished! Waiting for others to complete...</span>
          ) : (
            <span>Start typing the text above. Use Backspace to correct mistakes.</span>
          )}
        </div>
      </div>

      {/* 3. Live personal stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-val">{wpm}</div>
          <div className="stat-lbl">Words Per Minute</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{accuracy}%</div>
          <div className="stat-lbl">Accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{currentIndex} / {promptText.length}</div>
          <div className="stat-lbl">Characters Typed</div>
        </div>
      </div>

      {/* 4. Keyboard Overlay */}
      <div style={{ marginTop: '0.5rem', width: '100%' }}>
        <VirtualKeyboard />
      </div>

    </div>
  );
};
