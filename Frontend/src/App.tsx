import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Room, ChatMessage } from './types';
import { GameLobby } from './components/GameLobby';
import { GameInterface } from './components/GameInterface';
import { GameLeaderboard } from './components/GameLeaderboard';
import { Keyboard, ArrowRight, Play, AlertCircle, Sparkles } from 'lucide-react';
import './App.css';

// Initialize socket client
const SOCKET_URL = 'http://localhost:3001';
let socket: Socket;

function App() {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('keyracer_username') || '';
  });
  const [roomIdInput, setRoomIdInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    socket = io(SOCKET_URL, {
      autoConnect: true,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server, socket ID:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('room-joined', ({ room: joinedRoom, myId: clientId }) => {
      setRoom(joinedRoom);
      setMyId(clientId);
      setJoined(true);
      setChatMessages([]);
      setError(null);
    });

    socket.on('room-updated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('countdown-tick', ({ countdown }) => {
      setRoom(prev => {
        if (!prev) return null;
        return { ...prev, countdown };
      });
    });

    socket.on('game-started', ({ text, timeLeft }) => {
      setRoom(prev => {
        if (!prev) return null;
        return { ...prev, status: 'in-progress', text, timeLeft };
      });
    });

    socket.on('timer-tick', ({ timeLeft }) => {
      setRoom(prev => {
        if (!prev) return null;
        return { ...prev, timeLeft };
      });
    });

    socket.on('game-finished', ({ players }) => {
      setRoom(prev => {
        if (!prev) return null;
        return { ...prev, status: 'finished', players };
      });
    });

    socket.on('chat-msg', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('error-msg', (msg: string) => {
      setError(msg);
      // Auto dismiss error
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room-joined');
      socket.off('room-updated');
      socket.off('countdown-tick');
      socket.off('game-started');
      socket.off('timer-tick');
      socket.off('game-finished');
      socket.off('chat-msg');
      socket.off('error-msg');
    };
  }, []);

  // Save name changes
  const handleNameChange = (val: string) => {
    setPlayerName(val);
    localStorage.setItem('keyracer_username', val);
  };

  const handleCreateRoom = () => {
    const name = playerName.trim() || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
    if (!playerName.trim()) {
      handleNameChange(name);
    }
    socket.emit('create-room', { playerName: name });
  };

  const handleJoinRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!roomIdInput.trim()) {
      setError('Please enter a room code');
      return;
    }
    const name = playerName.trim() || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
    if (!playerName.trim()) {
      handleNameChange(name);
    }
    socket.emit('join-room', { 
      roomId: roomIdInput.trim().toUpperCase(), 
      playerName: name 
    });
  };

  const handleSendMessage = (message: string) => {
    if (!room) return;
    socket.emit('send-chat-msg', { roomId: room.id, message });
  };

  const handleToggleReady = (isReady: boolean) => {
    if (!room) return;
    socket.emit('player-ready', { roomId: room.id, isReady });
  };

  const handleStartGame = () => {
    if (!room) return;
    socket.emit('force-start-game', { roomId: room.id });
  };

  const handlePlayAgain = () => {
    if (!room) return;
    socket.emit('play-again', { roomId: room.id });
  };

  const handleLeaveRoom = () => {
    if (!room) return;
    socket.emit('leave-room', { roomId: room.id });
    setRoom(null);
    setJoined(false);
  };

  return (
    <>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', 
            padding: '0.6rem', 
            borderRadius: '12px',
            boxShadow: '0 4px 12px var(--primary-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Keyboard size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0, textAlign: 'left' }}>KeyRacer</h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Multiplayer Typing Speed Battle</span>
          </div>
        </div>

        {/* Server status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: isConnected ? 'var(--success)' : 'var(--error)',
            boxShadow: isConnected ? '0 0 8px var(--success)' : '0 0 8px var(--error)',
            display: 'inline-block'
          }} />
          <span>{isConnected ? 'Server Online' : 'Connecting...'}</span>
        </div>
      </header>

      {/* Error alert toast */}
      {error && (
        <div className="glass-panel" style={{ 
          background: 'rgba(239, 68, 68, 0.15)', 
          borderColor: 'rgba(239, 68, 68, 0.4)', 
          padding: '1rem', 
          borderRadius: '12px',
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          color: '#fca5a5',
          marginBottom: '1.5rem'
        }}>
          <AlertCircle size={20} />
          <span style={{ flexGrow: 1 }}>{error}</span>
          <button 
            onClick={() => setError(null)} 
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {!joined ? (
          /* Home Screen: Join or Create Room */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
            
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={32} color="var(--secondary)" />
                <h2 style={{ margin: 0 }}>Join the Race</h2>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Type against others in real-time, test your typing speed!</p>
              </div>

              {/* Username field */}
              <div className="input-group">
                <label htmlFor="username">Racer Username</label>
                <input 
                  id="username"
                  type="text" 
                  placeholder="Enter your nickname..."
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                {/* Create Room Button */}
                <button className="btn btn-primary" onClick={handleCreateRoom} style={{ width: '100%' }}>
                  <Play size={18} fill="#fff" /> Create New Race Room
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span style={{ height: '1px', background: 'var(--border-color)', flexGrow: 1 }} />
                  <span>OR JOIN EXISTING</span>
                  <span style={{ height: '1px', background: 'var(--border-color)', flexGrow: 1 }} />
                </div>

                {/* Join Room Form */}
                <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="ENTER ROOM CODE..."
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    style={{ flexGrow: 1, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}
                  />
                  <button type="submit" className="btn btn-secondary" style={{ padding: '0.75rem 1rem' }}>
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            </div>

          </div>
        ) : (
          /* Game Screens */
          room && (
            <>
              {room.status === 'waiting' && (
                <GameLobby
                  room={room}
                  myId={myId || ''}
                  chatMessages={chatMessages}
                  onSendMessage={handleSendMessage}
                  onToggleReady={handleToggleReady}
                  onStartGame={handleStartGame}
                  onLeaveRoom={handleLeaveRoom}
                />
              )}

              {room.status === 'countdown' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '2rem' }}>
                  {/* Big Glowing Countdown Number */}
                  <div style={{
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '4px solid var(--primary)',
                    boxShadow: '0 0 30px var(--primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '6rem',
                    fontWeight: 800,
                    color: 'var(--primary)',
                    animation: 'pulse 1s infinite'
                  }}>
                    {room.countdown}
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <h2>PREPARE TO RACE!</h2>
                    <p style={{ fontSize: '1.1rem' }}>Get your fingers on the keyboard and look at the text prompt...</p>
                  </div>
                </div>
              )}

              {room.status === 'in-progress' && (
                <GameInterface
                  room={room}
                  myId={myId || ''}
                  onProgressUpdate={(wpm, acc, prog) => {
                    socket.emit('progress-update', { roomId: room.id, wpm, accuracy: acc, progress: prog });
                  }}
                  onLeaveRoom={handleLeaveRoom}
                />
              )}

              {room.status === 'finished' && (
                <GameLeaderboard
                  room={room}
                  myId={myId || ''}
                  onPlayAgain={handlePlayAgain}
                  onReturnHome={handleLeaveRoom}
                />
              )}
            </>
          )
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <span>&copy; 2026 KeyRacer. Built for speed typing battles.</span>
        <span>Supports up to 10 players side-by-side.</span>
      </footer>
    </>
  );
}

export default App;
