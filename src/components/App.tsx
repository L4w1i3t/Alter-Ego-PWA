import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from './Header/Header';
import QuerySection from './Sections/QuerySection';
import MainContent from './Sections/MainContent';
import Footer from './Footer/Footer';
import Settings from './Settings/Settings';
import ModelSelection from './Sections/ModelSelection';
import WarmingUp from './Sections/WarmingUp';
import { GlobalStyles } from '../styles/GlobalStyles';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #000;
  color: #0f0;
  font-family: monospace, "Courier New", Courier;
  overflow: hidden;
`;

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showModelSelection, setShowModelSelection] = useState(true);
  const [showWarmingUp, setShowWarmingUp] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [activeCharacter, setActiveCharacter] = useState("ALTER EGO");
  const [voiceModel, setVoiceModel] = useState("Loading...");
  
  const handleModelSelection = (model: string) => {
    setSelectedModel(model);
    setShowModelSelection(false);
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
      }
    }, 300);
  };
  
  useEffect(() => {
    // Load settings from localStorage or set defaults
    const savedSettings = localStorage.getItem('alterEgoSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.selectedModel) {
        setSelectedModel(settings.selectedModel);
        setShowModelSelection(false);
      }
    }
    
    // For development, optionally bypass the model selection screen
    if (process.env.NODE_ENV === 'development') {
      // Uncomment the next line to skip model selection during development
      // setShowModelSelection(false);
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
        onLoadCharacter={() => console.log("Load character clicked")}
      />
      
      <QuerySection />
      
      <MainContent />
      
      <Footer 
        activeCharacter={activeCharacter}
        voiceModel={voiceModel}
      />
      
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </AppContainer>
  );
};

export default App;