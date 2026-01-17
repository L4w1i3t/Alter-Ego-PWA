import React, { useState, useEffect, Suspense, lazy } from 'react';
import styled from 'styled-components';
import Header from './Header/Header';
import QuerySection from './Sections/QuerySection';
import MainContent from './Sections/MainContent';
import Footer from './Footer/Footer';
import { logger } from '../utils/logger';
import { useAppState } from '../hooks/useAppState';
import DevToolsMetrics from './DevTools/DevToolsMetrics';
const Settings = lazy(() => import('./Settings/Settings'));
const ModelSelection = lazy(() => import('./Sections/ModelSelection'));
const WarmingUp = lazy(() => import('./Sections/WarmingUp'));
const CharacterSelector = lazy(() => import('./Sections/CharacterSelector'));
import NotificationManager from './Common/NotificationManager';
import { useApi } from '../context/ApiContext';
import { GlobalStyles } from '../styles/GlobalStyles';
import { applySettingsToCssVariables } from '../styles/GlobalStyles';
import '../styles/mobile.css';
import { EVENTS } from '../config/constants';
import {
  loadSettings,
  saveSettings,
  loadPersonas,
  getPersona,
  loadVoiceModels,
  loadApiKeys,
  migrateApiKeysIfNeeded,
} from '../utils/storageUtils';
import { textToSpeech, playAudio } from '../utils/elevenlabsApi';
import { getTokenUsageStats } from '../utils/openaiApi';
import { exportDatabaseContent } from '../memory/longTermDB';
import {
  initPerformanceMonitoring,
  markEvent,
  startTimer,
  endTimer,
  generateReport,
  setMetricsEnabled,
  triggerPerformanceReport,
  isPerformanceMonitoringEnabled,
  clearPerformanceData,
} from '../utils/performanceMetrics';

// Styled components for main app layout
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #000;
  color: #0f0;
  font-family: monospace, 'Courier New', Courier;
  overflow: hidden;

  @media (max-width: 768px) {
    min-height: 100vh;
    min-height: -webkit-fill-available; /* iOS Safari fix */
    overflow-x: hidden;
    overflow-y: auto;
    width: 100%;
    max-width: 100vw;
  }
