import React, { useState, useRef, useEffect } from 'react';
import type { Room, ChatMessage } from '../types';
import { Copy, Check, Play, LogOut, Send, User, Crown } from 'lucide-react';

interface GameLobbyProps {
  room: Room;
  myId: string;
  chatMessages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  onToggleReady: (ready: boolean) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onSetRoomMode?: (mode: 'normal' | 'hardcore' | 'blind' | 'code', customText?: string, language?: string) => void;
  onCustomizeCar?: (carType: 'f1' | 'hover' | 'muscle' | 'scooter', carColor: string) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  room,
  myId,
  chatMessages,
  onSendMessage,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
  onSetRoomMode,
  onCustomizeCar
}) => {
  const [copied, setCopied] = useState(false);
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Code Mode States
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [customCode, setCustomCode] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setCodeLanguage(lang);
    onSetRoomMode?.('code', undefined, lang);
  };

  const handleCustomCodeChange = (text: string) => {
    setCustomCode(text);
    onSetRoomMode?.('code', text, undefined);
  };

  const me = room.players.find(p => p.id === myId);
  const isHost = me?.isHost || false;
  const isReady = me?.isReady || false;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    onSendMessage(messageText);
    setMessageText('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', marginTop: '1.5rem' }}>
      
      {/* Left panel: Room info & Player List */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Lobby Room</h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Waiting for players to join and get ready...</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={onLeaveRoom}>
              <LogOut size={16} /> Leave Room
            </button>
          </div>
        </div>

        {/* Room Code Showcase */}
        <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Room Code</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)', letterSpacing: '0.05em', lineHeight: 1 }}>{room.id}</div>
          </div>
          <button className="btn btn-secondary" onClick={copyRoomCode} style={{ height: '42px', padding: '0 1rem' }}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        {/* Game Mode Settings */}
        <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Game Mode</span>
            {isHost ? (
              <div style={{ marginTop: '0.25rem' }}>
                <select
                  value={room.mode || 'normal'}
                  onChange={(e) => onSetRoomMode?.(e.target.value as any)}
                  style={{
                    background: 'var(--bg-dark)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="normal">Normal (Free Typing)</option>
                  <option value="hardcore">Hardcore (Typo resets to 0)</option>
                  <option value="blind">Blind (Letters are hidden)</option>
                  <option value="code">Code (Programming Syntax)</option>
                </select>
              </div>
            ) : (
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>
                {room.mode === 'hardcore' 
                  ? 'Hardcore Mode' 
                  : room.mode === 'blind' 
                  ? 'Blind Mode' 
                  : room.mode === 'code'
                  ? 'Code Racing Mode'
                  : 'Normal Mode'}
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '50%', textAlign: 'right' }}>
            {room.mode === 'hardcore' 
              ? 'Warning: Any typo resets your progress to 0%!' 
              : room.mode === 'blind' 
              ? 'Blind: All letters ahead of the cursor are hidden!' 
              : room.mode === 'code'
              ? 'Code: Race typing raw code syntax, braces, & tabs!'
              : 'Normal: Free-typing. Backspace to correct errors.'}
          </div>
        </div>

        {/* Code Racing Mode Settings */}
        {room.mode === 'code' && (
          <div style={{ 
            background: 'rgba(0,0,0,0.25)', 
            border: '1px solid var(--border-color)', 
            padding: '1rem', 
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Language Preset</span>
                {isHost ? (
                  <div style={{ marginTop: '0.25rem' }}>
                    <select
                      value={codeLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      style={{
                        background: 'var(--bg-dark)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="css">CSS</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--secondary)', marginTop: '0.25rem' }}>
                    Preset Active
                  </div>
                )}
              </div>

              {isHost && (
                <div>
                  <button 
                    className={`btn ${showCustomInput ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    {showCustomInput ? 'Use Preset Snippet' : 'Paste Custom Code'}
                  </button>
                </div>
              )}
            </div>

            {/* Custom Paste Text Area */}
            {isHost && showCustomInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Paste Custom Code Snippet</span>
                <textarea
                  value={customCode}
                  onChange={(e) => handleCustomCodeChange(e.target.value)}
                  placeholder="Paste your code block here..."
                  rows={6}
                  style={{
                    background: 'var(--bg-dark)',
                    color: '#a6e3a1',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Note: Line indents and syntax symbols will be preserved. Make sure it isn't too long!
                </div>
              </div>
            )}

            {/* Code Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Active Code Block Preview</span>
              <pre style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '0.75rem',
                borderRadius: '8px',
                margin: 0,
                fontSize: '0.85rem',
                color: '#89b4fa',
                fontFamily: 'monospace',
                overflowX: 'auto',
                whiteSpace: 'pre'
              }}>
                {room.text}
              </pre>
            </div>

          </div>
        )}

        {/* Customize Your Ride */}
        <div style={{ 
          background: 'rgba(0,0,0,0.3)', 
          border: '1px solid var(--primary)', 
          boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)',
          padding: '1.25rem', 
          borderRadius: '12px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🏎️ Customize Your Ride
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
            {/* Vehicle Type */}
            <div>
              <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Vehicle Class
              </label>
              <select
                value={me?.carType || 'f1'}
                onChange={(e) => {
                  const type = e.target.value as any;
                  onCustomizeCar?.(type, me?.carColor || '#06b6d4');
                }}
                style={{
                  background: 'var(--bg-dark)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <option value="f1">🏁 Sleek F1 Race Car</option>
                <option value="hover">🛸 Cyberpunk Hover-car</option>
                <option value="muscle">🔥 Retro Muscle Car</option>
                <option value="scooter">🛵 Agile Scooter</option>
              </select>
            </div>

            {/* Neon Paint Color */}
            <div>
              <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Neon Paint Color
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {['#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#eab308'].map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onCustomizeCar?.(me?.carType || 'f1', color);
                    }}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: color,
                      border: me?.carColor === color ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: me?.carColor === color 
                        ? `0 0 10px ${color}` 
                        : '0 2px 4px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title={
                      color === '#06b6d4' ? 'Neon Cyan' :
                      color === '#a855f7' ? 'Neon Purple' :
                      color === '#10b981' ? 'Neon Green' :
                      color === '#f59e0b' ? 'Neon Orange' :
                      color === '#ef4444' ? 'Neon Red' :
                      color === '#ec4899' ? 'Neon Pink' :
                      'Neon Yellow'
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Player Grid */}
        <div>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Players ({room.players.length}/10)</span>
            {room.players.length === 1 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Invite friends to race!</span>
            )}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {room.players.map((player) => {
              const isMe = player.id === myId;
              return (
                <div 
                  key={player.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '1rem', 
                    background: isMe ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    borderColor: isMe ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    background: `linear-gradient(135deg, ${player.carColor || '#06b6d4'} 0%, var(--bg-dark) 100%)`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: `0 4px 14px ${(player.carColor || '#06b6d4')}80`,
                    border: `1.5px solid ${player.carColor || '#06b6d4'}`,
                    transition: 'all 0.3s ease'
                  }}>
                    {player.isHost ? <Crown size={22} color="#fff" /> : <User size={22} color="#fff" />}
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                      {player.name} {isMe && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: player.carColor || '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>
                      {player.carType === 'f1' ? '🏎️ F1 Racer' :
                       player.carType === 'hover' ? '🛸 Hover-car' :
                       player.carType === 'muscle' ? '🔥 Muscle' :
                       '🛵 Scooter'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {player.isHost && <span className="badge badge-host">Host</span>}
                    {player.isReady ? (
                      <span className="badge badge-ready">Ready</span>
                    ) : (
                      <span className="badge badge-waiting">Waiting</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lobby Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          {!isHost ? (
            <button 
              className={`btn ${isReady ? 'btn-outline' : 'btn-primary'}`}
              onClick={() => onToggleReady(!isReady)}
              style={{ minWidth: '160px' }}
            >
              {isReady ? 'Cancel Ready' : 'I am Ready!'}
            </button>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={onStartGame}
              style={{ minWidth: '180px' }}
              disabled={room.players.length < 1} // Host can practice solo if they want!
            >
              <Play size={18} fill="#fff" /> Force Start Game
            </button>
          )}
        </div>
      </div>

      {/* Right panel: Lobby Chat */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
        <h3 style={{ margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Lobby Chat</h3>
        
        <div className="chat-container">
          <div className="chat-messages">
            {chatMessages.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 'auto', fontSize: '0.9rem' }}>
                No messages yet. Say hello!
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} className="chat-msg">
                  <div className="chat-msg-header">
                    <span className="chat-msg-sender">{msg.sender}</span>
                    <span className="chat-msg-time">{msg.timestamp}</span>
                  </div>
                  <div className="chat-msg-text">{msg.text}</div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          
          <form className="chat-input-area" onSubmit={handleSendChat}>
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <button type="submit" className="chat-send-btn">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
      
    </div>
  );
};
