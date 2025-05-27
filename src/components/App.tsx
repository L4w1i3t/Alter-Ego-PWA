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
import NotificationManager from './Common/NotificationManager';
import { useApi } from '../context/ApiContext';
import { GlobalStyles } from '../styles/GlobalStyles';
import { loadSettings, saveSettings, loadPersonas, getPersona, loadVoiceModels, loadApiKeys } from '../utils/storageUtils';
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
  isPerformanceMonitoringEnabled
} from '../utils/performanceMetrics';

// Dev mode UI components for performance metrics
const DevMetricsControl = styled.div`
  position: fixed;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 20, 0, 0.8);
  border: 1px solid #0f0;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.8em;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 300px;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
`;

const DevButton = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 3px;
  padding: 4px 8px;
  cursor: pointer;
  font-family: monospace;
  transition: all 0.2s ease;
  
  &:hover {
    background: #0f0;
    color: #000;
    box-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
  }
`;

const MetricsTitle = styled.div`
  font-size: 12px;
  color: #0f0;
  text-align: center;
  font-weight: bold;
  border-bottom: 1px solid #0f0;
  padding-bottom: 5px;
  margin-bottom: 5px;
`;

const MetricsRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 2px 0;
`;

const MetricsLabel = styled.span`
  color: #0f0;
`;

const MetricsValue = styled.span`
  color: #fff;
  font-weight: bold;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 5px;
`;

const HotkeyInfo = styled.div`
  margin-top: 5px;
  color: #0f0;
  font-size: 10px;
  text-align: center;
  opacity: 0.8;
`;

const PerformanceIndicator = styled.div<{ value: number }>`
  width: 100%;
  height: 4px;
  background: #003300;
  margin-top: 2px;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => Math.min(100, props.value)}%;
    background: ${props => 
      props.value > 80 ? '#00ff00' : 
      props.value > 50 ? '#aaff00' : 
      props.value > 30 ? '#ffaa00' : '#ff3300'};
    transition: width 0.5s ease, background 0.5s ease;
  }
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: #0f0;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  
  &:hover {
    text-decoration: underline;
  }
`;

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

