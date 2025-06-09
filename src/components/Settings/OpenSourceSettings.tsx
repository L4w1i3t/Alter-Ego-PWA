import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadSettings, saveSettings } from '../../utils/storageUtils';
import { 
  getOpenSourceModels, 
  getBackendStatus, 
  testBackendConnection,
  loadBackendModel,
  OPEN_SOURCE_CONFIG 
} from '../../utils/openSourceApi';
import { showSuccess, showError, showWarning } from '../Common/NotificationManager';

const Container = styled.div`
  color: #0f0;
  max-width: 100%;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 1em;
    min-height: 70vh;
  }
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
  
  @media (max-width: 768px) {
    font-size: 1.4em;
    margin-bottom: 1.5em;
    text-align: center;
  }
`;

const InfoBox = styled.div`
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid #0f0;
  padding: 1em;
  margin-bottom: 1.5em;
  border-radius: 4px;
  font-size: 0.9em;
  line-height: 1.4;
`;

const ErrorBox = styled(InfoBox)`
  background: rgba(255, 0, 0, 0.1);
  border-color: #f44;
  color: #faa;
`;

const WarningBox = styled(InfoBox)`
  background: rgba(255, 165, 0, 0.1);
  border-color: #fa0;
  color: #ffa500;
`;

const StatusBox = styled.div`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid #0af;
  padding: 1em;
  margin-bottom: 1.5em;
  border-radius: 4px;
  font-size: 0.9em;
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5em;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StatusLabel = styled.span`
  color: #0af;
`;

const StatusValue = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status?: 'good' | 'warning' | 'error' }>`
  color: ${props => 
    props.status === 'good' ? '#0f0' :
    props.status === 'warning' ? '#fa0' :
    props.status === 'error' ? '#f44' : '#0f0'
  };
`;

const FormGroup = styled.div`
  margin-bottom: 1.5em;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5em;
  font-size: 0.9em;
  color: #0af;
`;

const Select = styled.select`
  width: 100%;
  background: black;
  border: 1px solid #0f0;
  color: #0f0;
  padding: 0.7em;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  
  &:focus {
    outline: none;
    border-color: #0af;
  }
  
  option {
    background: black;
    color: #0f0;
  }
`;

const Input = styled.input`
  width: 100%;
  background: black;
  border: 1px solid #0f0;
  color: #0f0;
  padding: 0.7em;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  
  &:focus {
    outline: none;
    border-color: #0af;
  }
  
  &::placeholder {
    color: #666;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1em;
  margin-top: 2em;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  background: transparent;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.8em 1.5em;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  transition: all 0.2s;
  
  &:hover {
    background: #0f0;
    color: black;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background: transparent;
      color: #0f0;
    }
  }
`;

const TestButton = styled(Button)`
  border-color: #0af;
  color: #0af;
  
  &:hover {
    background: #0af;
    color: black;
  }
`;

const LoadButton = styled(Button)`
  border-color: #fa0;
  color: #fa0;
  
  &:hover {
    background: #fa0;
    color: black;
  }
