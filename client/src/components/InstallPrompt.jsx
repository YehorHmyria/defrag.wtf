import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log("InstallPrompt: Component mounted"); // Debug log

    const handleBeforeInstallPrompt = (e) => {
      console.log("InstallPrompt: beforeinstallprompt Event fired!"); // Debug log
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-[slide-up_0.5s_ease-out]">
      <button 
        onClick={handleInstallClick}
        className="flex items-center gap-3 bg-accent/10 border border-accent text-accent px-4 py-3 font-mono text-xs hover:bg-accent hover:text-primary transition-all shadow-[0_0_20px_var(--color-accent)]"
      >
        <Download size={16} />
        <div className="text-left">
           <div className="font-bold">[ SYSTEM UPDATE AVAILABLE ]</div>
           <div className="opacity-70">CLICK TO INSTALL APP MODULE</div>
        </div>
      </button>
    </div>
  );
};

export default InstallPrompt;
