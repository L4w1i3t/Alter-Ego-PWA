/**
 * Custom hook for managing main app state
 * Extracts state management logic from App.tsx
 */

import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '../utils/storageUtils';
import { applySettingsToCssVariables } from '../styles/GlobalStyles';

export interface AppState {
  showSettings: boolean;
  settingsInitialView: 'default' | 'personas' | 'models' | 'voices' | 'memory' | 'apiKeys' | 'AI Models' | 'Manage API Keys' | 'OpenSourceWipInfo' | null;
  showSplashScreen: boolean;
  showWarmingUp: boolean;
  showCharacterSelector: boolean;
  selectedModel: string | null;
  activeCharacter: string;
  currentPersonaContent: string;
  voiceModel: string;
  isFirstLoad: boolean;
  currentAudio: HTMLAudioElement | null;
}

export interface AppActions {
  setShowSettings: (show: boolean) => void;
  setSettingsInitialView: (view: AppState['settingsInitialView']) => void;
  setShowSplashScreen: (show: boolean) => void;
  setShowWarmingUp: (show: boolean) => void;
  setShowCharacterSelector: (show: boolean) => void;
  setSelectedModel: (model: string | null) => void;
  setActiveCharacter: (character: string) => void;
  setCurrentPersonaContent: (content: string) => void;
  setVoiceModel: (model: string) => void;
  setIsFirstLoad: (isFirst: boolean) => void;
  setCurrentAudio: (audio: HTMLAudioElement | null) => void;
}

export function useAppState() {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<
    AppState['settingsInitialView']
  >(null);
  const [showSplashScreen, setShowSplashScreen] = useState(false);
  const [showWarmingUp, setShowWarmingUp] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);

  // Read settings once synchronously so the initial render already has the
  // correct persona/model — avoids a two-phase settle that downstream
  // components (MainContent) would misinterpret as a persona change.
  const [initialSettings] = useState(() => loadSettings());

  const [selectedModel, setSelectedModel] = useState<string | null>(
    initialSettings.selectedModel || null,
  );
  const [activeCharacter, setActiveCharacter] = useState(
    initialSettings.activeCharacter || 'ALTER EGO',
  );
  const [currentPersonaContent, setCurrentPersonaContent] = useState('');
  const [voiceModel, setVoiceModel] = useState(
    initialSettings.voiceModel || 'None',
  );
  const [isFirstLoad, setIsFirstLoad] = useState(
    !initialSettings.hasCompletedFirstStartup,
  );
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // The heavy state (selectedModel, activeCharacter, voiceModel) is already
  // seeded from initialSettings above, so these setters are no-ops on the
  // first render.  We still run the effect for side-effects like showing the
  // model-selection dialog and applying CSS vars.
  useEffect(() => {
    if (!initialSettings.hasCompletedFirstStartup) {
      setShowSplashScreen(true);
    }

    // Apply CSS variables from settings
    applySettingsToCssVariables();
  }, [initialSettings]);

  // Save settings whenever relevant state changes
  useEffect(() => {
    if (!isFirstLoad) {
      const currentSettings = loadSettings();
      saveSettings({
        ...currentSettings,
        selectedModel,
        activeCharacter,
        voiceModel,
      });
    }
  }, [selectedModel, activeCharacter, voiceModel, isFirstLoad]);

  const state: AppState = {
    showSettings,
    settingsInitialView,
    showSplashScreen,
    showWarmingUp,
    showCharacterSelector,
    selectedModel,
    activeCharacter,
    currentPersonaContent,
    voiceModel,
    isFirstLoad,
    currentAudio,
  };

  const actions: AppActions = {
    setShowSettings,
    setSettingsInitialView,
    setShowSplashScreen,
    setShowWarmingUp,
    setShowCharacterSelector,
    setSelectedModel,
    setActiveCharacter,
    setCurrentPersonaContent,
    setVoiceModel,
    setIsFirstLoad,
    setCurrentAudio,
  };

  return { state, actions };
}
