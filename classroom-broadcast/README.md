# EduCast — Live Classroom Broadcasting System (LiveKit Edition)

A production-ready live lecture broadcasting platform supporting **1 lecturer → 25+ simultaneous classroom viewers** across different networks (WiFi, Jio, Airtel, BSNL, hotspots).

---

## Architecture Overview

```
Lecturer Browser                  LiveKit SFU Server               Viewer Browsers (25+)
      │                                   │                               │
      │── publish camera/screen ─────────▶│◀─── auto-subscribe ──────────│
      │                                   │──── forward tracks ──────────▶│
      │                                   │                               │
Firebase Firestore                    (handles all NAT/                Firebase Firestore
  (Auth + Session Metadata)            TURN/ICE internally)            (session list only)
```

**Why LiveKit?**
- One stream from the lecturer → forwarded to all viewers by the server
- No P2P WebRTC negotiation per viewer (the old design's Achilles' heel)
- Works across any network — NAT traversal handled internally
- Supports 25–1000+ simultaneous viewers
- Built-in reconnection, codec adaptation, bandwidth management

**Roles:**
- **Admin** — Creates sessions, starts/ends them, monitors classrooms
- **Lecturer** — Joins a live session, broadcasts camera/screen via LiveKit
- **Classroom Viewer** — Joins a live session, watches the stream (no login required)

---

## Prerequisites

You need:
1. A **Firebase project** (already configured)
2. A **LiveKit server** (Cloud or self-hosted — see below)
3. A **token server** running (the `livekit-token-server/` folder)

---

## Quick Start

### 1. Get a LiveKit Account (Free)

1. Go to [https://cloud.livekit.io](https://cloud.livekit.io) and sign up
2. Create a new project
3. Go to **Project Settings → Keys → Create API Key**
4. Note down:
   - **WebSocket URL** — e.g. `wss://your-project.livekit.cloud`
   - **API Key** — e.g. `APIxxxxxxxxxxxxxxxx`
   - **API Secret** — keep this secret!

> **Alternative: Self-hosted LiveKit**
> ```bash
> docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
>   -e LIVEKIT_KEYS="devkey: secret" \
>   livekit/livekit-server --dev
> ```
> Use `ws://localhost:7880` as the URL.

### 2. Set Up the Token Server

```bash
cd livekit-token-server
npm install
cp .env.example .env
```

Edit `.env`:
```env
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
PORT=4000
ALLOWED_ORIGINS=http://localhost:3000
```

Start the token server:
```bash
npm start
```

It runs at `http://localhost:4000`.

### 3. Set Up the Frontend

```bash
cd classroom-broadcast
npm install
cp .env.example .env
```

Edit `.env`:
```env
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_TOKEN_SERVER_URL=http://localhost:4000
```

Start the frontend:
```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

---

## Usage Flow

### Admin
1. Sign in at `/login` with admin credentials
2. Go to **New Session** → fill title & description → **Create Session**
3. Click **Start Session** when the lecturer is ready
4. Monitor connected classrooms in **Active Classrooms**
5. **End Session** when done

### Lecturer
1. Sign in at `/login` with lecturer credentials (redirects to `/lecturer`)
2. Allow camera & microphone access
3. Select the live session from the dropdown
4. Click **Go Live** — the browser connects to LiveKit and starts publishing
5. Use controls to mute/unmute, hide camera, or share screen

### Classroom Viewer (25+ simultaneously)
1. Open `/classroom` on any device/network (no login required)
2. Select a live session from the list
3. Enter your classroom name (e.g. "Room 301")
4. Watch the live stream — automatically receives from LiveKit SFU

---

## Project Structure

```
educast-classroom-broadcast/
├── livekit-token-server/          NEW — LiveKit JWT token backend
│   ├── server.js                  Express app (POST /api/token)
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
└── classroom-broadcast/           React frontend (Vite)
    ├── .env.example               NEW — VITE_LIVEKIT_URL, VITE_TOKEN_SERVER_URL
    ├── src/
    │   ├── services/
    │   │   ├── livekitService.js  NEW — LecturerBroadcaster + ViewerReceiver
    │   │   ├── sessionService.js  UPDATED — WebRTC signalling removed
    │   │   ├── authService.js     Unchanged
    │   │   └── firebaseService.js Unchanged
    │   ├── pages/
    │   │   ├── LecturerPage.jsx   UPDATED — uses livekitService
    │   │   ├── ClassroomPage.jsx  UPDATED — uses livekitService
    │   │   ├── AdminPage.jsx      Unchanged
    │   │   └── LoginPage.jsx      Unchanged
    │   ├── components/            Mostly unchanged (same UI)
    │   └── firebase/config.js     Unchanged
    └── package.json               UPDATED — added livekit-client
```

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /admins/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    match /lecturers/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Sessions — viewers can read without login; write requires auth
    match /sessions/{sessionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Classrooms registry — open read/write for classroom devices
    match /classrooms/{classroomId} {
      allow read, write: if true;
    }
  }
}
```

> **Note:** The old WebRTC signalling subcollections (`answers`, `lecturerCandidates`, `viewerCandidates`) are no longer used. You can delete them from the Firebase console or leave them — they won't affect anything.

---

## Production Deployment

### Token Server — Railway (Recommended)

1. Push `livekit-token-server/` to a GitHub repo
2. Go to [Railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select the repo
4. Add environment variables:
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `ALLOWED_ORIGINS=https://your-frontend.netlify.app`
   - `PORT=4000`
5. Copy the public URL (e.g. `https://educast-token.up.railway.app`)

### Token Server — Render

1. [Render.com](https://render.com) → New → Web Service
2. Connect repo, root dir = `livekit-token-server`
3. Build: `npm install` | Start: `npm start`
4. Add env vars in dashboard

### Frontend — Netlify / Vercel

```bash
cd classroom-broadcast
npm run build
# Upload dist/ to Netlify drag-and-drop, or:
vercel --prod
```

Update your production `.env` (or Netlify/Vercel environment variables):
```env
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_TOKEN_SERVER_URL=https://your-token-server.up.railway.app
```

---

## What Changed from the Old Implementation

| Area | Before (WebRTC P2P) | After (LiveKit SFU) |
|---|---|---|
| Signalling | Firestore ICE/offer/answer collections | None (LiveKit handles internally) |
| Viewer limit | ~5 viewers (browser CPU bound) | 25–1000+ viewers |
| Cross-network | Fragile (NAT issues) | Stable (TURN built-in) |
| Reconnection | Manual re-negotiation | Automatic |
| Lecturer CPU | Linear with viewer count | Constant (one upstream) |
| Screen share | Complex stream replacement | Native LiveKit track |
| Latency | ~1–3s | ~0.5–1s (WebRTC-grade) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication |
| Session Metadata | Cloud Firestore |
| Real-time Video | LiveKit SFU (livekit-client) |
| Token Server | Node.js + Express + livekit-server-sdk |
| Routing | React Router v6 |
| Icons | Lucide React |
