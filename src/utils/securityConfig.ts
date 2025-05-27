/**
 * Security Configuration
 * Centralized configuration for all security features
 */

export interface SecurityConfig {
  // Developer tools blocking
  blockDevTools: boolean;
  blockKeyboardShortcuts: boolean;
  blockContextMenu: boolean;
  blockTextSelection: boolean;
  detectDevToolsOpening: boolean;
  
  // Advanced security
  disableConsole: boolean;
  preventSourceViewing: boolean;
  enableAntiDebugging: boolean;
  protectAgainstInjection: boolean;
  obfuscateErrors: boolean;
  
  // Detection sensitivity
  devToolsDetectionThreshold: number;
  debuggerCheckInterval: number;
  
  // Warning messages
  showWarnings: boolean;
  warningDuration: number;
  customWarningMessage?: string;
  
  // Response actions
  clearDataOnBreach: boolean;
  reloadOnDetection: boolean;
  redirectUrl?: string;
}

// Default production security configuration
export const productionSecurityConfig: SecurityConfig = {
  // Developer tools blocking
  blockDevTools: true,
  blockKeyboardShortcuts: true,
  blockContextMenu: true,
  blockTextSelection: true,
  detectDevToolsOpening: true,
  
  // Advanced security
  disableConsole: true,
  preventSourceViewing: true,
  enableAntiDebugging: true,
  protectAgainstInjection: true,
  obfuscateErrors: true,
  
  // Detection sensitivity
  devToolsDetectionThreshold: 160,
  debuggerCheckInterval: 500,
  
  // Warning messages
  showWarnings: true,
  warningDuration: 3000,
  customWarningMessage: 'Developer tools are disabled in production mode',
  
  // Response actions
  clearDataOnBreach: true,
  reloadOnDetection: true
};

// Development security configuration (minimal security for testing)
export const developmentSecurityConfig: SecurityConfig = {
  // Developer tools blocking
  blockDevTools: false,
  blockKeyboardShortcuts: false,
  blockContextMenu: false,
  blockTextSelection: false,
  detectDevToolsOpening: false,
  
  // Advanced security
  disableConsole: false,
  preventSourceViewing: false,
  enableAntiDebugging: false,
  protectAgainstInjection: false,
  obfuscateErrors: false,
  
  // Detection sensitivity
  devToolsDetectionThreshold: 160,
  debuggerCheckInterval: 1000,
  
  // Warning messages
  showWarnings: false,
  warningDuration: 2000,
  
  // Response actions
  clearDataOnBreach: false,
  reloadOnDetection: false
};

// Testing security configuration (moderate security for staging)
export const testingSecurityConfig: SecurityConfig = {
  // Developer tools blocking
  blockDevTools: true,
  blockKeyboardShortcuts: true,
  blockContextMenu: false, // Allow for testing
  blockTextSelection: false, // Allow for testing
  detectDevToolsOpening: true,
  
  // Advanced security
  disableConsole: false, // Allow console for debugging
  preventSourceViewing: false,
  enableAntiDebugging: false,
  protectAgainstInjection: true,
  obfuscateErrors: false,
  
  // Detection sensitivity
  devToolsDetectionThreshold: 200, // Less sensitive
  debuggerCheckInterval: 1000,
  
  // Warning messages
  showWarnings: true,
  warningDuration: 2000,
  customWarningMessage: 'Developer tools access is limited in testing mode',
  
  // Response actions
  clearDataOnBreach: false,
  reloadOnDetection: false
};

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const env = process.env.NODE_ENV;
  const customConfig = process.env.REACT_APP_SECURITY_CONFIG;
  
  // Allow custom configuration via environment variable
  if (customConfig) {
    try {
      return JSON.parse(customConfig) as SecurityConfig;
    } catch (e) {
      console.warn('Invalid security configuration in REACT_APP_SECURITY_CONFIG, using defaults');
    }
  }
  
  switch (env) {
    case 'production':
      return productionSecurityConfig;
    case 'test':
    case 'staging':
      return testingSecurityConfig;
    case 'development':
    default:
      return developmentSecurityConfig;
  }
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): boolean {
  // Basic validation
  if (typeof config.devToolsDetectionThreshold !== 'number' || 
      config.devToolsDetectionThreshold < 0) {
    console.error('Invalid devToolsDetectionThreshold in security config');
    return false;
  }
  
  if (typeof config.debuggerCheckInterval !== 'number' || 
      config.debuggerCheckInterval < 100) {
    console.error('Invalid debuggerCheckInterval in security config');
    return false;
  }
  
  if (typeof config.warningDuration !== 'number' || 
      config.warningDuration < 1000) {
    console.error('Invalid warningDuration in security config');
    return false;
  }
  
  return true;
}

// Export the current configuration
export const currentSecurityConfig = getSecurityConfig();
