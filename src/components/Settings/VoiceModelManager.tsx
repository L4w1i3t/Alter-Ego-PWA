import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadVoiceModels, saveVoiceModels, VoiceModel, loadApiKeys } from '../../utils/storageUtils';
import { getVoices } from '../../utils/elevenlabsApi';
import { dispatchAppEvent, EVENTS } from '../../utils/events';

const Container = styled.div`
  color: #0f0;
  max-width: 100%;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const VoiceModelList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 1em;
  border: 1px solid #0f04;
`;

const VoiceModelItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8em;
  border-bottom: 1px solid #0f03;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #0f01;
  }
`;

const ModelInfo = styled.div`
  flex-grow: 1;
`;

const ModelName = styled.div`
  font-weight: bold;
  margin-bottom: 0.3em;
`;

const ModelDescription = styled.div`
  font-size: 0.8em;
  color: #0f09;
`;

const ModelProvider = styled.div<{ provider?: string }>`
  font-size: 0.75em;
  color: ${props => props.provider === 'elevenlabs' ? '#0af' : '#0f0'};
  display: flex;
  align-items: center;
`;

const ProviderIcon = styled.span`
  margin-right: 0.5em;
  font-size: 1.1em;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5em;
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.3em 0.6em;
  font-size: 0.8em;
  cursor: pointer;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const TestButton = styled(Button)`
  border-color: #00f;
  color: #00f;
  
  &:hover {
    background: #00f;
    color: #000;
  }
`;

const DeleteButton = styled(Button)`
  border-color: #f00;
  color: #f00;
  
  &:hover {
    background: #f00;
    color: #000;
  }
`;

const EmptyState = styled.div`
  padding: 2em;
  text-align: center;
  color: #0f06;
`;

const InfoBox = styled.div`
  padding: 0.8em;
  border: 1px solid #00f;
  background-color: #000020;
  margin-bottom: 1.5em;
  font-size: 0.9em;
`;

const ErrorBox = styled.div`
  padding: 0.8em;
  border: 1px solid #f00;
  background-color: #200000;
  margin-bottom: 1.5em;
  font-size: 0.9em;
  color: #f00;
`;

const FormContainer = styled.div`
  margin-top: 1em;
  border: 1px solid #0f03;
  padding: 1em;
`;

const FormGroup = styled.div`
  margin-bottom: 0.8em;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.3em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
`;

const ProviderOptionContainer = styled.div`
  display: flex;
  margin-bottom: 1em;
  border-bottom: 1px solid #0f03;
  padding-bottom: 1em;
`;

const ProviderOption = styled.div<{ selected?: boolean, provider?: string }>`
  flex: 1;
  padding: 1em;
  border: 2px solid ${props => props.selected 
    ? (props.provider === 'elevenlabs' ? '#0af' : '#0f0') 
    : '#333'};
  background-color: ${props => props.selected 
    ? (props.provider === 'elevenlabs' ? '#001020' : '#001000') 
    : '#000'};
  text-align: center;
  cursor: pointer;
  margin: 0 0.5em;
  
  &:hover {
    background-color: ${props => props.provider === 'elevenlabs' ? '#001830' : '#002000'};
  }
  
  &:first-child {
    margin-left: 0;
  }
  
  &:last-child {
    margin-right: 0;
  }
`;

const ProviderTitle = styled.div<{ provider?: string }>`
  font-weight: bold;
  font-size: 1.1em;
  color: ${props => props.provider === 'elevenlabs' ? '#0af' : '#0f0'};
  margin-bottom: 0.5em;
`;

const ProviderDescription = styled.div`
  font-size: 0.8em;
  color: #aaa;
`;

const ProviderIcon2 = styled.div`
  font-size: 2em;
  margin-bottom: 0.5em;
`;

const RequiredTag = styled.span`
  background-color: #f002;
  color: #f00;
  font-size: 0.7em;
  padding: 0.2em 0.4em;
  border-radius: 2px;
  margin-left: 0.5em;
  vertical-align: middle;
`;

const OptionalTag = styled.span`
  background-color: #0f02;
  color: #0f0;
  font-size: 0.7em;
  padding: 0.2em 0.4em;
  border-radius: 2px;
  margin-left: 0.5em;
  vertical-align: middle;
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 80px;
  padding: 0.5em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  font-family: monospace;
  resize: vertical;
`;

const FooterButtons = styled.div`
  margin-top: 1em;
  display: flex;
  justify-content: space-between;
`;

const ActionButton = styled(Button)`
  padding: 0.5em 1em;
`;

const BackButton = styled(ActionButton)``;
const AddButton = styled(ActionButton)``;
const SaveButton = styled(ActionButton)``;
const CancelButton = styled(ActionButton)``;

