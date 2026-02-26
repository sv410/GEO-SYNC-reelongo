import { motion } from "framer-motion";
import { Radio, Satellite, Users, Activity, AlertCircle, RefreshCw } from "lucide-react";

interface MapHUDProps {
  sessionId: string;
  role: "tracker" | "tracked";
  wsStatus: "connecting" | "connected" | "disconnected";
  trackerActive: boolean;
  lat: number;
  lng: number;
  zoom: number;
}

export function MapHUD({ sessionId, role, wsStatus, trackerActive, lat, lng, zoom }: MapHUDProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 left-4 right-4 md:left-auto md:right-6 md:top-6 z-[1000] md:w-80 flex flex-col gap-3 pointer-events-none"
    >
      <div className="glass-panel rounded-2xl p-5 w-full pointer-events-auto">
        
        {/* Header / Session Info */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Session Area</h2>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xl text-foreground text-glow">{sessionId}</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            {role === 'tracker' ? <Radio className="text-primary w-5 h-5" /> : <Satellite className="text-primary w-5 h-5" />}
          </div>
        </div>
        
        <div className="h-px w-full bg-white/10 mb-4" />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Latitude
            </span>
            <span className="font-mono text-sm font-medium">{lat.toFixed(5)}°</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Longitude
            </span>
            <span className="font-mono text-sm font-medium">{lng.toFixed(5)}°</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">Zoom Level</span>
            <span className="font-mono text-sm font-medium">{zoom.toFixed(1)}x</span>
          </div>
          
          <div className="flex flex-col items-end">
             <span className="text-xs text-muted-foreground mb-1">Status</span>
             <StatusBadge role={role} wsStatus={wsStatus} trackerActive={trackerActive} />
          </div>
        </div>

      </div>

      {role === 'tracked' && !trackerActive && wsStatus === 'connected' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel border-destructive/30 bg-destructive/10 rounded-xl p-3 flex items-center gap-3 pointer-events-auto"
        >
          <AlertCircle className="text-destructive w-5 h-5 animate-pulse" />
          <p className="text-xs font-medium text-destructive-foreground">Waiting for Tracker to connect or resume broadcasting...</p>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatusBadge({ role, wsStatus, trackerActive }: { role: string, wsStatus: string, trackerActive: boolean }) {
  if (wsStatus === 'connecting') {
    return (
      <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-1 rounded-md text-xs font-medium">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Connecting
      </div>
    );
  }

  if (wsStatus === 'disconnected') {
    return (
      <div className="flex items-center gap-1.5 bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 rounded-md text-xs font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
        Offline
      </div>
    );
  }

  // Connected states
  if (role === 'tracker') {
    return (
      <div className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md text-xs font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
        Broadcasting
      </div>
    );
  }

  if (trackerActive) {
    return (
      <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-md text-xs font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        Syncing
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-muted text-muted-foreground border border-white/10 px-2 py-1 rounded-md text-xs font-medium">
      <Users className="w-3 h-3" />
      Standby
    </div>
  );
}
