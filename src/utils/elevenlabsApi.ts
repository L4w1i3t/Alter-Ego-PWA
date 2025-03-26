import { loadApiKeys } from './storageUtils';

// Constants
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Interfaces
export interface ElevenlabsVoiceSettings {
  stability: number;
  similarity_boost: number;
}

interface TextToSpeechRequest {
  text: string;
  voice_id: string;
  voice_settings?: ElevenlabsVoiceSettings;
}

/**
 * Convert text to speech using ElevenLabs API
 */
export const textToSpeech = async (
  text: string,
  voiceId: string,
  settings?: Partial<ElevenlabsVoiceSettings>
): Promise<Blob | null> => {
  const { ELEVENLABS_API_KEY } = loadApiKeys();
  
  if (!ELEVENLABS_API_KEY) {
    console.error('ElevenLabs API key is not set');
    throw new Error('ElevenLabs API key is not set');
  }
  
  const endpoint = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`;
  
  // Create a valid voice settings object with default values for any missing properties
  const voiceSettings: ElevenlabsVoiceSettings = {
    stability: settings?.stability ?? 0.5,
    similarity_boost: settings?.similarity_boost ?? 0.5
  };
  
  const payload: TextToSpeechRequest = {
    text,
    voice_id: voiceId,
    voice_settings: voiceSettings
  };
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`ElevenLabs API error: ${error.detail || response.statusText}`);
    }
    
    // The response is audio data
    return await response.blob();
  } catch (error) {
    console.error('Error calling ElevenLabs API:', error);
    throw error;
  }
};

/**
 * Get available voices from ElevenLabs API
 */
export const getVoices = async () => {
  const { ELEVENLABS_API_KEY } = loadApiKeys();
  
  if (!ELEVENLABS_API_KEY) {
    console.error('ElevenLabs API key is not set');
    throw new Error('ElevenLabs API key is not set');
  }
  
  const endpoint = `${ELEVENLABS_API_BASE}/voices`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`ElevenLabs API error: ${error.detail || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting ElevenLabs voices:', error);
    throw error;
  }
};

/**
 * Play audio from a blob
 */
export const playAudio = async (audioBlob: Blob): Promise<void> => {
  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio(url);
  
  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    
    audio.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    
    audio.play().catch(reject);
  });
};