const StatusMessage = styled.p<{ success?: boolean }>`
  margin-top: 1em;
  text-align: center;
  font-weight: bold;
  color: ${props => props.success ? '#0f0' : '#f00'};
`;

const VoiceBrowserButton = styled(Button)`
  margin-top: 1em;
  width: 100%;
`;

const VoiceBrowser = styled.div`
  margin-top: 1em;
  border: 1px solid #0f0;
  padding: 1em;
  max-height: 200px;
  overflow-y: auto;
`;

// For browser speech synthesis voice options
const BrowserVoiceSection = styled.div`
  margin-top: 1em;
  border-top: 1px solid #0f03;
  padding-top: 1em;
`;

const BrowserVoiceSelector = styled.select`
  width: 100%;
  padding: 0.5em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  margin-bottom: 1em;
`;

interface VoiceModelManagerProps {
  onBack: () => void;
}

const VoiceModelManager: React.FC<VoiceModelManagerProps> = ({ onBack }) => {
  const [models, setModels] = useState<Record<string, VoiceModel>>({});
  const [editingModel, setEditingModel] = useState<VoiceModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(true);
  const [elevenlabsKeyExists, setElevenlabsKeyExists] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState<string>('');
  
  useEffect(() => {
    // Load existing voice models
    const savedModels = loadVoiceModels();
    setModels(savedModels);
    
    // Check if ElevenLabs API key exists
    const apiKeys = loadApiKeys();
    setElevenlabsKeyExists(!!apiKeys.ELEVENLABS_API_KEY);
    
    // Get available browser voices
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setBrowserVoices(voices);
        }
      };
      
      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      
      // Initial load attempt
      loadVoices();
    }
  }, []);
  
  const fetchElevenLabsVoices = async () => {
    if (!elevenlabsKeyExists) {
      setStatus('ElevenLabs API key is not set');
      setIsSuccess(false);
      return;
    }
    
    try {
      setLoadingVoices(true);
      setStatus('Loading ElevenLabs voices...');
      setIsSuccess(true);
      
      const voicesData = await getVoices();
      setAvailableVoices(voicesData.voices || []);
      
      setStatus(`Loaded ${voicesData.voices?.length || 0} voices from ElevenLabs`);
      setIsSuccess(true);
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      setStatus('Error loading ElevenLabs voices');
      setIsSuccess(false);
    } finally {
      setLoadingVoices(false);
    }
  };
  
  const handleAddNew = () => {
    setEditingModel({
      id: `model_${Date.now()}`,
      name: '',
      description: '',
      provider: 'browser', // Default to browser as it doesn't need an API key
      voiceId: '',
      settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    });
    setIsEditing(false);
  };
  
  const handleEdit = (model: VoiceModel) => {
    setEditingModel({ ...model });
    setIsEditing(true);
    
    // If it's a browser voice, set the selected browser voice
    if (model.provider === 'browser' && model.voiceId) {
      setSelectedBrowserVoice(model.voiceId);
    }
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this voice model?')) {
      const updatedModels = { ...models };
      delete updatedModels[id];
      saveVoiceModels(updatedModels);
      setModels(updatedModels);
      
      // Dispatch event to notify that voice models have been updated
      dispatchAppEvent(EVENTS.VOICE_MODELS_UPDATED, { models: updatedModels });
      
      setStatus('Voice model deleted successfully');
      setIsSuccess(true);
      setTimeout(() => setStatus(null), 3000);
    }
  };
  
  const handleTestVoice = async (model: VoiceModel) => {
    try {
      // Create a sample text to test with
      const testText = `This is a test of the ${model.name} voice model.`;
      
      if (model.provider === 'browser') {
        // Use browser's speech synthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(testText);
          
          // Set the voice if a specific one is selected
          if (model.voiceId) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.voiceURI === model.voiceId);
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          }
          
          window.speechSynthesis.speak(utterance);
          
          setStatus('Testing browser voice synthesis');
          setIsSuccess(true);
        } else {
          setStatus('Speech synthesis not supported in this browser');
          setIsSuccess(false);
        }
      } else if (model.provider === 'elevenlabs') {
        // For ElevenLabs, we would use the API in production
        // For the demo, just use browser speech synthesis as a placeholder
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(testText);
          window.speechSynthesis.speak(utterance);
          
          setStatus('Testing ElevenLabs voice (simulated for demo)');
          setIsSuccess(true);
        } else {
          setStatus('Speech synthesis not supported in this browser');
          setIsSuccess(false);
        }
      }
      
      setTimeout(() => setStatus(null), 5000);
      
    } catch (error) {
      console.error('Error testing voice:', error);
      setStatus('Error testing voice');
      setIsSuccess(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editingModel) return;
    
    const { name, value } = e.target;
    
    if (name.startsWith('settings.')) {
      const settingName = name.split('.')[1];
      setEditingModel({
        ...editingModel,
        settings: {
          ...editingModel.settings,
          [settingName]: parseFloat(value)
        }
      });
    } else {
      setEditingModel({
        ...editingModel,
        [name]: value
      });
    }
  };
  
  const handleSelectProvider = (provider: string) => {
    if (!editingModel) return;
    
    setEditingModel({
      ...editingModel,
      provider,
      // Clear the voiceId when switching providers
      voiceId: ''
    });
  };
  
  const handleSelectBrowserVoice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceURI = e.target.value;
    setSelectedBrowserVoice(voiceURI);
    
    if (editingModel) {
      setEditingModel({
        ...editingModel,
        voiceId: voiceURI
      });
    }
  };
  
  const handleSave = () => {
    if (!editingModel || !editingModel.name.trim()) {
      setStatus('Please provide a name for the voice model');
      setIsSuccess(false);
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    
    // Additional validation for ElevenLabs voice models
    if (editingModel.provider === 'elevenlabs' && !editingModel.voiceId) {
      setStatus('Please provide a Voice ID for ElevenLabs voice models');
      setIsSuccess(false);
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    
    // For browser voice models, ensure a voice is selected
    if (editingModel.provider === 'browser' && !editingModel.voiceId) {
      setStatus('Please select a browser voice');
      setIsSuccess(false);
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    
    const updatedModels = {
      ...models,
      [editingModel.id]: editingModel
    };
    
    try {
      saveVoiceModels(updatedModels);
      setModels(updatedModels);
      setEditingModel(null);
      
      // Dispatch event to notify that voice models have been updated
      dispatchAppEvent(EVENTS.VOICE_MODELS_UPDATED, { models: updatedModels });
      
      setStatus(isEditing ? 'Voice model updated successfully' : 'Voice model added successfully');
      setIsSuccess(true);
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus('Error saving voice model');
      setIsSuccess(false);
      console.error('Failed to save voice model:', error);
      setTimeout(() => setStatus(null), 3000);
    }
  };
  
  const handleCancel = () => {
    setEditingModel(null);
  };
  
  const getProviderDisplay = (provider: string): JSX.Element => {
    if (provider === 'elevenlabs') {
      return (
        <ModelProvider provider="elevenlabs">
          <ProviderIcon>🌟</ProviderIcon>
          ElevenLabs (Premium)
        </ModelProvider>
      );
    } else {
      return (
        <ModelProvider provider="browser">
          <ProviderIcon>🔊</ProviderIcon>
          Browser Speech
        </ModelProvider>
      );
    }
  };
  
  return (
    <Container>
      <Title>Manage Voice Models</Title>
      
      {!elevenlabsKeyExists && (
        <ErrorBox>
          ElevenLabs API key is not set. You can still create browser-based voice models, but ElevenLabs premium voices require an API key from the "Manage API Keys" section.
        </ErrorBox>
      )}
      
      {elevenlabsKeyExists && !editingModel && (
        <InfoBox>
          Voice models allow ALTER EGO to speak using different voices. You can add ElevenLabs premium voices or use free browser speech synthesis.
        </InfoBox>
      )}
      
      <VoiceModelList>
        {Object.keys(models).length === 0 ? (
          <EmptyState>No voice models added yet.</EmptyState>
        ) : (
          Object.values(models).map(model => (
            <VoiceModelItem key={model.id}>
              <ModelInfo>
                <ModelName>{model.name}</ModelName>
                <ModelDescription>{model.description || 'No description'}</ModelDescription>
                {getProviderDisplay(model.provider)}
              </ModelInfo>
              <ButtonGroup>
                <TestButton onClick={() => handleTestVoice(model)}>Test</TestButton>
                <Button onClick={() => handleEdit(model)}>Edit</Button>
                <DeleteButton onClick={() => handleDelete(model.id)}>Delete</DeleteButton>
              </ButtonGroup>
            </VoiceModelItem>
          ))
        )}
      </VoiceModelList>
      
      {editingModel ? (
        <FormContainer>
          <FormGroup>
            <Label htmlFor="name">Name: <RequiredTag>Required</RequiredTag></Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={editingModel.name}
              onChange={handleChange}
              placeholder="e.g., British Male"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="description">Description: <OptionalTag>Optional</OptionalTag></Label>
            <TextArea
              id="description"
              name="description"
              value={editingModel.description}
              onChange={handleChange}
              placeholder="A brief description of this voice model"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Provider:</Label>
            <ProviderOptionContainer>
              <ProviderOption 
                selected={editingModel.provider === 'browser'} 
                provider="browser"
                onClick={() => handleSelectProvider('browser')}
              >
                <ProviderIcon2>🔊</ProviderIcon2>
                <ProviderTitle provider="browser">Browser Speech</ProviderTitle>
                <ProviderDescription>Free, works offline, quality varies by browser</ProviderDescription>
              </ProviderOption>
              
              <ProviderOption 
                selected={editingModel.provider === 'elevenlabs'} 
                provider="elevenlabs"
                onClick={() => handleSelectProvider('elevenlabs')}
              >
                <ProviderIcon2>🌟</ProviderIcon2>
                <ProviderTitle provider="elevenlabs">ElevenLabs</ProviderTitle>
                <ProviderDescription>Premium quality, requires API key</ProviderDescription>
              </ProviderOption>
            </ProviderOptionContainer>
          </FormGroup>
          
          {editingModel.provider === 'elevenlabs' ? (
            <>
              <FormGroup>
                <Label htmlFor="voiceId">Voice ID: <RequiredTag>Required</RequiredTag></Label>
                <Input
                  type="text"
                  id="voiceId"
                  name="voiceId"
                  value={editingModel.voiceId || ''}
                  onChange={handleChange}
                  placeholder="ElevenLabs Voice ID"
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="settings.stability">Stability: {editingModel.settings?.stability || 0.5}</Label>
                <Input
                  type="range"
                  id="settings.stability"
                  name="settings.stability"
                  min="0"
                  max="1"
                  step="0.01"
                  value={editingModel.settings?.stability || 0.5}
                  onChange={handleChange}
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="settings.similarity_boost">Similarity Boost: {editingModel.settings?.similarity_boost || 0.5}</Label>
                <Input
                  type="range"
                  id="settings.similarity_boost"
                  name="settings.similarity_boost"
                  min="0"
                  max="1"
                  step="0.01"
                  value={editingModel.settings?.similarity_boost || 0.5}
                  onChange={handleChange}
                />
              </FormGroup>
              
              <VoiceBrowserButton 
                onClick={fetchElevenLabsVoices}
                disabled={loadingVoices || !elevenlabsKeyExists}
              >
                {loadingVoices ? 'Loading...' : 'Browse ElevenLabs Voices'}
              </VoiceBrowserButton>
              
              {!elevenlabsKeyExists && (
                <ErrorBox>
                  ElevenLabs API key is required to use premium voices. Please add your API key in "Manage API Keys".
                </ErrorBox>
              )}
              
              {availableVoices.length > 0 && (
                <VoiceBrowser>
                  {availableVoices.map(voice => (
                    <VoiceModelItem key={voice.voice_id} onClick={() => {
                      // Set the selected voice ID
                      setEditingModel({
                        ...editingModel,
                        voiceId: voice.voice_id,
                        name: editingModel.name || voice.name,
                        description: editingModel.description || `${voice.name} - ${voice.labels?.accent || 'Unknown accent'}`
                      });
                    }}>
                      <ModelInfo>
                        <ModelName>{voice.name}</ModelName>
                        <ModelDescription>
                          {Object.entries(voice.labels || {}).map(([key, value]) => `${key}: ${value}`).join(', ')}
                        </ModelDescription>
                      </ModelInfo>
                      <Button>Select</Button>
                    </VoiceModelItem>
                  ))}
                </VoiceBrowser>
              )}
            </>
          ) : (
            <BrowserVoiceSection>
              <FormGroup>
                <Label htmlFor="browserVoice">Select Browser Voice: <RequiredTag>Required</RequiredTag></Label>
                <BrowserVoiceSelector
                  id="browserVoice"
                  value={selectedBrowserVoice}
                  onChange={handleSelectBrowserVoice}
                >
                  <option value="">Select a voice...</option>
                  {browserVoices.map(voice => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang}, {voice.localService ? 'Local' : 'Remote'})
                    </option>
                  ))}
                </BrowserVoiceSelector>
              </FormGroup>
              
              {browserVoices.length === 0 && (
                <InfoBox>
                  No browser voices detected. Voice support may vary depending on your browser and operating system.
                </InfoBox>
              )}
            </BrowserVoiceSection>
          )}
          
          <ButtonGroup>
            <SaveButton onClick={handleSave}>Save</SaveButton>
            <CancelButton onClick={handleCancel}>Cancel</CancelButton>
          </ButtonGroup>
        </FormContainer>
      ) : (
        <FooterButtons>
          <BackButton onClick={onBack}>Back</BackButton>
          <AddButton onClick={handleAddNew}>Add New Voice Model</AddButton>
        </FooterButtons>
      )}
      
      {status && <StatusMessage success={isSuccess}>{status}</StatusMessage>}
    </Container>
  );
};

export default VoiceModelManager;