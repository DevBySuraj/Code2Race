export interface Player {
  id: string;
  name: string;
  wpm: number;
  accuracy: number;
  progress: number; // percentage (0 to 100)
  isReady: boolean;
  isHost: boolean;
  finished: boolean;
  finishRank: number | null;
}

export interface Room {
  id: string;
  text: string;
  status: 'waiting' | 'countdown' | 'in-progress' | 'finished';
  countdown: number;
  timeLeft: number;
  players: Player[];
  mode: 'normal' | 'hardcore' | 'blind' | 'code';
}

export interface ChatMessage {
  sender: string;
  text: string;
  timestamp: string;
}
