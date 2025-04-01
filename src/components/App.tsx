import React, { useState, useEffect, Suspense, lazy } from 'react';
import styled from 'styled-components';
import Header from './Header/Header';
import QuerySection from './Sections/QuerySection';
import MainContent from './Sections/MainContent';
import Footer from './Footer/Footer';
import Settings from './Settings/Settings';
import ModelSelection from './Sections/ModelSelection';
import WarmingUp from './Sections/WarmingUp';
import CharacterSelector from './Sections/CharacterSelector'; 
import { useApi } from '../context/ApiContext';
import { GlobalStyles } from '../styles/GlobalStyles';
import { loadSettings, saveSettings, loadPersonas, getPersona, loadVoiceModels, loadApiKeys } from '../utils/storageUtils';
import { textToSpeech, playAudio } from '../utils/elevenlabsApi';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #000;
  color: #0f0;
  font-family: monospace, "Courier New", Courier;
  overflow: hidden;
`;

// Counter to track component renders
let renderCount = 0;

const App: React.FC = () => {

  const { setCurrentPersona } = useApi();
  
  // Log mounting for debugging
  useEffect(() => {
    console.log(`App component mounted (render #${++renderCount})`);
    
    // Capture reload events
    const beforeUnloadHandler = () => {
      console.log('Page is about to reload/unload');
    };
    
    window.addEventListener('beforeunload', beforeUnloadHandler);
    
    return () => {
      console.log('App component unmounting');
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, []);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showModelSelection, setShowModelSelection] = useState(false); // Default to not showing
  const [showWarmingUp, setShowWarmingUp] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  
  // App state
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [activeCharacter, setActiveCharacter] = useState("ALTER EGO");
  const [currentPersonaContent, setCurrentPersonaContent] = useState("");
  const [voiceModel, setVoiceModel] = useState("None");
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Voice synthesis utilities
  const synthesizeVoice = async (text: string, voicemodel_id: string) => {
    if (voicemodel_id === 'None' || !text) return;
    
    const models = loadVoiceModels();
    const model = models[voicemodel_id];
    
    if (!model) return;
    
    try {
      if (model.provider === 'browser') {
        // Use browser's built-in speech synthesis
        const utterance = new SpeechSynthesisUtterance(text);
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
            text,
            model.voiceId || 'eleven_multilingual_v2',
            model.settings || { stability: 0.5, similarity_boost: 0.5 }
          );
          
          if (audioBlob) {
            await playAudio(audioBlob);
          }
        } catch (apiError) {
          console.error('Error with ElevenLabs API:', apiError);
          // Fall back to browser speech synthesis on error
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.text = `ElevenLabs error. Fallback voice: ${text}`;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Error synthesizing speech:', error);
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
      memoryBuffer: loadSettings().memoryBuffer // Preserve existing memoryBuffer value
    });
  };
  
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    
    // Save the selected model to settings
    saveSettings({
      selectedModel: model,
      activeCharacter,
      voiceModel,
      memoryBuffer: loadSettings().memoryBuffer
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
      setCurrentPersonaContent("");
    }
    
    // Save to settings
    saveSettings({
      selectedModel,
      activeCharacter: characterName,
      voiceModel,
      memoryBuffer: loadSettings().memoryBuffer
    });
    
    setShowCharacterSelector(false);
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
      memoryBuffer: loadSettings().memoryBuffer
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
    window.addEventListener('query-response', handleQueryResponse as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('query-response', handleQueryResponse as EventListener);
    };
  }, [voiceModel]);

  return (
    <AppContainer>
      <GlobalStyles />
      
      {showModelSelection && (
        <ModelSelection onSelectModel={handleModelSelection} />
      )}
      
      {showWarmingUp && (
        <WarmingUp />
      )}
      
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
      
      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)} 
          onModelChange={handleModelChange}
        />
      )}
      
      {showCharacterSelector && (
        <CharacterSelector
          onSelect={handleCharacterSelected}
          onClose={handleCloseCharacterSelector}
        />
      )}
    </AppContainer>
  );
};

export default App;