const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? "https://scrum.strangeindustries.cloud"
      : "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store for rooms and their states
const rooms = new Map();

// Random name generator
const adjectives = ['Swift', 'Brave', 'Clever', 'Eager', 'Fierce', 'Gentle', 'Happy', 'Jolly', 'Kind', 'Lively', 'Mighty', 'Noble', 'Quick', 'Silent', 'Wise'];
const animals = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Fox', 'Wolf', 'Bear', 'Lion', 'Hawk', 'Owl', 'Shark', 'Dragon'];

function generateRandomName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj} ${animal}`;
}

function getRoomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      votes: new Map(),
      revealed: false,
      roundNumber: 1
    });
  }
  return rooms.get(roomId);
}

function calculateMajority(votes) {
  const counts = {};
  votes.forEach(vote => {
    counts[vote] = (counts[vote] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(counts));
  const winners = Object.keys(counts).filter(vote => counts[vote] === maxCount);

  return winners.map(Number).sort((a, b) => a - b);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, customName) => {
    const room = getRoomState(roomId);

    // Check if room is full
    if (room.users.size >= 12) {
      socket.emit('room-full');
      return;
    }

    socket.join(roomId);

    const userName = customName || generateRandomName();
    room.users.set(socket.id, {
      id: socket.id,
      name: userName,
      isScrumMaster: false
    });

    socket.emit('joined-room', {
      userId: socket.id,
      userName: userName,
      roomId: roomId
    });

    // Send current room state to the joining user
    const roomState = {
      users: Array.from(room.users.values()),
      votes: room.revealed ? Object.fromEntries(room.votes) : {},
      revealed: room.revealed,
      roundNumber: room.roundNumber,
      votedUserIds: Array.from(room.votes.keys())
    };

    socket.emit('room-state', roomState);

    // Notify all users in the room
    io.to(roomId).emit('user-joined', {
      user: room.users.get(socket.id),
      users: Array.from(room.users.values())
    });
  });

  socket.on('update-name', ({ roomId, newName }) => {
    const room = getRoomState(roomId);
    if (room.users.has(socket.id)) {
      room.users.get(socket.id).name = newName;
      io.to(roomId).emit('user-updated', {
        users: Array.from(room.users.values())
      });
    }
  });

  socket.on('toggle-scrum-master', ({ roomId }) => {
    const room = getRoomState(roomId);
    if (room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      user.isScrumMaster = !user.isScrumMaster;

      // If becoming a scrum master, remove their vote
      if (user.isScrumMaster) {
        room.votes.delete(socket.id);
      }

      io.to(roomId).emit('user-updated', {
        users: Array.from(room.users.values()),
        votedUserIds: Array.from(room.votes.keys())
      });
    }
  });

  socket.on('cast-vote', ({ roomId, vote }) => {
    const room = getRoomState(roomId);

    if (!room.users.has(socket.id)) {
      return;
    }

    // Don't allow scrum masters to vote
    if (room.users.get(socket.id).isScrumMaster) {
      return;
    }

    room.votes.set(socket.id, vote);

    // Notify all users that someone voted (but don't reveal the vote)
    io.to(roomId).emit('vote-cast', {
      userId: socket.id,
      votedUserIds: Array.from(room.votes.keys()),
      totalUsers: room.users.size
    });

    // Send current votes to scrum masters only
    const scrumMasters = Array.from(room.users.entries())
      .filter(([id, user]) => user.isScrumMaster)
      .map(([id]) => id);

    const votesWithNames = {};
    room.votes.forEach((vote, userId) => {
      votesWithNames[userId] = {
        vote: vote,
        userName: room.users.get(userId).name
      };
    });

    scrumMasters.forEach(smId => {
      io.to(smId).emit('scrum-master-votes-update', {
        votes: votesWithNames
      });
    });

    // Check if all non-scrum-master users have voted
    const nonScrumMasters = Array.from(room.users.values()).filter(u => !u.isScrumMaster);
    if (room.votes.size === nonScrumMasters.length) {
      room.revealed = true;

      const voteValues = Array.from(room.votes.values());
      const majority = calculateMajority(voteValues);

      const votesWithNames = {};
      room.votes.forEach((vote, userId) => {
        votesWithNames[userId] = {
          vote: vote,
          userName: room.users.get(userId).name
        };
      });

      io.to(roomId).emit('votes-revealed', {
        votes: votesWithNames,
        majority: majority
      });
    }
  });

  socket.on('start-new-round', (roomId) => {
    const room = getRoomState(roomId);
    room.votes.clear();
    room.revealed = false;
    room.roundNumber++;

    io.to(roomId).emit('new-round', {
      roundNumber: room.roundNumber
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Find which room the user was in
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        room.votes.delete(socket.id);

        io.to(roomId).emit('user-left', {
          userId: socket.id,
          users: Array.from(room.users.values())
        });

        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
