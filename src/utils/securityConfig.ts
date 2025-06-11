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
  
  // Response level: 'soft' = warnings only, 'hard' = page replacement
  responseLevel: 'soft' | 'hard';
}

// Default production security configuration
export const productionSecurityConfig: SecurityConfig = {
  // Developer tools blocking
  blockDevTools: true,
  blockKeyboardShortcuts: true,
  blockContextMenu: true,
  blockTextSelection: false, // Less intrusive - allow text selection
  detectDevToolsOpening: true,
  
  // Advanced security
  disableConsole: true,
  preventSourceViewing: true,
  enableAntiDebugging: false, // Disable anti-debugging to avoid Safari issues
  protectAgainstInjection: true,
  obfuscateErrors: true,
  
  // Detection sensitivity
  devToolsDetectionThreshold: 200, // Less sensitive to avoid false positives
  debuggerCheckInterval: 1000, // Less frequent checks
  
  // Warning messages
  showWarnings: true,
  warningDuration: 5000, // Longer display time
  customWarningMessage: 'Developer tools are disabled in production mode',
  
  // Response actions
  clearDataOnBreach: false, // Don't clear data - too aggressive
  reloadOnDetection: false, // Don't auto-reload - prevents endless loop
  
  // Use soft response level for better UX
  responseLevel: 'soft'
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
  reloadOnDetection: false,
  
  // No response in development
  responseLevel: 'soft'
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
  reloadOnDetection: false,
  
  // Soft response for testing
  responseLevel: 'soft'
};

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const env = process.env.NODE_ENV;
  const customConfig = process.env.REACT_APP_SECURITY_CONFIG;
  
  let config: SecurityConfig;
  
  // Allow custom configuration via environment variable
  if (customConfig) {
    try {
      config = JSON.parse(customConfig) as SecurityConfig;
    } catch (e) {
      console.warn('Invalid security configuration in REACT_APP_SECURITY_CONFIG, using defaults');
      config = getDefaultConfigForEnv(env);
    }
  } else {
    config = getDefaultConfigForEnv(env);
  }
  
  // Validate the configuration
  if (!validateSecurityConfig(config)) {
    console.warn('Invalid security configuration detected, using safe defaults');
    config = getDefaultConfigForEnv(env);
  }
  
  return config;
}

/**
 * Get default configuration for environment
 */
function getDefaultConfigForEnv(env: string | undefined): SecurityConfig {
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
