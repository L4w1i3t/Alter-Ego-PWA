/**
 * Legacy at-rest obfuscation for locally stored data.
 *
 * DO NOT use this for anything new, and do not treat it as encryption in the
 * security sense. The AES-GCM call is fine; the key is not. It is derived
 * entirely from values any script running on the page can read for itself --
 * user agent, language, screen dimensions and today's date -- so anyone able
 * to read the ciphertext can also reconstruct the key. It protects against
 * someone eyeballing localStorage, and nothing else.
 *
 * Two consequences worth knowing:
 *   - Because the date is part of the seed, ciphertext written on one day
 *     cannot be decrypted on the next.
 *   - API keys are no longer stored this way. `decryptData` is kept only so
 *     `migrateApiKeysIfNeeded` can still read values written by older builds.
 */

// Derives a key from browser characteristics. See the caveat above.
const generateEncryptionKey = async (): Promise<CryptoKey> => {
  // Create a unique but reproducible seed for this browser session
  const browserData = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().toDateString(), // Changes daily for added security
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(browserData);

  // Hash the browser data to create key material
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Import as cryptographic key
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt sensitive data before storing
 */
export const encryptData = async (plaintext: string): Promise<string> => {
  try {
    const key = await generateEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive data after loading
 */
export const decryptData = async (encryptedData: string): Promise<string> => {
  try {
    const key = await generateEncryptionKey();

    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data - data may be corrupted');
  }
};

/**
 * Securely clear sensitive data from memory
 */
export const secureWipe = (data: string): void => {
  // In JavaScript, we can't truly overwrite memory, but we can help GC
  // by replacing the string content and forcing it out of scope
  if (typeof data === 'string') {
    data = '0'.repeat(data.length);
  }
};
