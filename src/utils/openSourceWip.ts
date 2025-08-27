/**
 * Open Source Model Work in Progress Utility
 *
 * This utility manages the "Work in Progress" functionality for the Open Source model selection.
 * The Open Source model buttons remain visible but are non-functional, displaying appropriate
 * WIP messages when selected.
 */

import { showWarning } from '../components/Common/NotificationManager';

export interface OpenSourceWipConfig {
  enabled: boolean;
  wipMessage: string;
  fallbackMessage: string;
  allowSelection: boolean;
}

const DEFAULT_WIP_CONFIG: OpenSourceWipConfig = {
  enabled: false, // Disabled by default now that we have a backend
  wipMessage:
    '🚧 Open Source model is currently under development. Please use OpenAI for now.',
  fallbackMessage:
    'The Open Source language model is not yet available. Redirecting to OpenAI...',
  allowSelection: true, // Allow selection since we have a working backend
};

/**
 * Get the current WIP configuration
 */
export const getWipConfig = (): OpenSourceWipConfig => {
  try {
    const configStr = localStorage.getItem('alterEgo_openSourceWip');
    if (!configStr) return DEFAULT_WIP_CONFIG;

    const config = JSON.parse(configStr);
    return { ...DEFAULT_WIP_CONFIG, ...config };
  } catch (error) {
    console.error('Error loading Open Source WIP config:', error);
    return DEFAULT_WIP_CONFIG;
  }
};

/**
 * Save WIP configuration
 */
export const saveWipConfig = (config: Partial<OpenSourceWipConfig>): void => {
  try {
    const currentConfig = getWipConfig();
    const updatedConfig = { ...currentConfig, ...config };
    localStorage.setItem(
      'alterEgo_openSourceWip',
      JSON.stringify(updatedConfig)
    );
  } catch (error) {
    console.error('Error saving Open Source WIP config:', error);
  }
};

/**
 * Check if Open Source model is currently in WIP mode
 */
export const isOpenSourceWip = (): boolean => {
  const config = getWipConfig();
  return config.enabled;
};

/**
 * Handle Open Source model selection attempt
 * Returns true if selection should proceed, false if blocked
 */
export const handleOpenSourceSelection = (): boolean => {
  const config = getWipConfig();

  if (!config.enabled) {
    return true; // WIP mode disabled, allow normal selection
  }

  // Show WIP notification
  showWarning(config.wipMessage, { duration: 5000 });

  // WIP mode enabled, block selection
  return config.allowSelection;
};

/**
 * Check if the current selected model is Open Source and show fallback message
 */
export const checkOpenSourceFallback = (
  selectedModel: string
): string | null => {
  const config = getWipConfig();

  if (selectedModel === 'Open Source' && config.enabled) {
    return config.fallbackMessage;
  }

  return null;
};

/**
 * Get WIP indicator text for UI display
 */
export const getWipIndicatorText = (): string => {
  const config = getWipConfig();
  return config.enabled ? '🚧 Work in Progress' : '';
};

/**
 * Get status message for Open Source model
 */
export const getOpenSourceStatus = (): {
  isWip: boolean;
  statusText: string;
  statusColor: string;
} => {
  const config = getWipConfig();

  if (config.enabled) {
    return {
      isWip: true,
      statusText: 'Work in Progress',
      statusColor: '#ff6b00', // Orange color for WIP
    };
  }

  return {
    isWip: false,
    statusText: 'Available',
    statusColor: '#0f0', // Green color for available
  };
};
