import { loadApiKeys } from './storageUtils';

// Constants
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// TTS Models
export enum ElevenlabsModel {
  ELEVEN_MULTILINGUAL_V2 = 'eleven_multilingual_v2',
  ELEVEN_MONOLINGUAL_V1 = 'eleven_monolingual_v1',
  ELEVEN_TURBO_V2 = 'eleven_turbo_v2',
  ELEVEN_ENGLISH_V2 = 'eleven_english_v2',
}

// Interfaces
export interface ElevenlabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number; // New parameter for style control
  use_speaker_boost: boolean; // New parameter for speaker boost
}

export interface TextToSpeechRequest {
  text: string;
  model_id: string; // Changed from voice_id to support model specification
  voice_id: string;
  voice_settings?: ElevenlabsVoiceSettings;
}

/**
 * Convert text to speech using ElevenLabs API
 */
export const textToSpeech = async (
  text: string,
  voiceId: string,
  settings?: Partial<ElevenlabsVoiceSettings>,
  modelId: string = ElevenlabsModel.ELEVEN_MULTILINGUAL_V2 // Default to multilingual v2
): Promise<Blob | null> => {
  const { ELEVENLABS_API_KEY } = loadApiKeys();

  if (!ELEVENLABS_API_KEY) {
    console.error('ElevenLabs API key is not set');
    throw new Error('ElevenLabs API key is not set');
  }

  const useProxy = (process.env.REACT_APP_USE_PROXY === 'true') ||
    (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app'));
  const endpoint = useProxy
    ? '/api/elevenlabs-tts'
    : `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`;

  // Create a valid voice settings object with default values for any missing properties
  const voiceSettings: ElevenlabsVoiceSettings = {
    stability: settings?.stability ?? 0.5,
    similarity_boost: settings?.similarity_boost ?? 0.5,
    style: settings?.style ?? 0.0, // Default style to neutral (0.0)
    use_speaker_boost: settings?.use_speaker_boost ?? true, // Default speaker boost to true
  };

  const payload: TextToSpeechRequest = {
    text,
    model_id: modelId, // Specify the model ID
    voice_id: voiceId,
    voice_settings: voiceSettings,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: useProxy
        ? { 'Content-Type': 'application/json', 'x-elevenlabs-key': ELEVENLABS_API_KEY }
        : {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
      body: JSON.stringify(
        useProxy ? { voiceId, ...payload } : payload
      ),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `ElevenLabs API error: ${error.detail || response.statusText}`
      );
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

  const useProxy = (process.env.REACT_APP_USE_PROXY === 'true') ||
    (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app'));
  const endpoint = useProxy ? '/api/elevenlabs-voices' : `${ELEVENLABS_API_BASE}/voices`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: useProxy ? { 'x-elevenlabs-key': ELEVENLABS_API_KEY } : { 'xi-api-key': ELEVENLABS_API_KEY },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `ElevenLabs API error: ${error.detail || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting ElevenLabs voices:', error);
    throw error;
  }
};

/**
 * Get available models from ElevenLabs API
 */
export const getModels = async () => {
  const { ELEVENLABS_API_KEY } = loadApiKeys();

  if (!ELEVENLABS_API_KEY) {
    console.error('ElevenLabs API key is not set');
    throw new Error('ElevenLabs API key is not set');
  }

  const useProxy = (process.env.REACT_APP_USE_PROXY === 'true') ||
    (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app'));
  const endpoint = useProxy ? '/api/elevenlabs-models' : `${ELEVENLABS_API_BASE}/models`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: useProxy ? { 'x-elevenlabs-key': ELEVENLABS_API_KEY } : { 'xi-api-key': ELEVENLABS_API_KEY },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `ElevenLabs API error: ${error.detail || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting ElevenLabs models:', error);
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

    audio.onerror = error => {
      URL.revokeObjectURL(url);
      reject(error);
    };

    audio.play().catch(reject);
  });
};
