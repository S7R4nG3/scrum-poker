# Scrum Poker App

A real-time Vue.js application for scrum poker sessions, allowing up to 12 users to connect anonymously and vote on story points.

## Features

- Real-time multiplayer using WebSockets
- Up to 12 users per room
- Randomized names with customization option
- Persistent sessions in browser
- Voting with card values: 1, 3, 5, 8
- Auto-reveal when all users have voted
- Majority vote calculation (shows all tied values if applicable)
- Start new rounds after voting completes

## Tech Stack

- **Frontend**: Vue 3 + Vite
- **Backend**: Node.js + Express + Socket.io
- **Real-time**: WebSockets (Socket.io)
- **Storage**: localStorage for session persistence

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

**OR**

- Docker and Docker Compose

### Running with Docker (Recommended)

The easiest way to run the application is using Docker Compose:

```bash
docker-compose up --build
```

This will:
- Build and start both the server and client containers
- Server will be available on http://localhost:3000
- Client will be available on http://localhost:5173

To stop the containers:
```bash
docker-compose down
```

### Installation & Running (Without Docker)

1. **Start the server:**
   ```bash
   cd server
   npm start
   ```
   Server will run on http://localhost:3000

2. **Start the client (in a new terminal):**
   ```bash
   cd client
   npm run dev
   ```
   Client will run on http://localhost:5173

3. **Open your browser** and navigate to http://localhost:5173

### Usage

1. **Create a room**: Click "Create New Room" to generate a unique room code
2. **Join a room**: Enter a room code and optionally provide a custom name
3. **Share the room code** with other participants (up to 12 total)
4. **Vote**: Click on a card (1, 3, 5, or 8) to cast your vote
5. **Results**: Once all users vote, results are automatically revealed
6. **New round**: Click "Start New Round" to begin voting again

### Features in Detail

- **Anonymous names**: Users are assigned random names like "Swift Panda" or "Brave Eagle"
- **Name customization**: Click on your name in the header to edit it
- **Session persistence**: Rooms are saved in localStorage and persist across page refreshes
- **Real-time updates**: See when other users join, leave, or cast votes
- **Tie handling**: If multiple values tie for majority, all are displayed

## Project Structure

```
scrum-poker/
├── client/               # Vue.js frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── JoinRoom.vue
│   │   │   └── PokerSession.vue
│   │   ├── App.vue
│   │   └── main.js
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env
│   └── package.json
├── server/               # Node.js backend
│   ├── index.js
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Development

- Frontend dev server includes hot reload
- Server needs manual restart on changes (consider using nodemon for development)

## Future Enhancements

- Add more card values (Fibonacci sequence, T-shirt sizes)
- Room persistence on server
- User avatars
- Vote history and analytics
- Moderator role with additional controls
