import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[2000] animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div className="bg-clay-surface shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 rounded-[24px] p-4 flex flex-col gap-3 relative">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 text-clay-secondary hover:text-clay-primary bg-clay-recessed shadow-clay-pressed rounded-full transition-all active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 rounded-[16px] bg-gradient-to-br from-emerald-400 to-sky-500 shadow-clay-card flex items-center justify-center text-white">
            <Download className="h-6 w-6" />
          </div>
          <div className="pr-6">
            <h3 className="font-extrabold text-clay-primary text-sm">Install App</h3>
            <p className="text-[11px] text-clay-secondary mt-1 leading-relaxed font-medium">
              Add to your home screen for quick offline access and a native app experience.
            </p>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          className="w-full mt-1 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider py-3 rounded-[16px] shadow-clay-btn hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Install now
        </button>
      </div>
    </div>
  );
}
