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
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  room,
  myId,
  chatMessages,
  onSendMessage,
  onToggleReady,
  onStartGame,
  onLeaveRoom
}) => {
  const [copied, setCopied] = useState(false);
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

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
                    background: isMe ? 'var(--secondary)' : 'var(--primary)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    {player.isHost ? <Crown size={22} color="#fff" /> : <User size={22} color="#fff" />}
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                      {player.name} {isMe && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(You)</span>}
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