// LiveMetrics component to show real-time performance data
const LiveMetrics: React.FC = () => {
  const [fps, setFps] = useState<number>(0);
  const [memory, setMemory] = useState<{used: number, total: number, percent: number}>({
    used: 0,
    total: 0,
    percent: 0
  });
  const [tokenStats, setTokenStats] = useState<{total: number, byModel: Record<string, number>}>({
    total: 0,
    byModel: {}
  });
  const [expanded, setExpanded] = useState<boolean>(false);
  
  // Update metrics using shared tracking with performance monitor
  useEffect(() => {
    let rafId: number;
    let memoryIntervalId: number;
    
    // Synchronize with the FPS tracking in performanceMetrics.ts
    const updateStats = () => {
      // Access the FPS from the external performanceMetrics value
      if (window.ALTER_EGO_METRICS) {
        setFps(window.ALTER_EGO_METRICS.currentFPS || 0);
      }
      
      rafId = requestAnimationFrame(updateStats);
    };
    
    // Start animation frame loop for smooth updates
    rafId = requestAnimationFrame(updateStats);
    
    // Update memory and token stats on interval
    memoryIntervalId = window.setInterval(() => {
      // Update memory stats
      const memory = (performance as any).memory;
      if (memory) {
        const used = Math.round(memory.usedJSHeapSize / (1024 * 1024));
        const total = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
        const percent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        
        setMemory({ used, total, percent });
      }
      
      // Update token usage stats
      setTokenStats(getTokenUsageStats());
    }, 1000);
    
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(memoryIntervalId);
    };
  }, []);
  
  return (
    <>
      <MetricsTitle>ALTER EGO Performance Monitor</MetricsTitle>
      
      <MetricsRow>
        <MetricsLabel>FPS:</MetricsLabel>
        <MetricsValue>{fps}</MetricsValue>
      </MetricsRow>
      <PerformanceIndicator value={fps > 60 ? 100 : (fps / 60) * 100} />
      
      <MetricsRow>
        <MetricsLabel>Memory:</MetricsLabel>
        <MetricsValue>{memory.used} MB / {memory.total} MB</MetricsValue>
      </MetricsRow>
      <PerformanceIndicator value={100 - memory.percent} />
      
      <MetricsRow>
        <MetricsLabel>Tokens Used:</MetricsLabel>
        <MetricsValue>{tokenStats.total.toLocaleString()}</MetricsValue>
      </MetricsRow>
      
      {expanded && (
        <>
          <MetricsTitle>Token Usage by Model</MetricsTitle>
          {Object.entries(tokenStats.byModel).map(([model, count]) => (
            <MetricsRow key={model}>
              <MetricsLabel>{model}:</MetricsLabel>
              <MetricsValue>{count.toLocaleString()}</MetricsValue>
            </MetricsRow>
          ))}
          
          <MetricsTitle>System Info</MetricsTitle>
          <MetricsRow>
            <MetricsLabel>Screen:</MetricsLabel>
            <MetricsValue>{window.innerWidth}x{window.innerHeight}</MetricsValue>
          </MetricsRow>
          <MetricsRow>
            <MetricsLabel>Platform:</MetricsLabel>
            <MetricsValue>{navigator.platform}</MetricsValue>
          </MetricsRow>
          <MetricsRow>
            <MetricsLabel>Render Count:</MetricsLabel>
            <MetricsValue>{renderCount}</MetricsValue>
          </MetricsRow>
        </>
      )}
      
      <ExpandButton onClick={() => setExpanded(!expanded)}>
        {expanded ? '▲ Show Less' : '▼ Show More'}
      </ExpandButton>
    </>
  );
};

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
  const [settingsInitialView, setSettingsInitialView] = useState<string | undefined>(undefined);
  const [showModelSelection, setShowModelSelection] = useState(false); // Default to not showing
  const [showWarmingUp, setShowWarmingUp] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  
  // App state
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [activeCharacter, setActiveCharacter] = useState("ALTER EGO");
  const [currentPersonaContent, setCurrentPersonaContent] = useState("");
  const [voiceModel, setVoiceModel] = useState("None");
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Performance monitoring state
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [showDevTools, setShowDevTools] = useState(isDevelopment);

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

  // Initialize performance monitoring
  useEffect(() => {
    if (isDevelopment) {
      initPerformanceMonitoring();
      
      // Add shortcut to toggle dev tools visibility
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl+Shift+D to toggle dev tools (Cmd+Shift+D on Mac)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'd') {
          e.preventDefault();
          setShowDevTools(prev => !prev);
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDevelopment]);

  const generateMetricsReport = async () => {
    await triggerPerformanceReport();
    console.log('Performance report manually generated');
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
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dbContent)
          });
          
          const result = await response.json();
          if (result.success) {
            console.log(`Database content exported successfully to db-metrics/${result.filename}`);
          } else {
            throw new Error('Failed to save to server');
          }
        } catch (serverError) {
          console.error('Error saving to server, falling back to client download:', serverError);
          
          // Fall back to client-side download if server save fails
          saveClientSideFile(dbContent);
        }
      } else {
        // In production, just do client-side download
        saveClientSideFile(dbContent);
      }
    } catch (error) {
      console.error('Failed to export database content:', error);
    }
  };
  
  // Helper function to save file on client side
  const saveClientSideFile = (content: any) => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
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
        {showModelSelection && (
        <ModelSelection 
          onSelectModel={handleModelSelection} 
          onShowWipInfo={handleShowWipInfo}
        />
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

      {isDevelopment && showDevTools && (
        <DevMetricsControl>
          <LiveMetrics />
          <ButtonRow>
            <DevButton onClick={generateMetricsReport}>
              Generate Metrics Report
            </DevButton>
          </ButtonRow>
          <ButtonRow>
            <DevButton onClick={exportDbContent}>
              Export Dexie DB
            </DevButton>
          </ButtonRow>
          <HotkeyInfo>
            Hotkey: Ctrl+Alt+P
            <br />
            (Toggle panel: Ctrl+Shift+D)
          </HotkeyInfo>
        </DevMetricsControl>
      )}
      
      <NotificationManager />
    </AppContainer>
  );
};

export default App;