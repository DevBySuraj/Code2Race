import React from 'react';
import type { Room } from '../types';
import { Award, RefreshCw, Home, Shield } from 'lucide-react';

interface GameLeaderboardProps {
  room: Room;
  myId: string;
  onPlayAgain: () => void;
  onReturnHome: () => void;
}

export const GameLeaderboard: React.FC<GameLeaderboardProps> = ({
  room,
  myId,
  onPlayAgain,
  onReturnHome
}) => {
  // Sort players by whether they finished, then by rank, and finally by progress/WPM
  const rankedPlayers = [...room.players].sort((a, b) => {
    if (a.finished && b.finished) {
      return (a.finishRank || 99) - (b.finishRank || 99);
    }
    if (a.finished) return -1;
    if (b.finished) return 1;
    
    // Both didn't finish, sort by progress
    if (a.progress !== b.progress) return b.progress - a.progress;
    return b.wpm - a.wpm;
  });

  const firstPlace = rankedPlayers[0];
  const secondPlace = rankedPlayers[1];
  const thirdPlace = rankedPlayers[2];

  const me = room.players.find(p => p.id === myId);
  const isHost = me?.isHost || false;

  return (
    <div className="glass-panel" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0 }}>
          <Award size={32} color="var(--secondary)" /> Race Finished!
        </h2>
        <p style={{ margin: '0.25rem 0 0 0' }}>Here are the final standings for Room <strong>{room.id}</strong></p>
      </div>

      {/* Podium Display (if at least 1 player is in room) */}
      {rankedPlayers.length > 0 && (
        <div className="podium-container">
          {/* 2nd Place */}
          {secondPlace && (
            <div className="podium-place place-2">
              <div className="podium-avatar">2</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                {secondPlace.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                {secondPlace.wpm} WPM
              </div>
              <div className="podium-bar">2nd</div>
            </div>
          )}

          {/* 1st Place */}
          {firstPlace && (
            <div className="podium-place place-1">
              <div className="podium-avatar" style={{ border: '2px solid #fbbf24' }}>1</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                {firstPlace.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                {firstPlace.wpm} WPM
              </div>
              <div className="podium-bar">1st</div>
            </div>
          )}

          {/* 3rd Place */}
          {thirdPlace && (
            <div className="podium-place place-3">
              <div className="podium-avatar">3</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                {thirdPlace.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                {thirdPlace.wpm} WPM
              </div>
              <div className="podium-bar">3rd</div>
            </div>
          )}
        </div>
      )}

      {/* Standings Table */}
      <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Leaderboard Standings</h3>
        
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                <th style={{ padding: '0.75rem 1rem' }}>Player</th>
                <th style={{ padding: '0.75rem 1rem' }}>Speed (WPM)</th>
                <th style={{ padding: '0.75rem 1rem' }}>Accuracy</th>
                <th style={{ padding: '0.75rem 1rem' }}>Progress</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rankedPlayers.map((player, index) => {
                const isMe = player.id === myId;
                return (
                  <tr 
                    key={player.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      background: isMe ? 'rgba(6, 182, 212, 0.04)' : 'transparent',
                      color: isMe ? 'var(--secondary)' : 'var(--text-primary)'
                    }}
                  >
                    <td style={{ padding: '1rem', fontWeight: 700 }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: isMe ? 700 : 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {player.name} {isMe && '(You)'}
                      {player.isHost && <Shield size={14} color="#a78bfa" />}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{player.wpm} WPM</td>
                    <td style={{ padding: '1rem' }}>{player.accuracy}%</td>
                    <td style={{ padding: '1rem' }}>{Math.round(player.progress)}%</td>
                    <td style={{ padding: '1rem' }}>
                      {player.finished ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Finished</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>DNF ({Math.round(player.progress)}%)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}>
        <button className="btn btn-outline" onClick={onReturnHome} style={{ minWidth: '150px' }}>
          <Home size={18} /> Main Menu
        </button>

        {isHost ? (
          <button className="btn btn-primary" onClick={onPlayAgain} style={{ minWidth: '180px' }}>
            <RefreshCw size={18} /> Reset and Play Again
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Waiting for the host to restart the game...
          </div>
        )}
      </div>

    </div>
  );
};
