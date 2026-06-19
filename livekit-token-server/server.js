// ============================================================
// EduCast — LiveKit Token Server
// ============================================================
// This server generates short-lived LiveKit JWT tokens so
// that the API secret is never exposed in the browser.
//
// Endpoints:
//   POST /api/token
//     Body: { roomName, participantName, isPublisher }
//     Returns: { token }
//
//   GET /health
//     Returns: { status: "ok" }
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
const PORT = process.env.PORT || 4000;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// ── Startup validation ──────────────────────────────────────
if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('\n❌  Missing required environment variables!');
  console.error('   LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set.');
  console.error('   Copy .env.example to .env and fill in your values.\n');
  process.exit(1);
}

// ── CORS ────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, same-origin)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Health check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Token endpoint ──────────────────────────────────────────
/**
 * POST /api/token
 *
 * Body:
 *   roomName        {string}  — LiveKit room name (use Firestore session ID)
 *   participantName {string}  — Unique display name for this participant
 *   isPublisher     {boolean} — true = lecturer (can publish), false = viewer
 *
 * Returns:
 *   { token: "<jwt string>" }
 */
app.post('/api/token', async (req, res) => {
  try {
    const { roomName, participantName, isPublisher = false } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({
        error: 'roomName and participantName are required'
      });
    }

    // Sanitise participant name for use as a LiveKit identity
    const identity = participantName
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .slice(0, 64);

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: participantName,
      // Tokens expire in 6 hours — sufficient for any lecture
      ttl: '6h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      // Publishers (lecturers) can publish tracks; viewers subscribe only
      canPublish: isPublisher,
      canSubscribe: true,
      // Allow publisher to publish data channel messages (future feature)
      canPublishData: isPublisher,
    });

    const token = await at.toJwt();

    console.log(
      `[Token] Generated for "${participantName}" in room "${roomName}" ` +
      `(${isPublisher ? 'PUBLISHER' : 'SUBSCRIBER'})`
    );

    res.json({ token });
  } catch (err) {
    console.error('[Token] Error generating token:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// ── 404 fallback ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  EduCast LiveKit Token Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Token endpoint: POST http://localhost:${PORT}/api/token\n`);
});
