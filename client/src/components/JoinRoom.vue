<template>
  <div class="join-room">
    <div class="card">
      <h1>Scrum Poker</h1>
      <p class="subtitle">Real-time estimation for your team</p>

      <div class="form">
        <div class="input-group">
          <label for="roomId">Room Code</label>
          <input
            id="roomId"
            v-model="roomCode"
            type="text"
            placeholder="Enter room code"
            @keyup.enter="joinRoom"
          />
        </div>

        <div class="input-group">
          <label for="userName">Your Name (optional)</label>
          <input
            id="userName"
            v-model="customName"
            type="text"
            placeholder="Leave blank for random name"
            @keyup.enter="joinRoom"
          />
        </div>

        <button type="button" @click="joinRoom" class="btn-primary">Join Room</button>
        <button type="button" @click="createRoom" class="btn-secondary">Create New Room</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'JoinRoom',
  emits: ['join'],
  setup(props, { emit }) {
    const roomCode = ref('');
    const customName = ref('');

    const joinRoom = () => {
      if (roomCode.value.trim()) {
        emit('join', roomCode.value.trim(), customName.value.trim() || null);
      }
    };

    const createRoom = () => {
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      emit('join', newRoomCode, customName.value.trim() || null);
    };

    return {
      roomCode,
      customName,
      joinRoom,
      createRoom
    };
  }
};
</script>

<style scoped>
.join-room {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px var(--shadow-color);
  max-width: 450px;
  width: 100%;
}

h1 {
  font-size: 2.5rem;
  color: var(--accent-primary);
  text-align: center;
  margin-bottom: 10px;
}

.subtitle {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

input {
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bg-card);
  color: var(--text-primary);
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.btn-primary,
.btn-secondary {
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--shadow-color);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--accent-primary);
  border: 2px solid var(--accent-primary);
}

.btn-secondary:hover {
  background: var(--bg-card-secondary);
  transform: translateY(-2px);
}
</style>
