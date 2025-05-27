// PWA Installation Utilities - Simplified Universal Approach

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installPromptAvailable = false;

// Simple device detection
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// Initialize PWA installation capability detection
export const initializePWA = (): void => {
  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    deferredPrompt = e;
    installPromptAvailable = true;
    console.log('PWA install prompt available');
    
    // Notify components that install is available
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    installPromptAvailable = false;
    
    // Notify components that PWA was installed
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
};

// Check if PWA is already installed
export const isPWAInstalled = (): boolean => {
  // Check if running in standalone mode
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for iOS standalone mode
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  return false;
};

// Check if browser supports PWA installation
export const canInstallPWA = (): boolean => {
  return installPromptAvailable && deferredPrompt !== null;
};

// Attempt to install PWA
export const installPWA = async (): Promise<{ success: boolean; error?: string }> => {
  if (!canInstallPWA()) {
    return { 
      success: false, 
      error: 'Install prompt not available. Try the manual installation method below.' 
    };
  }

  try {
    await deferredPrompt!.prompt();
    const { outcome } = await deferredPrompt!.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      deferredPrompt = null;
      installPromptAvailable = false;
      return { success: true };
    } else {
      console.log('User dismissed the install prompt');
      return { 
        success: false, 
        error: 'Installation was cancelled. You can try again later or use manual installation.' 
      };
    }
  } catch (error) {
    console.error('Error during PWA installation:', error);
    return { 
      success: false, 
      error: 'Installation failed. Please try the manual installation method below.' 
    };
  }
};

// Get universal manual installation instructions
export const getManualInstallInstructions = (): string => {
  if (isIOSDevice()) {
    return 'iOS Safari: Tap the Share button (□↗) at the bottom, then scroll down and tap "Add to Home Screen". The app will appear on your home screen like a native app.';
  }
  
  if (isMobileDevice()) {
    return 'Mobile Browser: Look for "Add to Home Screen", "Install App", or "Add to Desktop" in your browser menu (usually ⋮ or ⋯). The option might be in Settings or under the address bar.';
  }
  
  return 'Desktop Browser: Look for an install icon (⬇️ or ⊞) in your address bar, or check your browser menu for "Install ALTER EGO", "Add to Desktop", or "Create Shortcut" options. The app will open in its own window.';
};

// Get current browser info for debugging
export const getBrowserInfo = (): { 
  userAgent: string; 
  isMobile: boolean; 
  isIOS: boolean; 
  isPWAInstalled: boolean;
  canInstall: boolean;
} => {
  return {
    userAgent: navigator.userAgent,
    isMobile: isMobileDevice(),
    isIOS: isIOSDevice(),
    isPWAInstalled: isPWAInstalled(),
    canInstall: canInstallPWA()
  };
};

// Get PWA benefits for display
export const getPWABenefits = (): string[] => {
  const benefits = [
    'Faster loading and offline access',
    'Native app-like experience',
    'No app store needed',
    'Automatic updates'
  ];
  
  if (isMobileDevice()) {
    benefits.push('Add to home screen');
    benefits.push('Full screen experience');
  } else {
    benefits.push('Desktop shortcut');
    benefits.push('Runs in its own window');
    benefits.push('System integration');
  }
  
  return benefits;
};