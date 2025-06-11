/**
 * Security Configuration Migration Script
 * Run this to update security settings to the new improved defaults
 */

import { SecurityConfig } from './securityConfig';

/**
 * Migrate from old aggressive settings to new user-friendly settings
 */
export function migrateSecurityConfig(oldConfig: SecurityConfig): SecurityConfig {
  const migratedConfig: SecurityConfig = {
    ...oldConfig,
    
    // Improve user experience
    blockTextSelection: false,           // Allow text selection
    enableAntiDebugging: false,          // Prevent Safari issues
    devToolsDetectionThreshold: Math.max(oldConfig.devToolsDetectionThreshold, 200),
    debuggerCheckInterval: Math.max(oldConfig.debuggerCheckInterval, 1000),
    
    // Reduce aggressiveness
    clearDataOnBreach: false,            // Don't clear user data
    reloadOnDetection: false,            // No automatic refreshes
    warningDuration: Math.max(oldConfig.warningDuration, 5000),
    
    // Add new settings with safe defaults
    responseLevel: 'soft' as const
  };

  return migratedConfig;
}

/**
 * Check if current config needs migration
 */
export function needsMigration(config: SecurityConfig): boolean {
  return (
    config.enableAntiDebugging === true ||
    config.clearDataOnBreach === true ||
    config.reloadOnDetection === true ||
    config.devToolsDetectionThreshold < 200 ||
    !('responseLevel' in config)
  );
}

/**
 * Apply migration if needed
 */
export function autoMigrateIfNeeded(config: SecurityConfig): SecurityConfig {
  if (needsMigration(config)) {
    console.log('🔄 Migrating security configuration to improved settings...');
    const migrated = migrateSecurityConfig(config);
    console.log('✅ Security configuration migration complete');
    return migrated;
  }
  return config;
}

/**
 * Get recommended settings for different environments
 */
export function getRecommendedConfig(environment: 'development' | 'testing' | 'production'): Partial<SecurityConfig> {
  switch (environment) {
    case 'development':
      return {
        blockDevTools: false,
        showWarnings: false,
        responseLevel: 'soft'
      };
      
    case 'testing':
      return {
        blockDevTools: true,
        blockKeyboardShortcuts: true,
        blockContextMenu: false,
        showWarnings: true,
        responseLevel: 'soft',
        clearDataOnBreach: false,
        reloadOnDetection: false
      };
      
    case 'production':
      return {
        blockDevTools: true,
        blockKeyboardShortcuts: true,
        blockContextMenu: true,
        blockTextSelection: false,
        enableAntiDebugging: false,
        devToolsDetectionThreshold: 200,
        debuggerCheckInterval: 1000,
        responseLevel: 'soft',
        clearDataOnBreach: false,
        reloadOnDetection: false,
        warningDuration: 5000
      };
      
    default:
      return {};
  }
}
