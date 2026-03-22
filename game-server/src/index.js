require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('colyseus');
const { WebSocketTransport } = require('@colyseus/ws-transport');
const { monitor } = require('@colyseus/monitor');
const { OpenWorldRoom } = require('./rooms/OpenWorldRoom');

const PORT = parseInt(process.env.PORT || '2567', 10);

// ── Express app (health + monitor) ────────────────────────────
const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',          // Vite dev
    'http://localhost:3000',          // Express dev
    'https://dungeon-crawler-quest.vercel.app',
    process.env.ALLOWED_ORIGIN,       // custom override
  ].filter(Boolean),
  credentials: true,
}));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'dungeon-crawler-game-server',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// Colyseus monitor dashboard (useful for debugging)
app.use('/monitor', monitor());

// ── HTTP + Colyseus server ────────────────────────────────────
const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 5000,
    pingMaxRetries: 3,
  }),
});

// Register game rooms
gameServer.define('open_world', OpenWorldRoom);

// ── Start ─────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[game-server] Colyseus listening on ws://0.0.0.0:${PORT}`);
  console.log(`[game-server] Health:  http://0.0.0.0:${PORT}/health`);
  console.log(`[game-server] Monitor: http://0.0.0.0:${PORT}/monitor`);
});
