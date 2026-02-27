# Real-Time Geo-Sync (Tracker & Follower)

A web application that synchronizes map movements between two user roles—Tracker and Tracked—in real-time using WebSockets.

## Features

- **Real-Time Synchronization**: Instantly syncs pan and zoom levels from the Tracker to all Tracked users.
- **Role-Based System**:
  - **Tracker**: Controls the map view for everyone in the session.
  - **Tracked**: Observes the movement; includes a re-sync mechanism if they move their map manually.
- **Session Management**: Join or create rooms using unique IDs.
- **Live HUD**: Displays latitude, longitude, zoom level, and connection status.
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

3. Start the application:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`.

## Configuration

Environment variables:
- `DATABASE_URL`: PostgreSQL connection string.
- `PORT`: Server port (defaults to 5000).

## License

MIT
