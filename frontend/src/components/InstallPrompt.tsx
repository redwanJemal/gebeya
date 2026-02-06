import { useState, useEffect } from 'react';
import { X, Smartphone, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if coming from install link
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('install') === 'true') {
      setShowPrompt(true);
      // Clean URL
      window.history.replaceState({}, '', '/');
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt (Android/Desktop Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-tg-bg rounded-2xl p-6 animate-slide-up">
        <div className="flex justify-between items-start mb-4">
          <div className="w-14 h-14 bg-tg-button rounded-xl flex items-center justify-center">
            <Smartphone className="w-7 h-7 text-tg-button-text" />
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="p-1 text-tg-hint"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-tg-text mb-2">
          ወደ ስክሪን ጨምር
        </h2>
        <p className="text-tg-hint mb-4">
          Add to Home Screen
        </p>

        {isIOS ? (
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-tg-secondary-bg rounded-xl">
              <div className="w-10 h-10 bg-tg-button/20 rounded-lg flex items-center justify-center">
                <Share className="w-5 h-5 text-tg-button" />
              </div>
              <div>
                <p className="text-sm font-medium text-tg-text">1. Tap Share</p>
                <p className="text-xs text-tg-hint">Bottom of Safari</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-tg-secondary-bg rounded-xl">
              <div className="w-10 h-10 bg-tg-button/20 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-tg-button" />
              </div>
              <div>
                <p className="text-sm font-medium text-tg-text">2. Add to Home Screen</p>
                <p className="text-xs text-tg-hint">Scroll down in menu</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-tg-text mb-6">
            ይህን መተግበሪያ በቀላሉ ለመድረስ ወደ ስክሪንዎ ያክሉ።
          </p>
        )}

        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full py-3 bg-tg-button text-tg-button-text rounded-xl font-bold"
          >
            📲 አክል / Install
          </button>
        ) : (
          <button
            onClick={() => setShowPrompt(false)}
            className="w-full py-3 bg-tg-secondary-bg text-tg-text rounded-xl font-medium"
          >
            ገባኝ / Got it
          </button>
        )}
      </div>
    </div>
  );
}
