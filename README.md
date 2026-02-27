# Real-Time Geo-Sync (Tracker & Follower)

A web application that synchronizes map movements between two user roles—Tracker and Tracked—in real-time using WebSockets.

## Features

- **Real-Time Synchronization**: Instantly syncs pan and zoom levels from the Tracker to all Tracked users.
- **Tilt Synchronization**: Tracker tilt angle is synchronized to all Tracked users in real time.
- **Role-Based System**:
  - **Tracker**: Controls the map view for everyone in the session.
  - **Tracked**: Observes the movement; includes a re-sync mechanism if they move their map manually.
- **Session Management**: Join or create rooms using unique IDs.
- **Live HUD**: Displays latitude, longitude, zoom level, and connection status.
- **Latency Telemetry**: HUD displays live and rolling-average socket latency.
- **Throttled Broadcasts**: Movement updates are throttled to avoid flooding sockets.
- **Glassmorphic UI**: Sleek, modern interface with a dark theme.

## Tech Stack

- **Frontend**: React.js, Framer Motion, Lucide React.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL (Drizzle ORM).
- **Real-Time**: WebSockets (`ws`).
- **Map Library**: Leaflet.js.

## Getting Started

### Prerequisites

- Node.js installed.
- PostgreSQL database (or use Replit's built-in DB).

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Push the database schema:
   ```bash
   npm run db:push
   ```

3. Start the application (integrated mode):
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`.

### Split Client/Server Mode (recommended for assignment review)

Run backend and frontend in separate terminals:

1. Terminal A (Backend API + WebSocket server)
   ```bash
   npm run dev:server
   ```
   Runs on `http://localhost:5000`.

2. Terminal B (Frontend Vite client)
   ```bash
   npm run dev:client
   ```
   Runs on `http://localhost:5173` and proxies `/api` + `/ws` to backend.

### Synchronization Notes

- **Position Sync**: `lat`, `lng`, `zoom` are synchronized via WebSocket messages.
- **Tilt Sync**: `tilt` (0-60°) is synchronized from Tracker to Tracked in each update.
- **Throttle**: Tracker updates are throttled (~80ms) to reduce redundant socket traffic.
- **Latency Metric**: Each update includes a send timestamp and is measured client-side in HUD.

### Automated Latency Stress Test

Use this to generate repeatable latency evidence for submission.

1. Start backend server:
   ```bash
   npm run dev:server
   ```

2. Run the stress test (new terminal):
   ```bash
   npm run test:latency
   ```

3. Optional custom test profile:
   ```bash
   npm run test:latency -- --updates 400 --interval 40 --threshold 100 --enforce true
   ```

Output includes:
- `avgMs`, `p50Ms`, `p95Ms`, `maxMs`
- delivery quality (`received`, `dropRatePercent`)
- threshold compliance (`underThresholdPercent`, `pass`)

## Configuration

Environment variables:
- `DATABASE_URL`: PostgreSQL connection string.
- `PORT`: Server port (defaults to 5000).

## License

MIT