`;

const App: React.FC = () => {
  const { setCurrentPersona } = useApi();

  // Log mounting for debugging
  useEffect(() => {
    logger.debug('App component mounted');

    // Capture reload events
    const beforeUnloadHandler = () => {
      logger.debug('Page is about to reload/unload');
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);

    return () => {
      logger.debug('App component unmounting');
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, []);

  // Use centralized app state hook
  const { state, actions } = useAppState();
  const {
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
  } = state;
  const {
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
  } = actions;

  // Performance monitoring state
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [showDevTools, setShowDevTools] = useState(isDevelopment);
  const [devToolsCollapsed, setDevToolsCollapsed] = useState(false);

  // Apply CSS variables for typography/spacing based on settings
  useEffect(() => {
    const apply = () => {
      applySettingsToCssVariables();
      const s = loadSettings();
      const overall = s.overallTextScale ?? 1;
      const response = s.responseTextScale ?? 1;
      const effective = overall !== 1 ? overall : response;
      document.documentElement.style.setProperty(
        '--ae-response-effective-scale', String(Math.min(2, Math.max(0.8, effective)))
      );
    };
    apply();
    const handler = () => apply();
    window.addEventListener(EVENTS.SETTINGS_UPDATED, handler as any);
    return () => window.removeEventListener(EVENTS.SETTINGS_UPDATED, handler as any);
  }, []);

  // Voice synthesis utilities
  const sanitizeForVoice = (s: string): string => {
    try {
      // Remove emoji/pictographs and common emoticons to avoid TTS reading them
      const noEmoji = s.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
      return noEmoji.replace(/(:\)|;\)|:\(|:D|XD|xD|:\]|;\]|:\}|<3|:\/|:\\\(|\^_\^|¯\\_\(ツ\)_\/¯)/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    } catch {
      // Fallback: strip common surrogate pair range for emojis
      return s
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
        .trim();
    }
  };

  const synthesizeVoice = async (text: string, voicemodel_id: string) => {
    if (voicemodel_id === 'None' || !text) return;

    // Ensure TTS never receives emojis/emoji-like tokens
    const cleanText = sanitizeForVoice(text);

    // Stop any currently playing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // Stop any currently playing ElevenLabs audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    logger.debug('Synthesizing voice with model ID:', voicemodel_id);

    const models = loadVoiceModels();
    logger.debug('Available voice models:', Object.keys(models));

    const model = models[voicemodel_id];
    logger.debug('Selected model:', model);    if (!model) {
      logger.warn('Voice model not found:', voicemodel_id);
      return;
    }

    try {
      if (model.provider === 'browser') {
        // Use browser's built-in speech synthesis
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Set the specific voice if one is configured
        if (model.voiceId) {
          let voices = window.speechSynthesis.getVoices();
          
          // If voices array is empty, try to load them
          if (voices.length === 0) {
            // Wait for voices to load
            await new Promise<void>((resolve) => {
              if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = () => {
                  voices = window.speechSynthesis.getVoices();
                  resolve();
                };
              } else {
                // Fallback timeout
                setTimeout(() => {
                  voices = window.speechSynthesis.getVoices();
                  resolve();
                }, 100);
              }
            });
          }
          
          logger.debug('Available voices:', voices.map(v => ({ name: v.name, uri: v.voiceURI })));
          logger.debug('Looking for voice with ID:', model.voiceId);
          
          const selectedVoice = voices.find(
            v => v.voiceURI === model.voiceId
          );
          
          if (selectedVoice) {
            logger.debug('Selected voice:', selectedVoice.name);
            utterance.voice = selectedVoice;
          } else {
            logger.warn('Voice not found, using default. Available voices:', voices.length);
          }
        }
        
        window.speechSynthesis.speak(utterance);
      } else if (model.provider === 'elevenlabs') {
        try {
          // Get API key and make sure it exists
          const { ELEVENLABS_API_KEY } = loadApiKeys();
          if (!ELEVENLABS_API_KEY) {
            throw new Error('ElevenLabs API key is not set');
          }

          // Call ElevenLabs API with proper settings
          const audioBlob = await textToSpeech(
            cleanText,
            model.voiceId || 'eleven_multilingual_v2',
            model.settings || { stability: 0.5, similarity_boost: 0.5 }
          );

          if (audioBlob) {
            // Create and track the audio element for interruption capability
            const url = URL.createObjectURL(audioBlob);
            const audio = new Audio(url);
            setCurrentAudio(audio);

            // Set up event handlers
            audio.onended = () => {
              URL.revokeObjectURL(url);
              setCurrentAudio(null);
            };

            audio.onerror = (error) => {
              logger.error('Audio playback error:', error);
              URL.revokeObjectURL(url);
              setCurrentAudio(null);
            };

            // Play the audio
            try {
              await audio.play();
            } catch (playError) {
              logger.error('Audio play error:', playError);
              URL.revokeObjectURL(url);
              setCurrentAudio(null);
            }
          }
        } catch (apiError) {
          logger.error('Error with ElevenLabs API:', apiError);
          // Fall back to browser speech synthesis on error
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.text = `ElevenLabs error. Fallback voice: ${text}`;
          
          // Try to use the same voice selection logic for fallback
          if (model.voiceId) {
            let voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
              // Wait for voices to load
              await new Promise<void>((resolve) => {
                if (window.speechSynthesis.onvoiceschanged !== undefined) {
                  window.speechSynthesis.onvoiceschanged = () => {
                    voices = window.speechSynthesis.getVoices();
                    resolve();
                  };
                } else {
                  setTimeout(() => {
                    voices = window.speechSynthesis.getVoices();
                    resolve();
                  }, 100);
                }
              });
            }
            
            const selectedVoice = voices.find(
              v => v.voiceURI === model.voiceId
            );
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          }
          
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      logger.error('Error synthesizing speech:', error);
    }
  };

  const handleModelSelection = (model: string) => {
    setSelectedModel(model);
    setShowModelSelection(false);

    // Only show warming up on first load
    if (isFirstLoad) {
      setShowWarmingUp(true);

      // Simulate warming up process
      let progress = 10;
      const interval = setInterval(() => {
        progress += 5;
        const progressBar = document.getElementById('warmup-progress-bar');
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
        }

        if (progress >= 100) {
          clearInterval(interval);
          setShowWarmingUp(false);
          setIsFirstLoad(false);
        }
      }, 300);
    }
    // Save the selected model to settings
    saveSettings({
      selectedModel: model,
      activeCharacter,
      voiceModel,
      memoryBuffer: loadSettings().memoryBuffer, // Preserve existing memoryBuffer value
      textSpeed: loadSettings().textSpeed, // Preserve existing textSpeed value
    });
  };
  const handleModelChange = (model: string) => {
    setSelectedModel(model);

    // Save the selected model to settings
    saveSettings({
      selectedModel: model,
      activeCharacter,
      voiceModel,
      memoryBuffer: loadSettings().memoryBuffer,
      textSpeed: loadSettings().textSpeed,
    });
  };

  const handleLoadCharacterClick = () => {
    setShowCharacterSelector(true);
  };
  const handleCharacterSelected = (characterName: string) => {
    setActiveCharacter(characterName);

    // Update the current persona in the API context
    setCurrentPersona(characterName);

    // Load the persona content
    const persona = getPersona(characterName);
    if (persona) {
      setCurrentPersonaContent(persona.content);
    } else {
      setCurrentPersonaContent('');
    }

    // Save to settings
    saveSettings({
      selectedModel,
      activeCharacter: characterName,
      voiceModel,
      memoryBuffer: loadSettings().memoryBuffer,
      textSpeed: loadSettings().textSpeed, // Preserve existing textSpeed value
    });
    setShowCharacterSelector(false);
  };

  const handleShowWipInfo = () => {
    setSettingsInitialView('OpenSourceWipInfo');
    setShowSettings(true);
  };

  const handleCloseCharacterSelector = () => {
    setShowCharacterSelector(false);
  };
  const handleVoiceModelChange = (modelName: string) => {
    setVoiceModel(modelName);

    // Save to settings
    saveSettings({
      selectedModel,
      activeCharacter,
      voiceModel: modelName,
      memoryBuffer: loadSettings().memoryBuffer,
      textSpeed: loadSettings().textSpeed, // Preserve existing textSpeed value
    });
  };

  useEffect(() => {
    // Load settings from localStorage
    const settings = loadSettings();

    if (settings.selectedModel) {
      setSelectedModel(settings.selectedModel);
      setIsFirstLoad(false); // We have a selected model, so not first load
    } else {
      // Only show model selection if no model has been selected yet
      setShowModelSelection(true);
    }

    if (settings.activeCharacter) {
      setActiveCharacter(settings.activeCharacter);

      // Set the current persona in the API context
      setCurrentPersona(settings.activeCharacter);

      // Load the persona content
      const persona = getPersona(settings.activeCharacter);
      if (persona) {
        setCurrentPersonaContent(persona.content);
      }
    }

    if (settings.voiceModel) {
      setVoiceModel(settings.voiceModel);
    }
  }, [setCurrentPersona]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      // Stop any playing speech synthesis
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      // Stop any playing ElevenLabs audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [currentAudio]);

  // Add effect to listen for AI responses and synthesize voice
  useEffect(() => {
    const handleQueryResponse = (event: CustomEvent<any>) => {
      if (!event.detail) return;

      const { response } = event.detail;

      // If a voice model is selected, synthesize the response
      if (voiceModel && voiceModel !== 'None') {
        synthesizeVoice(response, voiceModel);
      }
    };

    // Add event listener
    window.addEventListener(
      'query-response',
      handleQueryResponse as EventListener
    );

    // Clean up
    return () => {
      window.removeEventListener(
        'query-response',
        handleQueryResponse as EventListener
      );
    };
  }, [voiceModel]);
  // Initialize performance monitoring
  useEffect(() => {
    if (isDevelopment) {
      initPerformanceMonitoring();

      // Add shortcut to toggle dev tools visibility and collapse state
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl+Shift+D to toggle dev tools (Cmd+Shift+D on Mac)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'd') {
          e.preventDefault();
          setShowDevTools(prev => !prev);
        }

        // Ctrl+Shift+C to toggle collapse state when dev tools are visible (Cmd+Shift+C on Mac)
        if (
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          e.key === 'c' &&
          showDevTools
        ) {
          e.preventDefault();
          setDevToolsCollapsed(prev => !prev);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDevelopment, showDevTools]);

  const generateMetricsReport = async () => {
    await triggerPerformanceReport();
    logger.info('Performance report manually generated');
  };

  const clearMetrics = () => {
    clearPerformanceData();
    logger.info('Performance metrics cleared');
  };

  // Add database export functionality
  const exportDbContent = async () => {
    try {
      const dbContent = await exportDatabaseContent();

      if (isDevelopment) {
        // In development mode, save to the server's db-metrics folder using our API endpoint
        try {
          const response = await fetch('/save-db-metrics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbContent),
          });

          const result = await response.json();
          if (result.success) {
            logger.info(
              `Database content exported successfully to db-metrics/${result.filename}`
            );
          } else{
            throw new Error('Failed to save to server');
          }
        } catch (serverError) {
          logger.error(
            'Error saving to server, falling back to client download:',
            serverError
          );

          // Fall back to client-side download if server save fails
          saveClientSideFile(dbContent);
        }
      } else {
        // In production, just do client-side download
        saveClientSideFile(dbContent);
      }
    } catch (error) {
      logger.error('Failed to export database content:', error);
    }
  };

  // Helper function to save file on client side
  const saveClientSideFile = (content: any) => {
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `ALTER-EGO-DB-${new Date().toISOString().replace(/:/g, '-')}.json`;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <AppContainer>
      <GlobalStyles />
      <Suspense fallback={null}>
        {showModelSelection && (
          <ModelSelection
            onSelectModel={handleModelSelection}
            onShowWipInfo={handleShowWipInfo}
          />
        )}
        {showWarmingUp && <WarmingUp />}
      </Suspense>
      <Header
        onSettingsClick={() => setShowSettings(!showSettings)}
        onLoadCharacter={handleLoadCharacterClick}
      />
      <QuerySection
        personaContent={currentPersonaContent}
        activeCharacter={activeCharacter}
      />
      <MainContent
        personaContent={currentPersonaContent}
        activeCharacter={activeCharacter}
      />
      <Footer
        activeCharacter={activeCharacter}
        voiceModel={voiceModel}
        onVoiceModelChange={handleVoiceModelChange}
      />
      <Suspense fallback={null}>
        {showSettings && (
          <Settings
            onClose={() => {
              setShowSettings(false);
              setSettingsInitialView(undefined);
            }}
            onModelChange={handleModelChange}
            initialView={settingsInitialView}
          />
        )}
        {showCharacterSelector && (
          <CharacterSelector
            onSelect={handleCharacterSelected}
            onClose={handleCloseCharacterSelector}
          />
        )}
      </Suspense>
      {isDevelopment && showDevTools && (
        <DevToolsMetrics
          collapsed={devToolsCollapsed}
          onToggleCollapse={() => setDevToolsCollapsed(!devToolsCollapsed)}
          onGenerateReport={generateMetricsReport}
          onClearMetrics={clearMetrics}
          onExportDb={exportDbContent}
        />
      )}
      <NotificationManager />
    </AppContainer>
  );
};

export default App;
