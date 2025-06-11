/**
 * Developer Tools Blocker Utility
 * Blocks access to browser developer tools in production mode
 */

import { SecurityConfig, currentSecurityConfig } from './securityConfig';

export class DevToolsBlocker {
  private static instance: DevToolsBlocker;
  private isBlocking = false;
  private devToolsOpen = false;
  private config: SecurityConfig;
  private warningShown = false; // Prevent multiple warnings
  private detectionPaused = false; // Allow temporary pausing

  private constructor() {
    this.config = currentSecurityConfig;
  }

  public static getInstance(): DevToolsBlocker {
    if (!DevToolsBlocker.instance) {
      DevToolsBlocker.instance = new DevToolsBlocker();
    }
    return DevToolsBlocker.instance;
  }  /**
   * Initialize dev tools blocking for production mode
   */
  public initializeBlocking(): void {
    if (!this.config.blockDevTools) {
      console.log('Dev tools blocking disabled by configuration');
      return;
    }

    this.isBlocking = true;
    
    if (this.config.blockKeyboardShortcuts) {
      this.blockKeyboardShortcuts();
    }
    
    if (this.config.blockContextMenu) {
      this.blockContextMenu();
    }
    
    if (this.config.detectDevToolsOpening) {
      this.detectDevToolsOpening();
    }
    
    this.blockCommonInspectionMethods();
    
    // Add emergency disable sequence (Konami code)
    this.addEmergencyDisable();
    
    console.log('Developer tools blocking activated for production');
  }

  /**
   * Add emergency disable sequence for support/debugging purposes
   */
  private addEmergencyDisable(): void {
    const konamiCode = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'KeyB', 'KeyA'
    ];
    let konamiIndex = 0;

    document.addEventListener('keydown', (event) => {
      if (event.code === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          // Show confirmation dialog
          const confirmed = confirm('Do you want to disable developer tools protection? This should only be used for support purposes.');
          if (confirmed) {
            this.disableBlocking();
            alert('Developer tools protection has been disabled for this session.');
          }
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    });
  }

