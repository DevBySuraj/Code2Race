import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { getRandomParagraph } from "./paragraphs.js";
import { getRandomAnyPreset, getRandomCodePreset } from "./codePresets.js";

const app = express();
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", activeRooms: Object.keys(rooms).length });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for local/multiplayer development
    methods: ["GET", "POST"]
  }
});

// Room database in-memory
// Room structure:
// {
//   id: String,
//   text: String,
//   status: 'waiting' | 'countdown' | 'in-progress' | 'finished',
//   countdown: Number,
//   timeLeft: Number,
//   players: Array of { id, name, wpm, accuracy, progress, isReady, isHost, finished, finishRank }
//   timerInterval: Object (NodeJS.Timeout)
// }
const rooms = {};
let matchmakingQueue = [];
let matchmakingTimeout = null;
const DEFAULT_CAR_COLORS = ['#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#eab308'];
const onlinePlayers = {};

function broadcastOnlinePlayers() {
  io.emit("online-players-updated", Object.values(onlinePlayers));
}

// Helper to group matchmaking players and start game
function createMatchmakingRoom(group) {
  const roomId = generateRoomCode();
  const text = getRandomParagraph();
  
  const players = group.map((p, idx) => ({
    id: p.id,
    name: p.name,
    wpm: 0,
    accuracy: 100,
    progress: 0,
    isReady: true, // Auto ready for matchmaking
    isHost: idx === 0,
    finished: false,
    finishRank: null,
    carType: 'f1',
    carColor: DEFAULT_CAR_COLORS[idx % DEFAULT_CAR_COLORS.length]
  }));

  rooms[roomId] = {
    id: roomId,
    text,
    status: "waiting",
    countdown: 5,
    timeLeft: 60,
    players,
    timerInterval: null,
    mode: "normal"
  };

  group.forEach((p) => {
    if (onlinePlayers[p.id]) {
      onlinePlayers[p.id].status = 'racing';
    }
    const socket = io.sockets.sockets.get(p.id);
    if (socket) {
      socket.join(roomId);
      socket.emit("room-joined", {
        room: {
          id: roomId,
          text,
          status: "waiting",
          countdown: 5,
          timeLeft: 60,
          players,
          mode: "normal"
        },
        myId: p.id
      });
    }
  });

  broadcastOnlinePlayers();
  console.log(`Matchmaking: Created Room ${roomId} for players: ${group.map(p => p.name).join(", ")}`);
  
  // Instantly start the countdown for matchmaking!
  startCountdown(roomId);
}

function checkMatchmakingQueue() {
  if (matchmakingQueue.length >= 4) {
    const group = matchmakingQueue.splice(0, 4);
    createMatchmakingRoom(group);
    
    // Clear timeout if queue has < 2 players left
    if (matchmakingQueue.length < 2 && matchmakingTimeout) {
      clearTimeout(matchmakingTimeout);
      matchmakingTimeout = null;
    }
  } else if (matchmakingQueue.length >= 2) {
    // Start a 10s wait timer if not already running
    if (!matchmakingTimeout) {
      matchmakingTimeout = setTimeout(() => {
        if (matchmakingQueue.length >= 2) {
          const group = matchmakingQueue.splice(0, matchmakingQueue.length);
          createMatchmakingRoom(group);
        }
        matchmakingTimeout = null;
      }, 10000);
    }
  }
}

// Generate a random room code (5 chars, uppercase)
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // If code already exists, generate another
  if (rooms[code]) return generateRoomCode();
  return code;
}

// Helper to clean up a room's timer
function clearRoomTimer(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

// Start game timer
function startGameTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.status = "in-progress";
  room.timeLeft = 60; // 60 seconds game duration
  io.to(roomId).emit("game-started", { text: room.text, timeLeft: room.timeLeft });

  room.timerInterval = setInterval(() => {
    const activeRoom = rooms[roomId];
    if (!activeRoom) {
      clearInterval(this);
      return;
    }

    activeRoom.timeLeft -= 1;

    // Check if time is up, or if all players have completed the text
    const allFinished = activeRoom.players.every(p => p.finished);

    if (activeRoom.timeLeft <= 0 || allFinished) {
      clearRoomTimer(activeRoom);
      activeRoom.status = "finished";
      io.to(roomId).emit("game-finished", { players: activeRoom.players });
    } else {
      io.to(roomId).emit("timer-tick", { timeLeft: activeRoom.timeLeft });
    }
  }, 1000);
}

