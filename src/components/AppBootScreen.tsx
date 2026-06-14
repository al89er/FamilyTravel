import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

const MESSAGES = [
  "Preparing your trip...",
  "Loading memories...",
  "Getting your gallery ready...",
  "Finding your best moments...",
  "Almost there..."
];

export function AppBootScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-clay-canvas via-clay-surface to-clay-canvas overflow-hidden">
      <div className="max-w-md w-full px-8 flex flex-col items-center">
        
        {/* Brand Icon with subtle glowing animation */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse motion-reduce:animate-none" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[32px] bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] shadow-clay-btn ring-4 ring-white/10">
            <MapPin className="h-10 w-10 text-white drop-shadow-md" aria-hidden="true" />
          </div>
        </div>

        {/* Brand Text */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-clay-primary text-center">
          Family Travel
        </h1>
        <p className="mt-4 text-sm font-medium text-clay-secondary/80 text-center tracking-wide px-4">
          Your family trips, beautifully remembered.
        </p>

        {/* Loading Visual */}
        <div className="mt-16 w-full max-w-[200px] flex flex-col items-center">
          
          {/* Animated Route Shimmer Bar */}
          <div className="w-full relative h-1.5 bg-clay-recessed rounded-full overflow-hidden shadow-inner">
            <div 
              className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full opacity-80 motion-reduce:hidden" 
              style={{ animation: "travel-progress 2s infinite ease-in-out" }}
            />
            {/* Fallback for reduced motion */}
            <div className="absolute inset-0 bg-primary/30 hidden motion-reduce:block rounded-full" />
          </div>

          {/* Rotating Message */}
          <div className="mt-8 h-6 overflow-hidden relative w-full text-center">
            {MESSAGES.map((msg, i) => (
              <p
                key={msg}
                className={`absolute inset-x-0 top-0 text-[11px] font-bold uppercase tracking-widest text-clay-secondary/70 transition-all duration-700
                  ${i === messageIndex 
                    ? 'opacity-100 translate-y-0' 
                    : i < messageIndex 
                      ? 'opacity-0 -translate-y-4' 
                      : 'opacity-0 translate-y-4'
                  }`}
              >
                {msg}
              </p>
            ))}
          </div>
        </div>
        
      </div>
      
      {/* Keyframes for the shimmer/route progress */}
      <style>{`
        @keyframes travel-progress {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
