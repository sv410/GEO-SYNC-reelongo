import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useCreateSession } from "@/hooks/use-sessions";
import { Map, Crosshair, Navigation2, ArrowRight } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const createSession = useCreateSession();
  
  const [sessionId, setSessionId] = useState("");
  const [role, setRole] = useState<"tracker" | "tracked">("tracker");
  const [error, setError] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      setError("Please enter a session ID.");
      return;
    }
    
    setError("");
    
    createSession.mutate(
      { id: sessionId.trim() },
      {
        onSuccess: (data) => {
          setLocation(`/session/${data.id}?role=${role}`);
        },
        onError: (err) => {
          setError(err.message || "Failed to join session. Please try again.");
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center z-10">
        
        {/* Left column: Copy */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold tracking-wide mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            REAL-TIME GEO SYNC
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
            Synchronize maps <br className="hidden lg:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">across any distance.</span>
          </h1>
          
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto lg:mx-0">
            Create a session, choose your role, and perfectly sync your map viewport with anyone in the world instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
               <Crosshair className="w-4 h-4 text-primary" /> Sub-second latency
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
            <div className="flex items-center gap-2">
               <Map className="w-4 h-4 text-primary" /> High precision sync
            </div>
          </div>
        </motion.div>

        {/* Right column: Form Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="glass-panel p-8 rounded-3xl w-full max-w-md mx-auto relative overflow-hidden">
            {/* Subtle highlight line top of card */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            
            <h2 className="text-2xl font-display font-bold mb-6">Join Session</h2>
            
            <form onSubmit={handleJoin} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Session ID</label>
                <input
                  type="text"
                  placeholder="e.g. alpha-bravo-123"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Select Role</label>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("tracker")}
                    className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
                      role === "tracker" 
                        ? "bg-primary/10 border-primary shadow-[0_0_15px_hsl(var(--primary)/0.15)] text-primary" 
                        : "bg-background/50 border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <Navigation2 className="w-6 h-6" />
                    <span className="font-semibold text-sm">Tracker</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setRole("tracked")}
                    className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
                      role === "tracked" 
                        ? "bg-primary/10 border-primary shadow-[0_0_15px_hsl(var(--primary)/0.15)] text-primary" 
                        : "bg-background/50 border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <Crosshair className="w-6 h-6" />
                    <span className="font-semibold text-sm">Tracked</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-destructive text-sm font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={createSession.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {createSession.isPending ? "Connecting..." : "Enter Map Room"}
                {!createSession.isPending && <ArrowRight className="w-5 h-5" />}
              </button>
              
            </form>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}
