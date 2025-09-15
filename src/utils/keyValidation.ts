/**
 * Enhanced API key validation and security utilities
 */

import { ApiKeys } from './storageUtils';

interface KeyValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate OpenAI API key format and check if it's likely valid
 */
export const validateOpenAIKey = async (key: string): Promise<KeyValidationResult> => {
  if (!key) {
    return { valid: false, error: 'API key is required' };
  }

  // Basic format validation
  if (!key.startsWith('sk-')) {
    return { valid: false, error: 'OpenAI API key must start with "sk-"' };
  }

  // Character validation (should only contain alphanumeric, hyphens, underscores)
  const validCharPattern = /^sk-[a-zA-Z0-9_-]+$/;
  if (!validCharPattern.test(key)) {
    return { 
      valid: false, 
      error: 'API key contains invalid characters' 
    };
  }

  // Test the key with a lightweight API call
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      return { valid: false, error: 'API key is invalid or expired' };
    }

    if (response.status === 429) {
      return { 
        valid: true, 
        warnings: ['API key appears valid but rate limited. You may need to add billing information.'] 
      };
    }

    // Some accounts may receive 403 when the key exists but lacks entitlements/permissions
    if (response.status === 403) {
      return {
        valid: true,
        warnings: ['Key accepted but lacks required permissions or entitlements. Check billing, project access, or model availability.']
      };
    }

    if (!response.ok) {
      return { 
        valid: false, 
        error: `API validation failed: ${response.status} ${response.statusText}` 
      };
    }

    // Check if the key has sufficient permissions
    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      return { 
        valid: false, 
        error: 'API key has insufficient permissions or unexpected response format' 
      };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: 'Unable to validate API key - please check your internet connection' 
    };
  }
};

/**
 * Validate ElevenLabs API key
 */
export const validateElevenLabsKey = async (key: string): Promise<KeyValidationResult> => {
  if (!key) {
    return { valid: true }; // ElevenLabs key is optional
  }

  // Basic format validation (ElevenLabs keys typically start with letters/numbers)
  if (key.length < 10) {
    return { 
      valid: false, 
      error: 'ElevenLabs API key appears too short' 
    };
  }

  // Test the key with a lightweight API call
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      return { valid: false, error: 'ElevenLabs API key is invalid' };
    }

    if (response.status === 429) {
      return { 
        valid: true, 
        warnings: ['ElevenLabs API key appears valid but rate limited.'] 
      };
    }

    if (!response.ok) {
      return { 
        valid: false, 
        error: `ElevenLabs API validation failed: ${response.status}` 
      };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: 'Unable to validate ElevenLabs API key - please check your internet connection' 
    };
  }
};

/**
 * Check if API keys might be compromised (very basic patterns)
 */
export const checkForCompromisedKeys = (keys: ApiKeys): string[] => {
  const warnings: string[] = [];

  // Check for commonly leaked test keys or examples
  const suspiciousPatterns = [
    'test', 'demo', 'example', 'sample', 'placeholder',
    '123456', 'abcdef', 'xxxxxx'
  ];

  Object.entries(keys).forEach(([keyType, keyValue]) => {
    if (keyValue) {
      const lowerKey = keyValue.toLowerCase();
      suspiciousPatterns.forEach(pattern => {
        if (lowerKey.includes(pattern)) {
          warnings.push(`${keyType} appears to contain placeholder text. Please use a real API key.`);
        }
      });
    }
  });

  return warnings;
};

/**
 * Sanitize API key for logging (show only first 8 and last 4 characters)
 */
export const sanitizeKeyForLogging = (key: string): string => {
  if (!key || key.length < 12) {
    return '[INVALID_KEY]';
  }
  
  const start = key.substring(0, 8);
  const end = key.substring(key.length - 4);
  const middle = '*'.repeat(Math.max(4, key.length - 12));
  
  return `${start}${middle}${end}`;
};

/**
 * Estimate API key security strength
 */
export const assessKeyStrength = (key: string): {
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
} => {
  const issues: string[] = [];
  
  if (key.length < 40) {
    issues.push('Key appears shorter than expected');
  }
  
  // Check for obvious patterns
  if (/(.)\1{3,}/.test(key)) {
    issues.push('Key contains repeated character patterns');
  }
  
  if (/123|abc|qwe/i.test(key)) {
    issues.push('Key contains sequential patterns');
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'strong';
  if (issues.length > 2) {
    strength = 'weak';
  } else if (issues.length > 0) {
    strength = 'medium';
  }
  
  return { strength, issues };
};