  /**
   * Block keyboard shortcuts that open developer tools
   */
  private blockKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!this.isBlocking) return;

      // F12
      if (event.key === 'F12') {
        event.preventDefault();
        event.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+Shift+I (Inspector)
      if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        event.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+Shift+J (Console)
      if (event.ctrlKey && event.shiftKey && event.key === 'J') {
        event.preventDefault();
        event.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+Shift+C (Element selector)
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        event.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+U (View source)
      if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
        event.stopPropagation();
        this.showWarning();
        return false;
      }

      // Ctrl+S (Save page)
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        event.stopPropagation();
        this.showWarning();
        return false;
      }

      // F5 + Ctrl (Hard refresh)
      if (event.ctrlKey && event.key === 'F5') {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // Ctrl+Shift+R (Hard refresh)
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    });
  }

  /**
   * Block right-click context menu
   */
  private blockContextMenu(): void {
    document.addEventListener('contextmenu', (event: MouseEvent) => {
      if (!this.isBlocking) return;
      
      event.preventDefault();
      event.stopPropagation();
      this.showWarning();
      return false;
    });
  }  /**
   * Detect when developer tools are opened
   */
  private detectDevToolsOpening(): void {
    const threshold = this.config.devToolsDetectionThreshold;
    const interval = this.config.debuggerCheckInterval;

    // Detect browser type for better handling
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

    // Method 1: Window size detection (less aggressive for Safari)
    let detectionCount = 0;
    const requiredDetections = isSafari ? 3 : 2; // More confirmations needed for Safari

    setInterval(() => {
      if (!this.isBlocking) return;

      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        detectionCount++;
        if (detectionCount >= requiredDetections && !this.devToolsOpen) {
          this.devToolsOpen = true;
          this.handleDevToolsDetected();
        }
      } else {
        detectionCount = 0;
        this.devToolsOpen = false;
      }
    }, interval);

    // Method 2: Console object detection (skip for Safari to avoid issues)
    if (!isSafari) {
      let devtools: { open: boolean; orientation: string | null } = { open: false, orientation: null };
      setInterval(() => {
        if (!this.isBlocking) return;

        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true;
            if (!this.devToolsOpen) {
              this.devToolsOpen = true;
              this.handleDevToolsDetected();
            }
          }
        } else {
          devtools.open = false;
        }
      }, interval);
    }

    // Method 3: Debugger statement detection (disabled by default in config now)
    if (this.config.enableAntiDebugging && !isSafari) {
      setInterval(() => {
        if (!this.isBlocking) return;
        
        const start = performance.now();
        debugger; // This will pause if dev tools are open
        const end = performance.now();
        
        if (end - start > 100) {
          if (!this.devToolsOpen) {
            this.devToolsOpen = true;
            this.handleDevToolsDetected();
          }
        }
      }, 2000); // Less frequent for debugger method
    }
  }
  /**
   * Block common inspection methods
   */
  private blockCommonInspectionMethods(): void {
    // Disable text selection if configured
    if (this.config.blockTextSelection) {
      document.onselectstart = () => {
        if (this.isBlocking) {
          this.showWarning();
          return false;
        }
        return true;
      };
    }

    // Disable drag
    document.ondragstart = () => {
      if (this.isBlocking) {
        return false;
      }
      return true;
    };

    // Override console methods in production if configured
    if (this.isBlocking && this.config.disableConsole) {
      const noop = () => {};
      (window as any).console = {
        log: noop,
        error: noop,
        warn: noop,
        info: noop,
        debug: noop,
        clear: noop,
        dir: noop,
        dirxml: noop,
        trace: noop,
        assert: noop,
        count: noop,
        countReset: noop,
        group: noop,
        groupCollapsed: noop,
        groupEnd: noop,
        table: noop,
        time: noop,
        timeEnd: noop,
        timeLog: noop,
        profile: noop,
        profileEnd: noop
      };
    }
  }  /**
   * Handle when developer tools are detected
   */
  private handleDevToolsDetected(): void {
    // Prevent multiple simultaneous responses
    if (this.warningShown || this.detectionPaused) {
      return;
    }

    if (this.config.redirectUrl) {
      window.location.href = this.config.redirectUrl;
      return;
    }

    // Use different response based on configuration
    if (this.config.responseLevel === 'hard') {
      this.showHardResponse();
    } else {
      this.showDevToolsWarning();
    }
    
    // Clear sensitive data if configured (but warn user first)
    if (this.config.clearDataOnBreach) {
      console.warn('Security breach detected - sensitive data clearing is configured but disabled for user safety');
      // this.clearSensitiveData(); // Commented out for safety
    }
    
    // Redirect after a delay if configured (but don't do it automatically)
    if (this.config.reloadOnDetection) {
      console.warn('Auto-reload is configured but disabled to prevent refresh loops');
      // setTimeout(() => {
      //   window.location.reload();
      // }, 10000);
    }
  }

  /**
   * Show hard response (page replacement) - only used if explicitly configured
   */
  private showHardResponse(): void {
    // Clear the page content
    document.body.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: #f0f0f0;
        font-family: Arial, sans-serif;
        text-align: center;
        flex-direction: column;
      ">
        <h1 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Access Restricted</h1>
        <p style="color: #2c3e50; font-size: 18px; margin-bottom: 20px;">
          Developer tools are not allowed in this application.
        </p>
        <p style="color: #7f8c8d; font-size: 14px;">
          Please close the developer tools and refresh the page.
        </p>
        <button onclick="window.location.reload()" style="
          margin-top: 20px;
          padding: 10px 20px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        ">
          Refresh Page
        </button>
      </div>
    `;
  }
  /**
   * Show a less intrusive dev tools warning overlay
   */
  private showDevToolsWarning(): void {
    // Prevent multiple warnings
    if (this.warningShown) {
      return;
    }
    this.warningShown = true;

    // Remove any existing warning
    const existingWarning = document.getElementById('dev-tools-warning-overlay');
    if (existingWarning) {
      existingWarning.remove();
    }

    // Create overlay warning
    const overlay = document.createElement('div');
    overlay.id = 'dev-tools-warning-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: Arial, sans-serif;
    `;

    const warningBox = document.createElement('div');
    warningBox.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    `;

    warningBox.innerHTML = `
      <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Developer Tools Detected</h2>
      <p style="color: #2c3e50; font-size: 16px; margin-bottom: 20px;">
        Please close the developer tools to continue using the application normally.
      </p>
      <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 20px;">
        This security measure helps protect the application and your data.
      </p>
      <button id="dismiss-warning" style="
        padding: 10px 20px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        margin-right: 10px;
      ">
        I'll Close Dev Tools
      </button>
      <button id="continue-anyway" style="
        padding: 10px 20px;
        background: #95a5a6;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
      ">
        Continue Anyway
      </button>
    `;

    overlay.appendChild(warningBox);
    document.body.appendChild(overlay);

    // Add click handlers
    const dismissButton = document.getElementById('dismiss-warning');
    const continueButton = document.getElementById('continue-anyway');

    if (dismissButton) {
      dismissButton.addEventListener('click', () => {
        overlay.remove();
        this.warningShown = false;
        // Check again in a few seconds to see if dev tools are still open
        setTimeout(() => {
          if (this.devToolsOpen && !this.detectionPaused) {
            this.showDevToolsWarning();
          }
        }, 5000); // Give more time
      });
    }

    if (continueButton) {
      continueButton.addEventListener('click', () => {
        overlay.remove();
        this.warningShown = false;
        // Temporarily disable detection for 60 seconds
        this.temporarilyDisableDetection(60000);
      });
    }

    // Auto-dismiss if dev tools are closed
    const checkInterval = setInterval(() => {
      if (!this.devToolsOpen) {
        overlay.remove();
        this.warningShown = false;
        clearInterval(checkInterval);
      }
    }, 1000);
  }
  /**
   * Temporarily disable dev tools detection
   */
  private temporarilyDisableDetection(duration: number): void {
    const originalBlocking = this.isBlocking;
    this.detectionPaused = true;
    this.isBlocking = false;
    
    console.log(`🔒 Developer tools detection paused for ${duration/1000} seconds`);
    
    setTimeout(() => {
      this.isBlocking = originalBlocking;
      this.detectionPaused = false;
      console.log('🔒 Developer tools detection resumed');
    }, duration);
  }

  /**
   * Clear sensitive data from storage
   */
  private clearSensitiveData(): void {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    } catch (e) {
      // Ignore errors
    }
  }
  /**
   * Show warning message
   */
  private showWarning(): void {
    if (!this.config.showWarnings) return;

    // Create a temporary warning message
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #e74c3c;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    warning.textContent = this.config.customWarningMessage || 'Developer tools are disabled in production mode';
    
    document.body.appendChild(warning);
    
    // Remove warning after configured duration
    setTimeout(() => {
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
    }, this.config.warningDuration);
  }
  /**
   * Disable blocking (for development/testing)
   */
  public disableBlocking(): void {
    this.isBlocking = false;
    this.detectionPaused = true;
    this.warningShown = false;
    
    // Remove any existing warnings
    const existingWarning = document.getElementById('dev-tools-warning-overlay');
    if (existingWarning) {
      existingWarning.remove();
    }
    
    console.log('🔓 Developer tools protection disabled');
  }

  /**
   * Re-enable blocking
   */
  public enableBlocking(): void {
    this.isBlocking = true;
    this.detectionPaused = false;
    console.log('🔒 Developer tools protection enabled');
  }

  /**
   * Check if blocking is active
   */
  public isBlockingActive(): boolean {
    return this.isBlocking && !this.detectionPaused;
  }

  /**
   * Get current security status
   */
  public getSecurityStatus(): {
    blocking: boolean;
    paused: boolean;
    warningShown: boolean;
    devToolsOpen: boolean;
  } {
    return {
      blocking: this.isBlocking,
      paused: this.detectionPaused,
      warningShown: this.warningShown,
      devToolsOpen: this.devToolsOpen
    };
  }
}

// Export singleton instance
export const devToolsBlocker = DevToolsBlocker.getInstance();
