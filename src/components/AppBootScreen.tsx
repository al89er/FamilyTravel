import { useEffect, useState } from "react";
import { X } from "lucide-react";

const MESSAGES = [
  "Preparing your trip...",
  "Loading memories...",
  "Getting your gallery ready...",
  "Finding your best moments...",
  "Almost there..."
];

export interface AppBootScreenProps {
  previewMode?: boolean;
  onClose?: () => void;
  messageOverride?: string;
  showCloseButton?: boolean;
}

export function AppBootScreen({ previewMode, onClose, messageOverride, showCloseButton }: AppBootScreenProps = {}) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (previewMode && onClose) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [previewMode, onClose]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-clay-canvas via-clay-surface to-clay-canvas overflow-hidden">
      {/* Subtle Background Visuals */}
      <div className="absolute inset-0 pointer-events-none opacity-20 motion-reduce:hidden">
        <div className="absolute top-[10%] left-[15%] w-32 h-32 bg-primary rounded-full mix-blend-multiply filter blur-3xl animate-[blob_7s_infinite]" />
        <div className="absolute top-[20%] right-[15%] w-32 h-32 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-[blob_7s_infinite_2s]" />
        <div className="absolute bottom-[20%] left-[20%] w-32 h-32 bg-[#A78BFA] rounded-full mix-blend-multiply filter blur-3xl animate-[blob_7s_infinite_4s]" />
      </div>

      {showCloseButton && onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 sm:top-6 sm:right-6 text-clay-secondary hover:text-clay-primary hover:bg-clay-recessed rounded-full transition-colors z-50"
          aria-label="Close preview"
        >
          <X className="h-6 w-6" />
        </button>
      )}

      {previewMode && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 pointer-events-none">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            Preview Mode
          </span>
        </div>
      )}

      <div className="max-w-md w-full px-8 flex flex-col items-center relative z-10">
        
        {/* Brand Icon with glowing animation */}
        <div className="relative mb-8 flex items-center justify-center overflow-visible">
          {/* Outer wide blur */}
          <div className="absolute w-40 h-40 bg-primary/20 dark:bg-primary/30 rounded-full blur-[40px] animate-pulse motion-reduce:animate-none" />
          {/* Inner ring */}
          <div className="absolute w-28 h-28 bg-primary/30 dark:bg-primary/40 rounded-full blur-xl animate-[pulse_3s_infinite] motion-reduce:animate-none" />
          {/* Static fallback for reduced motion */}
          <div className="absolute w-32 h-32 bg-primary/20 rounded-full blur-2xl hidden motion-reduce:block" />

          <div className="relative z-10 h-24 w-24 rounded-[28px] overflow-hidden shadow-xl shadow-primary/20 dark:shadow-none">
            <img 
              src="/icon-192.png" 
              alt="Family Travel App Icon" 
              className="block w-full h-full object-cover rounded-[inherit]"
              width={96}
              height={96}
            />
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
          <div className="mt-8 min-h-[3.5rem] relative w-full text-center px-2 overflow-visible">
            {messageOverride ? (
              <p className="absolute inset-x-0 top-0 text-[11px] font-bold uppercase tracking-widest text-clay-secondary/70 leading-snug">
                {messageOverride}
              </p>
            ) : (
              MESSAGES.map((msg, i) => (
                <p
                  key={msg}
                  className={`absolute inset-x-0 top-0 text-[11px] font-bold uppercase tracking-widest text-clay-secondary/70 transition-all duration-700 leading-snug
                    ${i === messageIndex 
                      ? 'opacity-100 translate-y-0' 
                      : i < messageIndex 
                        ? 'opacity-0 -translate-y-4 pointer-events-none' 
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                >
                  {msg}
                </p>
              ))
            )}
          </div>
        </div>
        
      </div>
      
      {/* Keyframes for animations */}
      <style>{`
        @keyframes travel-progress {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(350%); }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
    </div>
  );
}