`;

interface OpenSourceSettingsProps {
  onBack: () => void;
}

interface BackendStatus {
  connected: boolean;
  device?: string;
  loadedModels?: string[];
  version?: string;
  error?: string;
}

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  parameters?: string;
  loaded: boolean;
}

const OpenSourceSettings: React.FC<OpenSourceSettingsProps> = ({ onBack }) => {
  const [backendUrl, setBackendUrl] = useState('http://127.0.0.1:8000');
  const [selectedModel, setSelectedModel] = useState(OPEN_SOURCE_CONFIG.defaultModel);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({ connected: false });
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Load current settings
    const settings = loadSettings();
    if (settings.backendUrl) {
      setBackendUrl(settings.backendUrl);
    }
    if (settings.openSourceModel) {
      setSelectedModel(settings.openSourceModel);
    }

    // Test connection on load
    testConnection();
  }, []);

  const testConnection = async () => {
    setTesting(true);
    try {
      const isConnected = await testBackendConnection();
      if (isConnected) {
        const status = await getBackendStatus();
        setBackendStatus({
          connected: true,
          device: status.device,
          loadedModels: status.loadedModels,
          version: status.version
        });
        
        // Load available models
        const models = await getOpenSourceModels();
        setAvailableModels(models);
        
        showSuccess('Backend connection successful!');
      } else {
        setBackendStatus({ 
          connected: false, 
          error: 'Cannot connect to backend server' 
        });
        showError('Cannot connect to backend server');
      }
    } catch (error) {
      setBackendStatus({ 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      showError(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleLoadModel = async () => {
    if (!selectedModel) return;
    
    setLoading(true);
    try {
      await loadBackendModel(selectedModel);
      showSuccess(`Loading ${selectedModel}... This may take a few minutes.`);
      
      // Refresh status after a delay to see if model was loaded
      setTimeout(testConnection, 3000);
    } catch (error) {
      showError(`Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    try {
      const currentSettings = loadSettings();
      saveSettings({
        ...currentSettings,
        backendUrl: backendUrl.trim(),
        openSourceModel: selectedModel
      });
      
      showSuccess('Open-source settings saved successfully!');
    } catch (error) {
      showError('Failed to save settings');
      console.error('Save error:', error);
    }
  };

  return (
    <Container>
      <Title>Open Source Model Settings</Title>
      
      {!backendStatus.connected ? (
        <ErrorBox>
          <strong>Backend Not Connected</strong><br />
          {backendStatus.error || 'The open-source backend server is not running or not accessible.'}
          <br /><br />
          <strong>To set up the backend:</strong><br />
          1. Navigate to the <code>backend</code> folder in your project<br />
          2. Run <code>setup.bat</code> (Windows) or <code>setup.sh</code> (Mac/Linux)<br />
          3. Start the server with <code>python main.py</code><br />
          4. Click "Test Connection" below
        </ErrorBox>
      ) : (
        <InfoBox>
          <strong>✅ Backend Connected!</strong><br />
          You can now use open-source language models for conversations.
          These models run locally and don't require API keys.
        </InfoBox>
      )}

      <StatusBox>
        <StatusRow>
          <StatusLabel>Backend URL:</StatusLabel>
          <StatusValue>{backendUrl}</StatusValue>
        </StatusRow>
        <StatusRow>
          <StatusLabel>Connection:</StatusLabel>
          <StatusValue status={backendStatus.connected ? 'good' : 'error'}>
            {backendStatus.connected ? 'Connected' : 'Disconnected'}
          </StatusValue>
        </StatusRow>
        {backendStatus.connected && (
          <>
            <StatusRow>
              <StatusLabel>Device:</StatusLabel>
              <StatusValue status={backendStatus.device === 'cuda' ? 'good' : 'warning'}>
                {backendStatus.device?.toUpperCase() || 'Unknown'}
              </StatusValue>
            </StatusRow>
            <StatusRow>
              <StatusLabel>Loaded Models:</StatusLabel>
              <StatusValue>
                {backendStatus.loadedModels?.length || 0}
              </StatusValue>
            </StatusRow>
            {backendStatus.version && (
              <StatusRow>
                <StatusLabel>Backend Version:</StatusLabel>
                <StatusValue>{backendStatus.version}</StatusValue>
              </StatusRow>
            )}
          </>
        )}
      </StatusBox>

      <FormGroup>
        <Label htmlFor="backendUrl">Backend URL:</Label>
        <Input
          type="text"
          id="backendUrl"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
          placeholder="http://127.0.0.1:8000"
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="modelSelect">Selected Model:</Label>
        <Select
          id="modelSelect"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={!backendStatus.connected}
        >
          {availableModels.length > 0 ? (
            availableModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} {model.loaded ? '(Loaded)' : '(Not Loaded)'}
                {model.parameters ? ` - ${model.parameters}` : ''}
              </option>
            ))
          ) : (
            <option value={OPEN_SOURCE_CONFIG.defaultModel}>
              {OPEN_SOURCE_CONFIG.defaultModel} (Default)
            </option>
          )}
        </Select>
      </FormGroup>

      {backendStatus.connected && !backendStatus.loadedModels?.includes(selectedModel) && (
        <WarningBox>
          The selected model is not currently loaded in memory. 
          Click "Load Model" to load it for faster inference.
        </WarningBox>
      )}

      <ButtonContainer>
        <Button onClick={onBack}>Back</Button>
        <TestButton onClick={testConnection} disabled={testing}>
          {testing ? 'Testing...' : 'Test Connection'}
        </TestButton>
        {backendStatus.connected && (
          <LoadButton onClick={handleLoadModel} disabled={loading || !selectedModel}>
            {loading ? 'Loading...' : 'Load Model'}
          </LoadButton>
        )}
        <Button onClick={handleSave}>Save Settings</Button>
      </ButtonContainer>
    </Container>
  );
};

export default OpenSourceSettings;
