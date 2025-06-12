// Mobile optimizations for full-screen and overscroll prevention
export class MobileOptimizations {
  private static instance: MobileOptimizations;
  private isInitialized = false;

  static getInstance(): MobileOptimizations {
    if (!MobileOptimizations.instance) {
      MobileOptimizations.instance = new MobileOptimizations();
    }
    return MobileOptimizations.instance;
  }
  public initialize(): void {
    if (this.isInitialized) return;
    
    this.addMobileClasses();
    this.preventOverscroll();
    this.handleFullScreen();
    this.preventPullToRefresh();
    this.handleViewportChanges();
    
    this.isInitialized = true;
  }

  private addMobileClasses(): void {
    // Add classes to body for CSS targeting
    if (this.isMobileDevice()) {
      document.body.classList.add('mobile-optimized', 'mobile-viewport');
      
      // Detect iOS
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.body.classList.add('ios-optimized');
      }
      
      // Detect Android
      if (/Android/.test(navigator.userAgent)) {
        document.body.classList.add('android-optimized');
      }
      
      // Add PWA classes based on display mode
      if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
        document.body.classList.add('pwa-fullscreen');
      } else if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        document.body.classList.add('pwa-standalone');
      }
    }
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
  }

  private preventOverscroll(): void {
    // Prevent overscrolling on the document
    document.addEventListener('touchmove', (e) => {
      // Allow scrolling within scrollable elements
      const target = e.target as HTMLElement;
      const scrollableParent = this.findScrollableParent(target);
      
      if (!scrollableParent) {
        e.preventDefault();
        return;
      }

      // Check if we're at the boundaries of scrollable content
      const { scrollTop, scrollHeight, clientHeight } = scrollableParent;
      
      // Prevent overscroll at top and bottom
      if (scrollTop === 0 && this.getTouchDirection(e) > 0) {
        e.preventDefault();
      } else if (scrollTop + clientHeight >= scrollHeight && this.getTouchDirection(e) < 0) {
        e.preventDefault();
      }
    }, { passive: false });

    // Prevent rubber band effect on iOS
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  private findScrollableParent(element: HTMLElement): HTMLElement | null {
    let parent = element;
    while (parent && parent !== document.body) {
      const { overflow, overflowY } = window.getComputedStyle(parent);
      if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
        return parent;
      }
      parent = parent.parentElement!;
    }
    return null;
  }

  private getTouchDirection(e: TouchEvent): number {
    // This is a simplified version - in a real implementation you'd track touch movements
    // Positive = scrolling down, Negative = scrolling up
    return 0;
  }
  private handleFullScreen(): void {
    // Only auto-request fullscreen on mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window) || 
                     (window.innerWidth <= 768);

    if (isMobile) {
      // Request fullscreen on user interaction (required by browsers) - mobile only
      const requestFullScreen = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.()
            .catch(() => {
              // Fallback for older browsers or unsupported devices
              console.log('Fullscreen not supported or denied');
            });
        }
      };

      // Auto-request fullscreen on first user interaction - mobile only
      const handleFirstInteraction = () => {
        requestFullScreen();
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('click', handleFirstInteraction);
      };

      document.addEventListener('touchstart', handleFirstInteraction, { once: true });
      document.addEventListener('click', handleFirstInteraction, { once: true });
    }
  }

  private preventPullToRefresh(): void {
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      const currentY = e.touches[0].clientY;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      
      // Prevent pull-to-refresh when at the top of the page
      if (scrollTop === 0 && currentY > startY) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  private handleViewportChanges(): void {
    // Handle viewport changes for mobile keyboards, orientation changes, etc.
    const handleViewportChange = () => {
      // Update CSS custom properties for viewport dimensions
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Force layout recalculation
      document.body.style.height = `${window.innerHeight}px`;
      setTimeout(() => {
        document.body.style.height = '100vh';
      }, 100);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    
    // Initial call
    handleViewportChange();
  }  public enableImmersiveMode(): void {
    // Additional immersive mode features - mobile focused
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window) || 
                     (window.innerWidth <= 768);

    document.body.classList.add('immersive-mode');
    
    if (isMobile) {
      // Lock orientation if supported - mobile only
      if ('screen' in window && 'orientation' in window.screen) {
        try {
          (window.screen.orientation as any).lock?.('portrait').catch(() => {
            console.log('Orientation lock not supported');
          });
        } catch (e) {
          console.log('Orientation lock not available');
        }
      }

      // Hide address bar on mobile browsers
      setTimeout(() => {
        window.scrollTo(0, 1);
      }, 100);
      
      // Request fullscreen if not already in fullscreen - mobile only
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {
          console.log('Fullscreen request failed or not supported');
        });
      }
    }
  }

  public requestFullscreen(): Promise<boolean> {
    // Manual fullscreen method for desktop users
    return new Promise((resolve) => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.()
          .then(() => resolve(true))
          .catch(() => {
            console.log('Fullscreen not supported or denied');
            resolve(false);
          });
      } else {
        resolve(true);
      }
    });
  }

  public exitFullscreen(): Promise<boolean> {
    // Exit fullscreen method
    return new Promise((resolve) => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.()
          .then(() => resolve(true))
          .catch(() => {
            console.log('Exit fullscreen failed');
            resolve(false);
          });
      } else {
        resolve(true);
      }
    });
  }

  public toggleFullscreen(): Promise<boolean> {
    // Toggle fullscreen method
    if (document.fullscreenElement) {
      return this.exitFullscreen();
    } else {
      return this.requestFullscreen();
    }
  }
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  const mobileOpt = MobileOptimizations.getInstance();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mobileOpt.initialize());
  } else {
    mobileOpt.initialize();
  }
}

export default MobileOptimizations;
