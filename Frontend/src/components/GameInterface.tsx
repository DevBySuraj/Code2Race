import React, { useState, useEffect, useRef } from 'react';
import type { Room } from '../types';
import { Timer, Volume2, VolumeX } from 'lucide-react';
import { VirtualKeyboard } from './VirtualKeyboard';
import { RacetrackCanvas } from './RacetrackCanvas';
import { audioManager } from '../utils/audioManager';

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

  // Audio settings state
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [soundSettings, setSoundSettings] = useState(audioManager.getSettings());

  const handleSettingChange = (newSettings: Partial<typeof soundSettings>) => {
    audioManager.saveSettings(newSettings);
    setSoundSettings(audioManager.getSettings());
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const promptText = room.text;

  // Auto-focus input when the game starts or when clicking the typing container
  // Also start and stop the engine sound loop
  useEffect(() => {
    if (room.status === 'in-progress') {
      inputRef.current?.focus();
      setStartTime(Date.now());
      audioManager.startEngine();
    }
    
    return () => {
      audioManager.stopEngine();
    };
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

    // Dynamic pitch-shifted engine sound
    audioManager.setEngineWPM(calculatedWpm);

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
        audioManager.playTireScreech();
        onProgressUpdate(0, 0, 0); // immediately notify server of reset
        return;
      }
    }

    // Play click sound
    audioManager.playClick();

    // Normal/Blind mode typo sound check
    if (room.mode !== 'hardcore' && val.length > typedText.length) {
      const isTypo = val[val.length - 1] !== promptText[val.length - 1];
      if (isTypo) {
        audioManager.playTireScreech();
      }
    }

    // Check if finished
    if (val.length === promptText.length && typedText.length < promptText.length) {
      audioManager.stopEngine();
      audioManager.playFinishSiren();
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-outline" 
              onClick={() => handleSettingChange({ muted: !soundSettings.muted })} 
              style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={soundSettings.muted ? "Unmute All Sounds" : "Mute All Sounds"}
            >
              {soundSettings.muted ? <VolumeX size={16} color="var(--error)" /> : <Volume2 size={16} />}
            </button>
            <button 
              className={`btn ${showSoundSettings ? 'btn-secondary' : 'btn-outline'}`} 
              onClick={() => setShowSoundSettings(!showSoundSettings)} 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Volume2 size={16} /> Sound Options
            </button>
            <button className="btn btn-outline" onClick={onLeaveRoom} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Leave Race
            </button>
          </div>
        </div>

        {/* Sound Settings Tray */}
        {showSoundSettings && (
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Audio Configuration</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              
              {/* Mute All Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Mute All</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <input 
                    type="checkbox"
                    checked={soundSettings.muted}
                    onChange={(e) => handleSettingChange({ muted: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ color: soundSettings.muted ? 'var(--error)' : 'var(--text-primary)' }}>
                    {soundSettings.muted ? 'Muted' : 'Unmuted'}
                  </span>
                </div>
              </div>

              {/* Click Switch Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Keyboard Clicks</label>
                <select 
                  value={soundSettings.clickType}
                  onChange={(e) => handleSettingChange({ clickType: e.target.value as any })}
                  style={{
                    background: 'var(--bg-dark)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '0.3rem',
                    borderRadius: '4px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  disabled={soundSettings.muted}
                >
                  <option value="off">Muted</option>
                  <option value="blue">Mechanical Blue</option>
                  <option value="linear">Silent Linear</option>
                  <option value="typewriter">Retro Typewriter</option>
                </select>
              </div>

              {/* Engine Audio Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>F1 Engine Sound</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <input 
                    type="checkbox"
                    checked={soundSettings.engineEnabled}
                    onChange={(e) => handleSettingChange({ engineEnabled: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    disabled={soundSettings.muted}
                  />
                  <span>Enable engine loops</span>
                </div>
              </div>

              {/* Master Volume Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Volume</span>
                  <span>{Math.round(soundSettings.volume * 100)}%</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={soundSettings.volume}
                  onChange={(e) => handleSettingChange({ volume: parseFloat(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--secondary)' }}
                  disabled={soundSettings.muted}
                />
              </div>

            </div>
          </div>
        )}

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
