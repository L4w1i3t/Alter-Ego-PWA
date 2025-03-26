// Custom event system for ALTER EGO

// Event names
export const EVENTS = {
    VOICE_MODELS_UPDATED: 'voice-models-updated',
  };
  
  // Dispatch an event
  export const dispatchAppEvent = (eventName: string, detail: any = {}) => {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  };