/**
 * Storage-related type definitions
 */

export interface ApiKeys {
  OPENAI_API_KEY: string;
  ELEVENLABS_API_KEY: string;
}

export interface Persona {
  name: string;
  content: string;
  lastModified: string;
}

export interface User {
  id: string;
  name: string;
}
