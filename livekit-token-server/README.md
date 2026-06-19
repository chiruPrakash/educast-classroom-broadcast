# EduCast LiveKit Token Server

A minimal Express.js server that generates LiveKit JWT tokens for the EduCast frontend. The API secret is kept server-side — never exposed to the browser.

---

## Setup

### 1. Install dependencies

```bash
cd livekit-token-server
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
PORT=4000
ALLOWED_ORIGINS=http://localhost:3000
```

**Get credentials from:**
- **LiveKit Cloud**: https://cloud.livekit.io → Project → Settings → Keys → Create Key
- **Self-hosted**: Your `livekit.yaml` configuration

### 3. Run locally

```bash
npm start
# or for auto-restart:
npm run dev
```

Server starts at `http://localhost:4000`

---

## API

### `GET /health`

```json
{ "status": "ok", "timestamp": "..." }
```

### `POST /api/token`

**Request body:**
```json
{
  "roomName": "session_abc123",
  "participantName": "Lecturer Name",
  "isPublisher": true
}
```

**Response:**
```json
{
  "token": "<jwt>"
}
```

- `isPublisher: true` → Lecturer (can publish tracks)
- `isPublisher: false` → Viewer (subscribe only)

---

## Production Deployment

### Option A — Railway (Recommended, Free Tier)

1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select this folder (or push to a new GitHub repo)
3. Add environment variables in Railway dashboard
4. Get the public URL (e.g. `https://educast-token.up.railway.app`)
5. Update `VITE_TOKEN_SERVER_URL` in the frontend `.env`
6. Update `ALLOWED_ORIGINS` to your frontend's domain

### Option B — Render (Free Tier)

1. Go to https://render.com → New → Web Service
2. Connect repo, set root directory to `livekit-token-server`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables in Render dashboard

### Option C — Local (Development Only)

Run alongside the React dev server. Works on same machine.

---

## Security Notes

- The `LIVEKIT_API_SECRET` must **never** be in the frontend code
- Tokens are signed JWTs — they expire in 6 hours
- In production, add Firebase token verification to protect the endpoint from abuse