// Start countdown sequence
function startCountdown(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.status = "countdown";
  room.countdown = 5; // 5 seconds countdown
  io.to(roomId).emit("room-updated", {
    id: room.id,
    text: room.text,
    status: room.status,
    countdown: room.countdown,
    timeLeft: room.timeLeft,
    players: room.players,
    mode: room.mode
  });

  room.timerInterval = setInterval(() => {
    const activeRoom = rooms[roomId];
    if (!activeRoom) {
      clearInterval(this);
      return;
    }

    activeRoom.countdown -= 1;
    io.to(roomId).emit("countdown-tick", { countdown: activeRoom.countdown });

    if (activeRoom.countdown <= 0) {
      clearRoomTimer(activeRoom);
      startGameTimer(roomId);
    }
  }, 1000);
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  onlinePlayers[socket.id] = {
    id: socket.id,
    name: `Player_${socket.id.substring(0, 4)}`,
    status: 'idle'
  };
  broadcastOnlinePlayers();

  socket.on("update-name", ({ name }) => {
    if (onlinePlayers[socket.id]) {
      onlinePlayers[socket.id].name = name;
      broadcastOnlinePlayers();
    }
  });

  // Matchmaking handlers
  socket.on("join-matchmaking", ({ playerName }) => {
    // Avoid duplicate queue entry
    if (matchmakingQueue.find((p) => p.id === socket.id)) return;
    
    const name = playerName || `Player_${socket.id.substring(0, 4)}`;
    matchmakingQueue.push({ id: socket.id, name });
    console.log(`Matchmaking: ${name} (${socket.id}) joined queue. Queue size: ${matchmakingQueue.length}`);

    if (onlinePlayers[socket.id]) {
      onlinePlayers[socket.id].status = 'searching';
      onlinePlayers[socket.id].name = name;
      broadcastOnlinePlayers();
    }
    
    checkMatchmakingQueue();
  });

  socket.on("leave-matchmaking", () => {
    const idx = matchmakingQueue.findIndex((p) => p.id === socket.id);
    if (idx !== -1) {
      const removed = matchmakingQueue.splice(idx, 1)[0];
      console.log(`Matchmaking: ${removed.name} left queue. Queue size: ${matchmakingQueue.length}`);
      
      // If queue is empty or has < 2 players, reset timeout
      if (matchmakingQueue.length < 2 && matchmakingTimeout) {
        clearTimeout(matchmakingTimeout);
        matchmakingTimeout = null;
      }
    }

    if (onlinePlayers[socket.id]) {
      onlinePlayers[socket.id].status = 'idle';
      broadcastOnlinePlayers();
    }
  });

  // Room mode settings (Host only)
  socket.on("set-room-mode", ({ roomId, mode, customText, language }) => {
    const code = roomId?.trim().toUpperCase();
    const room = rooms[code];
    if (!room || room.status !== "waiting") return;

    // Verify requesting player is host
    const player = room.players.find((p) => p.id === socket.id);
    if (player && player.isHost) {
      room.mode = mode;

      if (mode === "code") {
        if (customText) {
          room.text = customText;
        } else {
          room.text = getRandomCodePreset(language);
        }
      } else {
        // Reset to normal paragraph if transitioning back
        room.text = getRandomParagraph();
      }

      console.log(`Room ${code} mode set to ${mode}`);

      io.to(code).emit("room-updated", {
        id: room.id,
        text: room.text,
        status: room.status,
        countdown: room.countdown,
        timeLeft: room.timeLeft,
        players: room.players,
        mode: room.mode
      });
    }
  });

  // 1. Create Room
  socket.on("create-room", ({ playerName }) => {
    try {
      const roomId = generateRoomCode();
      const text = getRandomParagraph();

      const newPlayer = {
        id: socket.id,
        name: playerName || `Player_${socket.id.substring(0, 4)}`,
        wpm: 0,
        accuracy: 100,
        progress: 0,
        isReady: true, // Host is ready by default
        isHost: true,
        finished: false,
        finishRank: null,
        carType: 'f1',
        carColor: '#06b6d4'
      };

      rooms[roomId] = {
        id: roomId,
        text,
        status: "waiting",
        countdown: 5,
        timeLeft: 60,
        players: [newPlayer],
        timerInterval: null,
        mode: "normal"
      };

      if (onlinePlayers[socket.id]) {
        onlinePlayers[socket.id].status = 'racing';
        onlinePlayers[socket.id].name = playerName || onlinePlayers[socket.id].name;
        broadcastOnlinePlayers();
      }

      socket.join(roomId);
      console.log(`Room ${roomId} created by ${playerName} (${socket.id})`);

      socket.emit("room-joined", {
        room: {
          id: roomId,
          text: rooms[roomId].text,
          status: rooms[roomId].status,
          countdown: rooms[roomId].countdown,
          timeLeft: rooms[roomId].timeLeft,
          players: rooms[roomId].players,
          mode: rooms[roomId].mode
        },
        myId: socket.id
      });
    } catch (error) {
      console.error("Error creating room:", error);
      socket.emit("error-msg", "Failed to create room.");
    }
  });

  // 2. Join Room
  socket.on("join-room", ({ roomId, playerName }) => {
    try {
      const code = roomId?.trim().toUpperCase();
      const room = rooms[code];

      if (!room) {
        socket.emit("error-msg", "Room not found.");
        return;
      }

      if (room.status !== "waiting") {
        socket.emit("error-msg", "Game has already started.");
        return;
      }

      if (room.players.length >= 10) {
        socket.emit("error-msg", "Room is full.");
        return;
      }

      const newPlayer = {
        id: socket.id,
        name: playerName || `Player_${socket.id.substring(0, 4)}`,
        wpm: 0,
        accuracy: 100,
        progress: 0,
        isReady: false,
        isHost: false,
        finished: false,
        finishRank: null,
        carType: 'f1',
        carColor: DEFAULT_CAR_COLORS[room.players.length % DEFAULT_CAR_COLORS.length]
      };

      room.players.push(newPlayer);

      if (onlinePlayers[socket.id]) {
        onlinePlayers[socket.id].status = 'racing';
        onlinePlayers[socket.id].name = playerName || onlinePlayers[socket.id].name;
        broadcastOnlinePlayers();
      }

      socket.join(code);
      console.log(`Player ${playerName} (${socket.id}) joined room ${code}`);

      socket.emit("room-joined", {
        room: {
          id: room.id,
          text: room.text,
          status: room.status,
          countdown: room.countdown,
          timeLeft: room.timeLeft,
          players: room.players,
          mode: room.mode
        },
        myId: socket.id
      });

      // Broadcast updated room state to all other players in the room
      io.to(code).emit("room-updated", {
        id: room.id,
        text: room.text,
        status: room.status,
        countdown: room.countdown,
        timeLeft: room.timeLeft,
        players: room.players,
        mode: room.mode
      });
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("error-msg", "Failed to join room.");
    }
  });

  // 3. Player Ready
  socket.on("player-ready", ({ roomId, isReady }) => {
    const code = roomId?.trim().toUpperCase();
    const room = rooms[code];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.isReady = isReady;
      console.log(`Player ${player.name} in Room ${code} isReady: ${isReady}`);

      io.to(code).emit("room-updated", {
        id: room.id,
        text: room.text,
        status: room.status,
        countdown: room.countdown,
        timeLeft: room.timeLeft,
        players: room.players,
        mode: room.mode
      });

      // If all players are ready, trigger countdown automatically
      // Wait, is it better to trigger automatically when all ready, or let host click?
      // Since it's a multiplayer competitive game, triggering when all are ready is excellent,
      // but let's check: if there is only 1 player, they are already ready. Let's make it so that if there are at least 2 players and all are ready, or if there's only 1 player and they choose to start (host starts).
      // Let's implement auto-start if all players are ready (must be at least 1 player).
      const allReady = room.players.every((p) => p.isReady);
      if (allReady && room.players.length >= 1) {
        startCountdown(code);
      }
    }
  });

  // 3.5 Customize Car
  socket.on("customize-car", ({ roomId, carType, carColor }) => {
    const code = roomId?.trim().toUpperCase();
    const room = rooms[code];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.carType = carType;
      player.carColor = carColor;
      console.log(`Player ${player.name} in Room ${code} customized car: type=${carType}, color=${carColor}`);

      io.to(code).emit("room-updated", {
        id: room.id,
        text: room.text,
        status: room.status,
        countdown: room.countdown,
        timeLeft: room.timeLeft,
        players: room.players,
        mode: room.mode
      });
    }
  });

  // 4. Force Start (Host only)
  socket.on("force-start-game", ({ roomId }) => {
    const code = roomId?.trim().toUpperCase();
    const room = rooms[code];
    if (!room) return;

    // Verify requesting player is host
    const player = room.players.find((p) => p.id === socket.id);
    if (player && player.isHost && room.status === "waiting") {
      console.log(`Host ${player.name} force-started Room ${code}`);
      startCountdown(code);
    }
  });

  // 5. Progress Update (tick)
  socket.on("progress-update", ({ roomId, wpm, accuracy, progress }) => {
    const code = roomId?.trim().toUpperCase();
    const room = rooms[code];
    if (!room || room.status !== "in-progress") return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.wpm = Math.round(wpm);
      player.accuracy = Math.round(accuracy * 10) / 10;
      player.progress = Math.min(Math.round(progress), 100);

      // Check if finished
      if (player.progress === 100 && !player.finished) {
        player.finished = true;
        // Rank is determined by how many players have already finished + 1
        const finishedCount = room.players.filter((p) => p.finished).length;
        player.finishRank = finishedCount;
        console.log(`Player ${player.name} finished at Rank ${player.finishRank} with ${player.wpm} WPM`);
      }

      // Broadcast changes to everyone in the room
      io.to(code).emit("room-updated", {
        id: room.id,
        text: room.text,
        status: room.status,
        countdown: room.countdown,
        timeLeft: room.timeLeft,
        players: room.players,
        mode: room.mode
      });

      // If everyone is finished now, end game early
      const allFinished = room.players.every((p) => p.finished);
      if (allFinished) {
        clearRoomTimer(room);
        room.status = "finished";
        io.to(code).emit("game-finished", { players: room.players });
      }
    }
  });

  // 5.5 Play Again (Host only)
  socket.on("play-again", ({ roomId }) => {
    const code = roomId?.trim().toUpperCase();
    const room = rooms[code];
    if (!room) return;

    // Verify requesting player is host
    const player = room.players.find((p) => p.id === socket.id);
    if (player && player.isHost) {
      clearRoomTimer(room);
      room.status = "waiting";
      room.text = room.mode === "code" ? getRandomAnyPreset() : getRandomParagraph();
      room.countdown = 5;
      room.timeLeft = 60;

      // Reset all player stats
      room.players.forEach((p) => {
        p.wpm = 0;
        p.accuracy = 100;
        p.progress = 0;
        p.finished = false;
        p.finishRank = null;
        // Host remains ready, others must toggle ready again
        p.isReady = p.isHost;
      });

      console.log(`Room ${code} reset for play-again by host`);
      io.to(code).emit("room-updated", {
        id: room.id,
        text: room.text,
        status: room.status,
        countdown: room.countdown,
        timeLeft: room.timeLeft,
        players: room.players,
        mode: room.mode
      });
    }
  });

  // 6. Chat Message
  socket.on("send-chat-msg", ({ roomId, message }) => {
    const code = roomId?.trim().toUpperCase();
    const room = rooms[code];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      const msgObj = {
        sender: player.name,
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      io.to(code).emit("chat-msg", msgObj);
    }
  });

  // 7. Disconnect and Leave Room Handlers
  const leaveRoom = (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    const playerIndex = room.players.findIndex((p) => p.id === socket.id);
    if (playerIndex !== -1) {
      const removedPlayer = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      socket.leave(roomId);
      console.log(`Player ${removedPlayer.name} left Room ${roomId}`);

      // If room is empty, clean it up
      if (room.players.length === 0) {
        clearRoomTimer(room);
        delete rooms[roomId];
        console.log(`Room ${roomId} deleted (empty)`);
      } else {
        // If the leaving player was host, assign a new host
        if (removedPlayer.isHost) {
          room.players[0].isHost = true;
          room.players[0].isReady = true; // New host ready
          console.log(`Player ${room.players[0].name} is the new host of Room ${roomId}`);
        }

        // If the game is in waiting state and everyone left is ready, auto-start
        if (room.status === "waiting") {
          const allReady = room.players.every((p) => p.isReady);
          if (allReady && room.players.length >= 1) {
            startCountdown(roomId);
          }
        }

        // Broadcast update
        io.to(roomId).emit("room-updated", {
          id: room.id,
          text: room.text,
          status: room.status,
          countdown: room.countdown,
          timeLeft: room.timeLeft,
          players: room.players,
          mode: room.mode
        });
      }

      if (onlinePlayers[socket.id]) {
        onlinePlayers[socket.id].status = 'idle';
        broadcastOnlinePlayers();
      }
    }
  };

  socket.on("leave-room", ({ roomId }) => {
    if (roomId) {
      leaveRoom(roomId.trim().toUpperCase());
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    delete onlinePlayers[socket.id];
    broadcastOnlinePlayers();

    // Check all rooms and remove this player
    Object.keys(rooms).forEach((roomId) => {
      leaveRoom(roomId);
    });
    // Remove from matchmaking queue
    const qIdx = matchmakingQueue.findIndex((p) => p.id === socket.id);
    if (qIdx !== -1) {
      matchmakingQueue.splice(qIdx, 1);
      if (matchmakingQueue.length < 2 && matchmakingTimeout) {
        clearTimeout(matchmakingTimeout);
        matchmakingTimeout = null;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
