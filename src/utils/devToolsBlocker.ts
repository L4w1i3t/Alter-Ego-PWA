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

  private constructor() {
    this.config = currentSecurityConfig;
  }

  public static getInstance(): DevToolsBlocker {
    if (!DevToolsBlocker.instance) {
      DevToolsBlocker.instance = new DevToolsBlocker();
    }
    return DevToolsBlocker.instance;
  }
  /**
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
    
    console.log('Developer tools blocking activated for production');
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
  }
  /**
   * Detect when developer tools are opened
   */
  private detectDevToolsOpening(): void {
    const threshold = this.config.devToolsDetectionThreshold;
    const interval = this.config.debuggerCheckInterval;

    // Method 1: Window size detection
    setInterval(() => {
      if (!this.isBlocking) return;

      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!this.devToolsOpen) {
          this.devToolsOpen = true;
          this.handleDevToolsDetected();
        }
      } else {
        this.devToolsOpen = false;
      }
    }, interval);

    // Method 2: Console object detection
    let devtools: { open: boolean; orientation: string | null } = { open: false, orientation: null };
    setInterval(() => {
      if (!this.isBlocking) return;

      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.handleDevToolsDetected();
        }
      } else {
        devtools.open = false;
      }
    }, interval);

    // Method 3: Debugger statement detection (only if anti-debugging is enabled)
    if (this.config.enableAntiDebugging) {
      setInterval(() => {
        if (!this.isBlocking) return;
        
        const start = performance.now();
        debugger; // This will pause if dev tools are open
        const end = performance.now();
        
        if (end - start > 100) {
          this.handleDevToolsDetected();
        }
      }, 1000);
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
  }
  /**
   * Handle when developer tools are detected
   */
  private handleDevToolsDetected(): void {
    if (this.config.redirectUrl) {
      window.location.href = this.config.redirectUrl;
      return;
    }

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
    
    // Clear sensitive data if configured
    if (this.config.clearDataOnBreach) {
      this.clearSensitiveData();
    }
    
    // Redirect after a delay if configured
    if (this.config.reloadOnDetection) {
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
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
  }

  /**
   * Check if blocking is active
   */
  public isBlockingActive(): boolean {
    return this.isBlocking;
  }
}

// Export singleton instance
export const devToolsBlocker = DevToolsBlocker.getInstance();
