/**
 * Developer Tools Blocker Utility - Mobile-Friendly Version
 * Only blocks access to browser developer tools (F12, inspect) without interfering
 * with normal mobile functionality like keyboards, copy/paste, etc.
 */

import { SecurityConfig, currentSecurityConfig } from './securityConfig';

export class DevToolsBlocker {
  private static instance: DevToolsBlocker;
  private isBlocking = false;
  private devToolsOpen = false;
  private config: SecurityConfig;
  private warningShown = false;
  private detectionPaused = false;
  private isMobile = false;

  private constructor() {
    this.config = currentSecurityConfig;
    this.isMobile = this.detectMobileDevice();
  }

  public static getInstance(): DevToolsBlocker {
    if (!DevToolsBlocker.instance) {
      DevToolsBlocker.instance = new DevToolsBlocker();
    }
    return DevToolsBlocker.instance;
  }

  /**
   * Detect if we're on a mobile device
   */
  private detectMobileDevice(): boolean {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (window.screen.width <= 768 && window.screen.height <= 1024)
    );
  }

  /**
   * Initialize dev tools blocking with mobile-friendly approach
   */
  public initializeBlocking(): void {
    if (!this.config.blockDevTools) {
      console.log('Dev tools blocking disabled by configuration');
      return;
    }

    this.isBlocking = true;

    // Only block specific desktop dev tools shortcuts
    this.blockDevToolsShortcuts();

    // Only block right-click on desktop (not mobile)
    if (!this.isMobile && this.config.blockContextMenu) {
      this.blockContextMenuDesktopOnly();
    }

    // Detect dev tools opening (less aggressive on mobile)
    if (this.config.detectDevToolsOpening) {
      this.detectDevToolsOpening();
    }

    // Add emergency disable sequence
    this.addEmergencyDisable();

    console.log(
      `Developer tools blocking activated (Mobile: ${this.isMobile})`
    );
  }

  /**
   * Block only specific developer tools keyboard shortcuts (mobile-friendly)
   */
  private blockDevToolsShortcuts(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!this.isBlocking) return;

      // Don't block on mobile devices at all - they need keyboard functionality
      if (this.isMobile) return;

      // Only block specific F12 and inspect shortcuts, not general shortcuts
      let shouldBlock = false;
      let shortcutName = '';

      // F12 (most common dev tools shortcut)
      if (event.key === 'F12') {
        shouldBlock = true;
        shortcutName = 'F12';
      }
      // Ctrl+Shift+I (Inspector) - desktop only
      else if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        shouldBlock = true;
        shortcutName = 'Ctrl+Shift+I';
      }
      // Ctrl+Shift+J (Console) - desktop only
      else if (event.ctrlKey && event.shiftKey && event.key === 'J') {
        shouldBlock = true;
        shortcutName = 'Ctrl+Shift+J';
      }
      // Ctrl+Shift+C (Element selector) - desktop only
      else if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        shouldBlock = true;
        shortcutName = 'Ctrl+Shift+C';
      }
      // Ctrl+U (View source) - desktop only
      else if (event.ctrlKey && event.key === 'u') {
        shouldBlock = true;
        shortcutName = 'Ctrl+U';
      }

      if (shouldBlock) {
        event.preventDefault();
        event.stopPropagation();
        this.showMobileWarning(`${shortcutName} is disabled`);
        return false;
      }

      // DON'T block other shortcuts like:
      // - Ctrl+C/V/X (copy/paste/cut) - essential for mobile
      // - Ctrl+A (select all) - essential for mobile
      // - Ctrl+Z (undo) - essential for mobile
      // - Ctrl+S (save) - some apps use this legitimately
      // - Any single key presses that might be mobile keyboard input
    });
  }

  /**
   * Block context menu only on desktop (not mobile)
   */
  private blockContextMenuDesktopOnly(): void {
    document.addEventListener('contextmenu', (event: MouseEvent) => {
      if (!this.isBlocking || this.isMobile) return;

      // Only block right-click on desktop
      event.preventDefault();
      event.stopPropagation();
      this.showMobileWarning('Right-click is disabled');
      return false;
    });
  }

  /**
   * Show a brief, non-intrusive warning (mobile-friendly)
   */
  private showMobileWarning(message: string): void {
    // Create a small toast notification instead of blocking overlay
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      z-index: 999999;
      transition: opacity 0.3s ease;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Auto-remove after 2 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 2000);
  }

  /**
   * Add emergency disable sequence for support/debugging purposes
   */
  private addEmergencyDisable(): void {
    // Only enable on desktop - mobile keyboards make this impractical
    if (this.isMobile) return;

    const konamiCode = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA',
    ];
    let konamiIndex = 0;

    document.addEventListener('keydown', event => {
      if (event.code === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          const confirmed = confirm(
            'Do you want to disable developer tools protection? This should only be used for support purposes.'
          );
          if (confirmed) {
            this.disableBlocking();
            this.showMobileWarning(
              'Developer tools protection disabled for this session'
            );
          }
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    });
  }

  /**
   * Detect when developer tools are opened (mobile-friendly approach)
   */
  private detectDevToolsOpening(): void {
    // Skip aggressive detection on mobile devices
    if (this.isMobile) {
      console.log('Dev tools detection disabled on mobile devices');
      return;
    }

    const threshold = this.config.devToolsDetectionThreshold;
    const interval = this.config.debuggerCheckInterval;

    // Only use window size detection - safer and less invasive
    let detectionCount = 0;
    const requiredDetections = 2;

    setInterval(() => {
      if (!this.isBlocking || this.detectionPaused) return;

      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold =
        window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        detectionCount++;
        if (detectionCount >= requiredDetections && !this.devToolsOpen) {
          this.devToolsOpen = true;
          this.handleDevToolsDetected();
        }
      } else {
        detectionCount = Math.max(0, detectionCount - 1); // Gradually decrease
        if (detectionCount === 0) {
          this.devToolsOpen = false;
        }
      }
    }, interval);
  }

  /**
   * Handle when developer tools are detected (mobile-friendly)
   */
  private handleDevToolsDetected(): void {
    if (this.warningShown || this.detectionPaused || this.isMobile) {
      return;
    }

    // Use soft warning approach only
    this.showSoftDevToolsWarning();
  }

  /**
   * Show a non-intrusive dev tools warning
   */
  private showSoftDevToolsWarning(): void {
    if (this.warningShown) return;
    this.warningShown = true;

    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(231, 76, 60, 0.9);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 90vw;
    `;

    warning.innerHTML = `
      <div style="margin-bottom: 8px;">⚠️ Developer Tools Detected</div>
      <div style="font-size: 12px; opacity: 0.9;">Please close dev tools for optimal experience</div>
    `;

    document.body.appendChild(warning);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.style.opacity = '0';
        warning.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          if (warning.parentNode) {
            warning.parentNode.removeChild(warning);
          }
        }, 300);
      }
      this.warningShown = false;
    }, 5000);
  }

  /**
   * Disable blocking (public method for emergency use)
   */
  public disableBlocking(): void {
    this.isBlocking = false;
    this.detectionPaused = true;
    console.log('🔓 Developer tools blocking has been disabled');
  }

  /**
   * Enable blocking
   */
  public enableBlocking(): void {
    this.isBlocking = true;
    this.detectionPaused = false;
    console.log('🔒 Developer tools blocking has been enabled');
  }

  /**
   * Check if blocking is currently active
   */
  public isBlockingActive(): boolean {
    return this.isBlocking && !this.detectionPaused;
  }

  /**
   * Check if we're on a mobile device (public method)
   */
  public isMobileDevice(): boolean {
    return this.isMobile;
  }

  /**
   * Get current configuration
   */
  public getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Check if dev tools are currently detected as open
   */
  public areDevToolsOpen(): boolean {
    return this.devToolsOpen;
  }

  /**
   * Get current blocking status
   */
  public getStatus(): {
    isBlocking: boolean;
    devToolsOpen: boolean;
    detectionPaused: boolean;
    isMobile: boolean;
  } {
    return {
      isBlocking: this.isBlocking,
      devToolsOpen: this.devToolsOpen,
      detectionPaused: this.detectionPaused,
      isMobile: this.isMobile,
    };
  }
}

// Export singleton instance
export const devToolsBlocker = DevToolsBlocker.getInstance();
