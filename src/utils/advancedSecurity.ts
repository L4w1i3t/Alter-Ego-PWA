/**
 * Advanced Security and Developer Tools Protection
 * Additional security measures for production environments
 */

import { SecurityConfig, currentSecurityConfig } from './securityConfig';

export class AdvancedSecurity {
  private static instance: AdvancedSecurity;
  private isEnabled = false;
  private config: SecurityConfig;

  private constructor() {
    this.config = currentSecurityConfig;
  }

  public static getInstance(): AdvancedSecurity {
    if (!AdvancedSecurity.instance) {
      AdvancedSecurity.instance = new AdvancedSecurity();
    }
    return AdvancedSecurity.instance;
  }
  /**
   * Initialize advanced security features for production
   */
  public initialize(): void {
    if (!this.config.blockDevTools) {
      console.log('Advanced security disabled by configuration');
      return;
    }

    this.isEnabled = true;

    if (this.config.disableConsole) {
      this.disableConsoleLogging();
    }

    if (this.config.preventSourceViewing) {
      this.preventSourceViewing();
    }

    if (this.config.enableAntiDebugging) {
      this.addAntiDebugging();
    }

    if (this.config.protectAgainstInjection) {
      this.protectAgainstInjection();
    }

    if (this.config.obfuscateErrors) {
      this.obfuscateErrors();
    }

    console.log('Advanced security features activated');
  }

  /**
   * Completely disable console logging in production
   */
  private disableConsoleLogging(): void {
    if (!this.isEnabled) return;

    // Store original console methods for internal use if needed
    const originalConsole = { ...console };

    // Replace all console methods with no-ops
    Object.keys(console).forEach(method => {
      (console as any)[method] = () => {};
    });

    // Prevent console restoration
    Object.defineProperty(window, 'console', {
      value: console,
      writable: false,
      configurable: false,
    });
  }

  /**
   * Prevent view source and save page
   */
  private preventSourceViewing(): void {
    if (!this.isEnabled) return;

    // Block Ctrl+A (Select All)
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        return false;
      }
    });

    // Disable print functionality
    window.addEventListener('beforeprint', e => {
      e.preventDefault();
      return false;
    });

    // Override window.print
    (window as any).print = () => {
      console.warn('Printing is disabled');
    };
  }

  /**
   * Advanced anti-debugging techniques
   */
  private addAntiDebugging(): void {
    if (!this.isEnabled) return;

    // Continuous debugger statements
    setInterval(() => {
      if (this.isEnabled) {
        try {
          debugger;
        } catch (e) {
          // Ignore errors
        }
      }
    }, 100);

    // Function integrity check
    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;

    // Monitor for function tampering
    setInterval(() => {
      if (
        window.setInterval !== originalSetInterval ||
        window.setTimeout !== originalSetTimeout
      ) {
        this.triggerSecurityBreach();
      }
    }, 1000);

    // Detect dev tools through timing
    let callCount = 0;
    const devToolsChecker = () => {
      const startTime = performance.now();
      debugger;
      const endTime = performance.now();

      if (endTime - startTime > 100) {
        this.triggerSecurityBreach();
      }

      callCount++;
      if (callCount < 1000 && this.isEnabled) {
        setTimeout(devToolsChecker, Math.random() * 1000 + 500);
      }
    };

    setTimeout(devToolsChecker, 1000);
  }

  /**
   * Protect against code injection
   */
  private protectAgainstInjection(): void {
    if (!this.isEnabled) return;

    // Override eval
    (window as any).eval = () => {
      throw new Error('eval is disabled');
    };

    // Override Function constructor
    (window as any).Function = () => {
      throw new Error('Function constructor is disabled');
    };

    // Monitor for script injection
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'SCRIPT') {
                console.warn('Script injection detected');
                element.remove();
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Obfuscate error messages in production
   */
  private obfuscateErrors(): void {
    if (!this.isEnabled) return;

    window.addEventListener('error', event => {
      event.stopImmediatePropagation();
      console.log('An error occurred but details are hidden in production');
      return false;
    });

    window.addEventListener('unhandledrejection', event => {
      event.stopImmediatePropagation();
      event.preventDefault();
      console.log(
        'A promise rejection occurred but details are hidden in production'
      );
    });
  }

  /**
   * Trigger security breach response
   */
  private triggerSecurityBreach(): void {
    // Log the security breach (you might want to send this to your analytics)
    console.warn('Security breach detected');

    // Clear sensitive data
    this.clearSensitiveData();

    // Redirect to a safe page or reload
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  /**
   * Clear sensitive data from memory and storage
   */
  private clearSensitiveData(): void {
    // Clear local storage
    try {
      localStorage.clear();
    } catch (e) {
      // Ignore errors
    }

    // Clear session storage
    try {
      sessionStorage.clear();
    } catch (e) {
      // Ignore errors
    }

    // Clear cookies (if possible)
    try {
      document.cookie.split(';').forEach(c => {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie =
          name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      });
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Disable security features (for development/testing)
   */
  public disable(): void {
    this.isEnabled = false;
  }

  /**
   * Check if security features are enabled
   */
  public isSecurityEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const advancedSecurity = AdvancedSecurity.getInstance();
