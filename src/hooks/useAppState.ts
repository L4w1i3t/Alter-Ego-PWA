/**
 * Custom hook for managing main app state
 * Extracts state management logic from App.tsx
 */

import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '../utils/storageUtils';
import { applySettingsToCssVariables } from '../styles/GlobalStyles';

export interface AppState {
  showSettings: boolean;
  settingsInitialView: 'default' | 'personas' | 'models' | 'voices' | 'memory' | 'apiKeys' | 'OpenSourceWipInfo' | null;
  showModelSelection: boolean;
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
  setShowModelSelection: (show: boolean) => void;
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
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [showWarmingUp, setShowWarmingUp] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);

  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [activeCharacter, setActiveCharacter] = useState('ALTER EGO');
  const [currentPersonaContent, setCurrentPersonaContent] = useState('');
  const [voiceModel, setVoiceModel] = useState('None');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Initialize state from settings on mount
  useEffect(() => {
    const settings = loadSettings();
    
    if (settings.selectedModel) {
      setSelectedModel(settings.selectedModel);
    } else {
      setShowModelSelection(true);
    }
    
    if (settings.activeCharacter) {
      setActiveCharacter(settings.activeCharacter);
    }
    
    if (settings.voiceModel) {
      setVoiceModel(settings.voiceModel);
    }

    // Apply CSS variables from settings
    applySettingsToCssVariables();
  }, []);

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
    showModelSelection,
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
    setShowModelSelection,
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
