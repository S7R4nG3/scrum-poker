<template>
  <div class="poker-session">
    <div class="header">
      <div class="room-info">
        <h1>Scrum Poker</h1>
        <p class="room-code">
          Room: <strong>{{ roomId }}</strong>
          <button type="button" @click="leaveRoom" class="btn-leave-room" title="Leave room">
            ✕
          </button>
        </p>
        <p class="round-number">Round {{ roundNumber }}</p>
      </div>

      <div class="user-name-editor">
        <input
          v-if="editingName"
          v-model="newName"
          @keyup.enter="saveName"
          @blur="saveName"
          class="name-input"
          ref="nameInput"
          placeholder="Enter your name"
        />
        <div v-else class="current-name" @click="startEditName">
          {{ userName }} <span class="edit-icon">✏️</span>
        </div>
      </div>

      <div class="header-actions">
        <button type="button" @click="toggleScrumMaster" class="btn-scrum-master" :class="{ active: isScrumMaster }" title="Toggle Scrum Master role">
          <span v-if="isScrumMaster">👑 Scrum Master</span>
          <span v-else>👑 Be Scrum Master</span>
        </button>
        <button type="button" @click="startNewRound" class="btn-new-round-header" title="Start new round">
          🔄 New Round
        </button>
        <button type="button" @click="toggleTheme" class="theme-toggle" title="Toggle dark mode">
          <span v-if="isDarkMode">☀️</span>
          <span v-else>🌙</span>
        </button>
      </div>
    </div>

    <div class="main-content">
      <div class="users-panel">
        <h2>Participants ({{ users.length }}/12)</h2>
        <div class="user-list">
          <div
            v-for="user in users"
            :key="user.id"
            class="user-item"
            :class="{ 'is-me': user.id === userId, 'has-voted': votedUserIds.includes(user.id), 'is-scrum-master': user.isScrumMaster }"
          >
            <span class="user-name">
              {{ user.name }}
              <span v-if="user.isScrumMaster" class="sm-badge" title="Scrum Master">👑</span>
            </span>
            <span v-if="votedUserIds.includes(user.id) && !revealed && !isScrumMaster" class="voted-badge">✓</span>
            <span v-if="(revealed || isScrumMaster) && votes[user.id]" class="vote-badge">
              {{ votes[user.id].vote }}
            </span>
          </div>
        </div>
      </div>

      <div class="voting-area">
        <div v-if="!revealed && !isScrumMaster" class="cards-container">
          <h2>Cast Your Vote</h2>
          <div class="cards">
            <div
              v-for="value in cardValues"
              :key="value"
              class="card"
              :class="{ selected: selectedVote === value }"
              @click="castVote(value)"
            >
              {{ value }}
            </div>
          </div>
          <p class="vote-count">{{ votedUserIds.length }} / {{ nonScrumMasterCount }} voted</p>
        </div>

        <div v-if="!revealed && isScrumMaster" class="scrum-master-waiting">
          <h2>👑 Scrum Master View</h2>
          <p class="sm-message">Waiting for team members to vote...</p>
          <p class="vote-count">{{ votedUserIds.length }} / {{ nonScrumMasterCount }} voted</p>
          <div v-if="votedUserIds.length > 0" class="sm-votes-preview">
            <h3>Current Votes</h3>
            <div class="votes-grid">
              <div
                v-for="(voteData, userId) in votes"
                :key="userId"
                class="vote-item"
              >
                <span class="voter-name">{{ voteData.userName }}</span>
                <span class="vote-value">{{ voteData.vote }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="revealed" class="results">
          <h2>Results</h2>
          <div class="majority">
            <p class="label">Majority Vote{{ majority.length > 1 ? 's' : '' }}:</p>
            <div class="majority-values">
              <span v-for="val in majority" :key="val" class="majority-badge">
                {{ val }}
              </span>
            </div>
          </div>

          <div class="all-votes">
            <h3>All Votes</h3>
            <div class="votes-grid">
              <div
                v-for="(voteData, userId) in votes"
                :key="userId"
                class="vote-item"
              >
                <span class="voter-name">{{ voteData.userName }}</span>
                <span class="vote-value">{{ voteData.vote }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useTheme } from '../composables/useTheme';

export default {
  name: 'PokerSession',
  props: {
    socket: {
      type: Object,
      required: true
    },
    roomId: {
      type: String,
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: true
    }
  },
  emits: ['leave-room'],
  setup(props, { emit }) {
    const cardValues = [1, 3, 5, 8];
    const users = ref([]);
    const votes = ref({});
    const votedUserIds = ref([]);
    const selectedVote = ref(null);
    const revealed = ref(false);
    const majority = ref([]);
    const roundNumber = ref(1);
    const editingName = ref(false);
    const newName = ref('');
    const nameInput = ref(null);
    const { isDarkMode, toggleTheme } = useTheme();

    const isScrumMaster = computed(() => {
      const currentUser = users.value.find(u => u.id === props.userId);
      return currentUser?.isScrumMaster || false;
    });

    const nonScrumMasterCount = computed(() => {
      return users.value.filter(u => !u.isScrumMaster).length;
    });

    onMounted(() => {
      props.socket.on('room-state', (state) => {
        users.value = state.users;
        votedUserIds.value = state.votedUserIds;
        revealed.value = state.revealed;
        roundNumber.value = state.roundNumber;
        if (state.revealed) {
          votes.value = state.votes;
        }
      });

      props.socket.on('user-joined', (data) => {
        users.value = data.users;
      });

      props.socket.on('user-left', (data) => {
        users.value = data.users;
      });

      props.socket.on('user-updated', (data) => {
        users.value = data.users;
        if (data.votedUserIds !== undefined) {
          votedUserIds.value = data.votedUserIds;
        }
      });

      props.socket.on('vote-cast', (data) => {
        votedUserIds.value = data.votedUserIds;
      });

      props.socket.on('scrum-master-votes-update', (data) => {
        // Only update votes if user is scrum master and votes aren't revealed yet
        if (isScrumMaster.value && !revealed.value) {
          votes.value = data.votes;
        }
      });

      props.socket.on('votes-revealed', (data) => {
        revealed.value = true;
        votes.value = data.votes;
        majority.value = data.majority;
      });

      props.socket.on('new-round', (data) => {
        roundNumber.value = data.roundNumber;
        revealed.value = false;
        votes.value = {};
        votedUserIds.value = [];
        selectedVote.value = null;
      });
    });

    const castVote = (value) => {
      selectedVote.value = value;
      props.socket.emit('cast-vote', {
        roomId: props.roomId,
        vote: value
      });
    };

    const startNewRound = () => {
      props.socket.emit('start-new-round', props.roomId);
    };

    const startEditName = () => {
      editingName.value = true;
      newName.value = props.userName;
      nextTick(() => {
        nameInput.value?.focus();
      });
    };

    const saveName = () => {
      if (newName.value.trim() && newName.value.trim() !== props.userName) {
        props.socket.emit('update-name', {
          roomId: props.roomId,
          newName: newName.value.trim()
        });
        localStorage.setItem('scrumPokerUserName', newName.value.trim());
      }
      editingName.value = false;
    };

    const leaveRoom = () => {
      if (confirm('Are you sure you want to leave this room?')) {
        emit('leave-room');
      }
    };

    const toggleScrumMaster = () => {
      props.socket.emit('toggle-scrum-master', {
        roomId: props.roomId
      });
    };

    return {
      cardValues,
      users,
      votes,
      votedUserIds,
      selectedVote,
      revealed,
      majority,
      roundNumber,
      editingName,
      newName,
      nameInput,
      isDarkMode,
      isScrumMaster,
      nonScrumMasterCount,
      toggleTheme,
      castVote,
      startNewRound,
      startEditName,
      saveName,
      leaveRoom,
      toggleScrumMaster
    };
  }
};
</script>

<style scoped>
.poker-session {
  color: var(--text-primary);
}

.header {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px var(--shadow-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-info h1 {
  color: var(--accent-primary);
  margin-bottom: 8px;
  font-size: 2rem;
}

.room-code {
  color: var(--text-secondary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.room-code strong {
  color: var(--accent-primary);
  font-size: 1.2rem;
}

.btn-leave-room {
  padding: 4px 8px;
  background: transparent;
  color: var(--text-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
  line-height: 1;
}

.btn-leave-room:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.round-number {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.user-name-editor {
  display: flex;
  align-items: center;
  gap: 10px;
}

.current-name {
  padding: 10px 16px;
  background: var(--bg-card-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 600;
  color: var(--text-primary);
}

.current-name:hover {
  background: var(--border-color);
}

.edit-icon {
  margin-left: 8px;
  font-size: 0.9rem;
}

.name-input {
  padding: 10px 16px;
  border: 2px solid var(--accent-primary);
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  background: var(--bg-card);
  color: var(--text-primary);
}

.name-input:focus {
  outline: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-new-round-header {
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-new-round-header:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.btn-scrum-master {
  padding: 10px 16px;
  background: var(--bg-card-secondary);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-scrum-master:hover {
  transform: translateY(-2px);
  background: var(--border-color);
}

.btn-scrum-master.active {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  border-color: #fbbf24;
}

.theme-toggle {
  padding: 10px 16px;
  background: var(--bg-card-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
}

.theme-toggle:hover {
  background: var(--border-color);
  transform: scale(1.05);
}

.main-content {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
}

.users-panel {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px var(--shadow-color);
  height: fit-content;
}

.users-panel h2 {
  margin-bottom: 16px;
  color: var(--accent-primary);
  font-size: 1.2rem;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-item {
  padding: 12px;
  background: var(--bg-card-secondary);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.user-item.is-me {
  background: var(--bg-card-secondary);
  border: 2px solid var(--accent-primary);
}

:root.dark-mode .user-item.is-me {
  background: rgba(139, 92, 246, 0.2);
}

.user-item.has-voted {
  background: #e8f5e9;
}

:root.dark-mode .user-item.has-voted {
  background: rgba(139, 195, 74, 0.2);
}

.user-item.is-scrum-master {
  background: rgba(251, 191, 36, 0.15);
  border: 2px solid #fbbf24;
}

.user-name {
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.sm-badge {
  font-size: 0.9rem;
}

.voted-badge {
  color: #4caf50;
  font-weight: bold;
}

.vote-badge {
  background: var(--accent-primary);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
}

.voting-area {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.cards-container h2 {
  text-align: center;
  color: var(--accent-primary);
  margin-bottom: 32px;
  font-size: 1.8rem;
}

.cards {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 32px;
}

.card {
  width: 120px;
  height: 160px;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.card:hover {
  transform: translateY(-10px) scale(1.05);
  box-shadow: 0 12px 24px var(--shadow-color);
}

.card.selected {
  transform: translateY(-20px) scale(1.1);
  box-shadow: 0 16px 32px var(--shadow-color);
}

.vote-count {
  text-align: center;
  font-size: 1.2rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.scrum-master-waiting {
  text-align: center;
}

.scrum-master-waiting h2 {
  color: #fbbf24;
  margin-bottom: 16px;
  font-size: 1.8rem;
}

.sm-message {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 24px;
}

.sm-votes-preview {
  margin-top: 32px;
  text-align: left;
}

.sm-votes-preview h3 {
  color: var(--accent-primary);
  margin-bottom: 16px;
  text-align: center;
}

.results h2 {
  text-align: center;
  color: var(--accent-primary);
  margin-bottom: 32px;
  font-size: 1.8rem;
}

.majority {
  text-align: center;
  margin-bottom: 40px;
}

.majority .label {
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.majority-values {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.majority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  border-radius: 16px;
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
  box-shadow: 0 8px 20px var(--shadow-color);
}

.all-votes {
  margin-bottom: 32px;
}

.all-votes h3 {
  margin-bottom: 16px;
  color: var(--accent-primary);
}

.votes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.vote-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-card-secondary);
  border-radius: 8px;
}

.voter-name {
  font-weight: 500;
  color: var(--text-primary);
}

.vote-value {
  background: var(--accent-primary);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .cards {
    flex-wrap: wrap;
  }

  .card {
    width: 100px;
    height: 140px;
    font-size: 2.5rem;
  }
}
</style>
