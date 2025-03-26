import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from './Header/Header';
import QuerySection from './Sections/QuerySection';
import MainContent from './Sections/MainContent';
import Footer from './Footer/Footer';
import Settings from './Settings/Settings';
import ModelSelection from './Sections/ModelSelection';
import WarmingUp from './Sections/WarmingUp';
import CharacterSelector from './Sections/CharacterSelector'; 
import { GlobalStyles } from '../styles/GlobalStyles';
import { loadSettings, saveSettings, loadPersonas, getPersona } from '../utils/storageUtils';

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
      voiceModel
    });
  };
  
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    
    // Save the selected model to settings
    saveSettings({
      selectedModel: model,
      activeCharacter,
      voiceModel
    });
  };
  
  const handleLoadCharacterClick = () => {
    setShowCharacterSelector(true);
  };
  
  const handleCharacterSelected = (characterName: string) => {
    setActiveCharacter(characterName);
    
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
      voiceModel
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
      voiceModel: modelName
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
      
      // Load the persona content
      const persona = getPersona(settings.activeCharacter);
      if (persona) {
        setCurrentPersonaContent(persona.content);
      }
    }
    
    if (settings.voiceModel) {
      setVoiceModel(settings.voiceModel);
    }
  }, []);

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
      
      <QuerySection />
      
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