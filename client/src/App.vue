<template>
  <div id="app">
    <div v-if="!roomId" class="container">
      <JoinRoom @join="handleJoinRoom" />
    </div>
    <div v-else class="container">
      <PokerSession
        :socket="socket"
        :roomId="roomId"
        :userId="userId"
        :userName="userName"
        @leave-room="handleLeaveRoom"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { io } from 'socket.io-client';
import JoinRoom from './components/JoinRoom.vue';
import PokerSession from './components/PokerSession.vue';
import { useTheme } from './composables/useTheme';

export default {
  name: 'App',
  components: {
    JoinRoom,
    PokerSession
  },
  setup() {
    const socket = ref(null);
    const roomId = ref(null);
    const userId = ref(null);
    const userName = ref(null);
    const { initializeTheme } = useTheme();

    onMounted(() => {
      initializeTheme();

      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
      socket.value = io(serverUrl);

      const savedRoomId = localStorage.getItem('scrumPokerRoomId');
      const savedUserName = localStorage.getItem('scrumPokerUserName');

      if (savedRoomId) {
        handleJoinRoom(savedRoomId, savedUserName);
      }

      socket.value.on('joined-room', (data) => {
        roomId.value = data.roomId;
        userId.value = data.userId;
        userName.value = data.userName;

        localStorage.setItem('scrumPokerRoomId', data.roomId);
        localStorage.setItem('scrumPokerUserName', data.userName);
      });

      socket.value.on('room-full', () => {
        alert('Room is full! Maximum 12 users allowed.');
      });
    });

    const handleJoinRoom = (room, customName = null) => {
      socket.value.emit('join-room', room, customName);
    };

    const handleLeaveRoom = () => {
      // Clear localStorage
      localStorage.removeItem('scrumPokerRoomId');
      localStorage.removeItem('scrumPokerUserName');

      // Reset state
      roomId.value = null;
      userId.value = null;
      userName.value = null;

      // Disconnect and reconnect socket to clean up
      if (socket.value) {
        socket.value.disconnect();
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
        socket.value = io(serverUrl);

        // Re-attach event listeners
        socket.value.on('joined-room', (data) => {
          roomId.value = data.roomId;
          userId.value = data.userId;
          userName.value = data.userName;
          localStorage.setItem('scrumPokerRoomId', data.roomId);
          localStorage.setItem('scrumPokerUserName', data.userName);
        });

        socket.value.on('room-full', () => {
          alert('Room is full! Maximum 12 users allowed.');
        });
      }
    };

    return {
      socket,
      roomId,
      userId,
      userName,
      handleJoinRoom,
      handleLeaveRoom
    };
  }
};
</script>

<style>
:root {
  /* Light Mode Colors */
  --bg-body-start: #667eea;
  --bg-body-end: #764ba2;
  --bg-card: #ffffff;
  --bg-card-secondary: #f8f9fa;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --accent-primary: #667eea;
  --accent-secondary: #764ba2;
  --border-color: #e0e0e0;
  --shadow-color: rgba(0, 0, 0, 0.1);
}

:root.dark-mode {
  /* Dark Mode Colors */
  --bg-body-start: #0f172a;
  --bg-body-end: #1e293b;
  --bg-card: #1e293b;
  --bg-card-secondary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  --accent-primary: #8b5cf6;
  --accent-secondary: #a855f7;
  --border-color: #475569;
  --shadow-color: rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, var(--bg-body-start) 0%, var(--bg-body-end) 100%);
  min-height: 100vh;
}

#app {
  padding: 20px;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
