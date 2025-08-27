import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  loadVoiceModels,
  saveVoiceModels,
  VoiceModel,
  loadApiKeys,
} from '../../utils/storageUtils';
import { getVoices, ElevenlabsModel } from '../../utils/elevenlabsApi';
import { dispatchAppEvent, EVENTS } from '../../utils/events';
import ConfirmationDialog from '../Common/ConfirmationDialog';
import {
  showSuccess,
  showError,
  showWarning,
} from '../Common/NotificationManager';

const Container = styled.div`
  color: #0f0;
  width: 100%;
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
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.4em;
    margin-bottom: 1.5em;
  }
`;

const VoiceModelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1em;
  margin-bottom: 1.5em;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5em;
  border: 1px solid #0f03;
  border-radius: 0.3em;

  @media (min-width: 769px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.2em;
    max-height: 350px;
    padding: 1em;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-height: 50vh;
    gap: 0.8em;
    padding: 0.8em;
    margin-bottom: 2em;
  }
`;

const VoiceModelCard = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'provider',
})<{ provider?: string }>`
  border: 1px solid
    ${props => (props.provider === 'elevenlabs' ? '#0af3' : '#0f03')};
  background-color: ${props =>
    props.provider === 'elevenlabs' ? '#001022' : '#001000'};
  padding: 1em;
  border-radius: 0.3em;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props =>
      props.provider === 'elevenlabs' ? '#0af' : '#0f0'};
    background-color: ${props =>
      props.provider === 'elevenlabs' ? '#001830' : '#002000'};
  }

  @media (max-width: 768px) {
    padding: 1.2em;
    margin-bottom: 0.5em;
    min-height: 5em;
  }
`;

const ModelName = styled.div`
  font-weight: bold;
  margin-bottom: 0.5em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0f0;
`;

const ModelDescription = styled.div`
  font-size: 0.8em;
  color: #0f09;
  margin-bottom: 0.5em;
  max-height: 2.4em;
  overflow: hidden;
`;

const ProviderBadge = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'provider',
})<{ provider?: string }>`
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  font-size: 1.2em;
  color: ${props => (props.provider === 'elevenlabs' ? '#0af' : '#0f0')};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5em;
  margin-top: 0.8em;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.8em;
    width: 100%;
  }
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.3em 0.6em;
  font-size: 0.8em;
  cursor: pointer;
  border-radius: 0.2em;

  &:hover {
    background: #0f0;
    color: #000;
  }

  @media (min-width: 769px) {
    padding: 0.6em 1.2em;
    font-size: 1em;
    border-width: 2px;
    border-radius: 0.3em;
    min-width: 100px;
  }

  @media (max-width: 768px) {
    padding: 0.8em 1.2em;
    font-size: 1em;
    width: 100%;
    min-height: 2.5em;
  }
`;

const IconButton = styled.button.withConfig({
  shouldForwardProp: prop => prop !== 'color',
})<{ color?: string }>`
  background: transparent;
  color: ${props => props.color || '#0f0'};
  border: 1px solid ${props => props.color || '#0f0'};
  width: 1.8em;
  height: 1.8em;
  border-radius: 0.2em;
  cursor: pointer;
  font-size: 0.8em;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: ${props => props.color || '#0f0'};
    color: #000;
  }

  @media (min-width: 769px) {
    width: 2.4em;
    height: 2.4em;
    font-size: 1em;
    border-width: 2px;
    border-radius: 0.3em;
  }

  @media (max-width: 768px) {
    width: 2.5em;
    height: 2.5em;
    font-size: 1em;
    min-width: 2.5em;
  }
`;

const TestButton = styled(IconButton)`
  color: #00f;
  border-color: #00f;
`;

const EditButton = styled(IconButton)`
  color: #ff0;
  border-color: #ff0;
`;

const DeleteButton = styled(IconButton)`
  color: #f00;
  border-color: #f00;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2em;
  color: #0f06;
  text-align: center;
  height: 150px;
  border: 1px dashed #0f03;
  border-radius: 0.3em;
`;

const EmptyIcon = styled.div`
  font-size: 2em;
  margin-bottom: 0.5em;
`;

const InfoBox = styled.div`
  padding: 1em;
  border: 1px solid #00f;
  background-color: #000020;
  margin-bottom: 1.5em;
  font-size: 0.9em;
  line-height: 1.4;
  border-radius: 0.3em;
`;

const ErrorBox = styled.div`
  padding: 1em;
  border: 1px solid #f00;
  background-color: #200000;
  margin-bottom: 1.5em;
  font-size: 0.9em;
  color: #f00;
  line-height: 1.4;
  border-radius: 0.3em;
`;

const FormContainer = styled.div`
  margin-top: 1em;
  padding: 1.5em;
  border: 1px solid #0f04;
  border-radius: 0.3em;
  background-color: #000800;

  @media (max-width: 768px) {
    padding: 1.2em;
    margin-top: 1.5em;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.2em;

  @media (max-width: 768px) {
    margin-bottom: 1.5em;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5em;

  @media (max-width: 768px) {
    font-size: 1.1em;
    margin-bottom: 0.8em;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.7em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  margin-bottom: 0.5em;
  font-family: monospace;

  @media (max-width: 768px) {
    padding: 1em;
    font-size: 1em;
    min-height: 2.5em;
    box-sizing: border-box;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 80px;
  padding: 0.7em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  font-family: monospace;
  resize: vertical;

  @media (max-width: 768px) {
    padding: 1em;
    font-size: 1em;
    height: 100px;
    box-sizing: border-box;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #0f03;
  margin-bottom: 1.5em;

  @media (min-width: 769px) {
    border-bottom: 2px solid #0f03;
    margin-bottom: 2em;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5em;
    margin-bottom: 2em;
  }
`;

const Tab = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'active',
})<{ active?: boolean }>`
  padding: 0.6em 1em;
  cursor: pointer;
  border: 1px solid ${props => (props.active ? '#0f0' : 'transparent')};
  border-bottom: none;
  background: ${props => (props.active ? '#001500' : 'transparent')};
  color: ${props => (props.active ? '#0f0' : '#0f08')};
  border-top-left-radius: 0.3em;
  border-top-right-radius: 0.3em;
  margin-right: 0.5em;

  &:hover {
    color: #0f0;
    background: ${props => (props.active ? '#001500' : '#000500')};
  }

  @media (min-width: 769px) {
    padding: 0.8em 1.2em;
    font-size: 1em;
    margin-right: 0.8em;
  }

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    margin-right: 0;
    margin-bottom: 0.5em;
    text-align: center;
    font-size: 1.1em;
    border-radius: 0.3em;
    border: 1px solid ${props => (props.active ? '#0f0' : '#0f03')};
  }
`;

const ProviderSelectionContainer = styled.div`
  display: flex;
  gap: 1em;
  margin-bottom: 1.5em;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.2em;
    margin-bottom: 2em;
  }
`;

const ProviderCard = styled.div.withConfig({
  shouldForwardProp: prop => !['selected', 'provider'].includes(prop),
})<{ selected?: boolean; provider?: string }>`
  flex: 1;
  padding: 1.5em 1em;
  border: 2px solid
    ${props =>
      props.selected
        ? props.provider === 'elevenlabs'
          ? '#0af'
          : '#0f0'
        : '#333'};
  background-color: ${props =>
    props.selected
      ? props.provider === 'elevenlabs'
        ? '#001020'
        : '#001000'
      : '#000'};
  text-align: center;
  cursor: pointer;
  border-radius: 0.5em;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props =>
      props.provider === 'elevenlabs' ? '#001830' : '#002000'};
    border-color: ${props =>
      props.provider === 'elevenlabs' ? '#0af' : '#0f0'};
  }

  @media (max-width: 768px) {
    padding: 2em 1.5em;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
`;

const ProviderIcon = styled.div`
  font-size: 2em;
  margin-bottom: 0.5em;
`;

const ProviderTitle = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'provider',
})<{ provider?: string }>`
  font-weight: bold;
  font-size: 1.1em;
  color: ${props => (props.provider === 'elevenlabs' ? '#0af' : '#0f0')};
  margin-bottom: 0.5em;
`;

const ProviderDescription = styled.div`
  font-size: 0.8em;
  color: #aaa;
  line-height: 1.4;
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

const SliderContainer = styled.div`
  margin-top: 0.5em;
`;

const SliderValue = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
  margin-top: 0.3em;
  color: #0f08;
`;

const SliderValueNumber = styled.span`
  color: #0af;
  font-weight: bold;
`;

const FooterButtons = styled.div`
  margin-top: 1.5em;
  display: flex;
  justify-content: space-between;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1em;
    margin-top: 2em;
  }
`;

const ActionButton = styled(Button)`
  padding: 0.5em 1.2em;
  font-size: 0.9em;

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    font-size: 1.1em;
    width: 100%;
    min-height: 3em;
  }
`;

const BackButton = styled(ActionButton)``;
const AddButton = styled(ActionButton)``;
const SaveButton = styled(ActionButton)`
  background-color: #001500;

  &:hover {
    background-color: #0f0;
  }
`;
const CancelButton = styled(ActionButton)`
  background-color: #150000;
  border-color: #f00;
  color: #f00;

  &:hover {
    background-color: #f00;
    color: #000;
  }
`;

const VoiceBrowserButton = styled(Button)`
  margin-top: 1em;
  width: 100%;
  padding: 0.8em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  background-color: ${props => (props.disabled ? '#001' : '#001030')};
  border-color: #0af;
  color: #0af;

  &:hover:not(:disabled) {
    background-color: #0af;
    color: #000;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 768px) {
    padding: 1.2em;
    font-size: 1.1em;
    margin-top: 1.5em;
    min-height: 3.5em;
  }
`;

const VoiceBrowser = styled.div`
  margin-top: 1.5em;
  border: 1px solid #0af;
  padding: 1em;
  max-height: 300px;
  overflow-y: auto;
  border-radius: 0.3em;
  background-color: #000818;

  @media (max-width: 768px) {
    padding: 1.2em;
    max-height: 40vh;
    margin-top: 2em;
  }
`;

const VoiceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8em;
  border-bottom: 1px solid #0af3;
  cursor: pointer;
  transition: all 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #001030;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.2em;
    gap: 1em;
  }
`;

const VoiceInfo = styled.div`
  flex-grow: 1;
`;

const VoiceName = styled.div`
  font-weight: bold;
  margin-bottom: 0.3em;
  color: #0af;
`;

const VoiceDescription = styled.div`
  font-size: 0.8em;
  color: #0af9;
`;

const SelectButton = styled(Button)`
  border-color: #0af;
  color: #0af;

  &:hover {
    background: #0af;
    color: #000;
  }
`;

const BrowserVoiceSection = styled.div`
  margin-top: 1.5em;
  border-top: 1px solid #0f03;
  padding-top: 1em;
`;

const BrowserVoiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5em;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 1em;
  padding: 0.5em;
  border: 1px solid #0f03;
  border-radius: 0.3em;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-height: 30vh;
    gap: 0.8em;
    padding: 0.8em;
  }
`;

const BrowserVoiceOption = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'selected',
})<{ selected?: boolean }>`
  padding: 0.8em;
  border: 1px solid ${props => (props.selected ? '#0f0' : '#0f03')};
  background-color: ${props => (props.selected ? '#001500' : '#000')};
  border-radius: 0.3em;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => (props.selected ? '#001500' : '#000500')};
    border-color: #0f0;
  }

  @media (max-width: 768px) {
    padding: 1.2em;
    font-size: 1em;
    min-height: 4em;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
`;

const BrowserVoiceName = styled.div`
  font-weight: bold;
  margin-bottom: 0.2em;
`;

const BrowserVoiceDetails = styled.div`
  font-size: 0.8em;
  color: #0f08;
`;

const BrowserVoiceTag = styled.span.withConfig({
  shouldForwardProp: prop => prop !== 'islocal',
})<{ islocal?: boolean }>`
  display: inline-block;
  padding: 0.1em 0.4em;
  background-color: ${props => (props.islocal ? '#0f02' : '#00f2')};
  color: ${props => (props.islocal ? '#0f0' : '#00f')};
  border-radius: 0.2em;
  font-size: 0.7em;
  margin-left: 0.5em;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid #0af;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  margin-right: 0.5em;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

interface VoiceModelManagerProps {
  onBack: () => void;
}

const VoiceModelManager: React.FC<VoiceModelManagerProps> = ({ onBack }) => {
  const [models, setModels] = useState<Record<string, VoiceModel>>({});
  const [editingModel, setEditingModel] = useState<VoiceModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [elevenlabsKeyExists, setElevenlabsKeyExists] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>(
    []
  );
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'general' | 'settings'>('general');

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<string>('');

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
      showError('ElevenLabs API key is not set');
      return;
    }

    try {
      setLoadingVoices(true);

      const voicesData = await getVoices();
      setAvailableVoices(voicesData.voices || []);

      showSuccess(
        `Loaded ${voicesData.voices?.length || 0} voices from ElevenLabs`
      );
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      showError('Error loading ElevenLabs voices');
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
        similarity_boost: 0.5,
      },
    });
    setIsEditing(false);
    setActiveTab('general');
  };

  const handleEdit = (model: VoiceModel) => {
    setEditingModel({ ...model });
    setIsEditing(true);
    setActiveTab('general');

    // If it's a browser voice, set the selected browser voice
    if (model.provider === 'browser' && model.voiceId) {
      setSelectedBrowserVoice(model.voiceId);
    }
  };
  const handleDelete = (id: string) => {
    // Show confirmation dialog
    setModelToDelete(id);
    setShowDeleteConfirmation(true);
  };
  const confirmDelete = () => {
    const updatedModels = { ...models };
    delete updatedModels[modelToDelete];
    saveVoiceModels(updatedModels);
    setModels(updatedModels);

    // Dispatch event to notify that voice models have been updated
    dispatchAppEvent(EVENTS.VOICE_MODELS_UPDATED, { models: updatedModels });

    showSuccess('Voice model deleted successfully');

    // Close dialog
    setShowDeleteConfirmation(false);
    setModelToDelete('');
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setModelToDelete('');
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
            const selectedVoice = voices.find(
              v => v.voiceURI === model.voiceId
            );
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          }

          window.speechSynthesis.speak(utterance);

          showSuccess('Testing browser voice synthesis');
        } else {
          showError('Speech synthesis not supported in this browser');
        }
      } else if (model.provider === 'elevenlabs') {
        // For ElevenLabs, we would use the API in production
        // For the demo, just use browser speech synthesis as a placeholder
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(testText);
          window.speechSynthesis.speak(utterance);

          showSuccess('Testing ElevenLabs voice (simulated for demo)');
        } else {
          showError('Speech synthesis not supported in this browser');
        }
      }
    } catch (error) {
      console.error('Error testing voice:', error);
      showError('Error testing voice');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    if (!editingModel) return;

    const { name, value } = e.target;

    if (name.startsWith('settings.')) {
      const settingName = name.split('.')[1];
      setEditingModel({
        ...editingModel,
        settings: {
          ...editingModel.settings,
          [settingName]: parseFloat(value),
        },
      });
    } else {
      setEditingModel({
        ...editingModel,
        [name]: value,
      });
    }
  };

  const handleSelectProvider = (provider: string) => {
    if (!editingModel) return;

    setEditingModel({
      ...editingModel,
      provider,
      // Clear the voiceId when switching providers
      voiceId: '',
    });

    // Reset selected browser voice when changing providers
    if (provider === 'browser') {
      setSelectedBrowserVoice('');
    }
  };

  const handleSelectBrowserVoice = (voiceURI: string) => {
    setSelectedBrowserVoice(voiceURI);

    if (editingModel) {
      setEditingModel({
        ...editingModel,
        voiceId: voiceURI,
      });
    }
  };
  const handleSave = () => {
    if (!editingModel || !editingModel.name.trim()) {
      showError('Please provide a name for the voice model');
      return;
    }

    // Additional validation for ElevenLabs voice models
    if (editingModel.provider === 'elevenlabs' && !editingModel.voiceId) {
      showError('Please provide a Voice ID for ElevenLabs voice models');
      return;
    }

    // For browser voice models, ensure a voice is selected
    if (editingModel.provider === 'browser' && !editingModel.voiceId) {
      showError('Please select a browser voice');
      return;
    }

    const updatedModels = {
      ...models,
      [editingModel.id]: editingModel,
    };

    try {
      saveVoiceModels(updatedModels);
      setModels(updatedModels);
      setEditingModel(null);

      // Dispatch event to notify that voice models have been updated
      dispatchAppEvent(EVENTS.VOICE_MODELS_UPDATED, { models: updatedModels });

      showSuccess(
        isEditing
          ? 'Voice model updated successfully'
          : 'Voice model added successfully'
      );
    } catch (error) {
      showError('Error saving voice model');
      console.error('Failed to save voice model:', error);
    }
  };

  const handleCancel = () => {
    setEditingModel(null);
    setSelectedBrowserVoice('');
  };

  // Get provider icon for cards
  const getProviderIcon = (provider: string): JSX.Element => {
    if (provider === 'elevenlabs') {
      return <ProviderBadge provider="elevenlabs">🌟</ProviderBadge>;
    } else {
      return <ProviderBadge provider="browser">🔊</ProviderBadge>;
    }
  };

  return (
    <Container>
      <Title>Manage Voice Models</Title>

      {!elevenlabsKeyExists && (
        <ErrorBox>
          ElevenLabs API key is not set. You can still create browser-based
          voice models, but ElevenLabs premium voices require an API key from
          the "Manage API Keys" section.
        </ErrorBox>
      )}

      {elevenlabsKeyExists && !editingModel && (
        <InfoBox>
          Voice models allow ALTER EGO to speak using different voices. You can
          add ElevenLabs premium voices for higher quality output or use free
          browser speech synthesis for basic functionality.
        </InfoBox>
      )}

      {!editingModel ? (
        <>
          <VoiceModelGrid>
            {Object.keys(models).length === 0 ? (
              <EmptyState>
                <EmptyIcon>🔊</EmptyIcon>
                <div>No voice models added yet.</div>
              </EmptyState>
            ) : (
              Object.values(models).map(model => (
                <VoiceModelCard
                  key={model.id}
                  provider={model.provider}
                  onClick={() => handleEdit(model)}
                >
                  {getProviderIcon(model.provider)}
                  <ModelName>{model.name}</ModelName>
                  <ModelDescription>
                    {model.description || 'No description'}
                  </ModelDescription>
                  <ActionButtons>
                    <TestButton
                      color="#00f"
                      onClick={e => {
                        e.stopPropagation();
                        handleTestVoice(model);
                      }}
                      title="Test Voice"
                    >
                      🔈
                    </TestButton>
                    <EditButton
                      color="#ff0"
                      onClick={e => {
                        e.stopPropagation();
                        handleEdit(model);
                      }}
                      title="Edit"
                    >
                      ✏️
                    </EditButton>
                    <DeleteButton
                      color="#f00"
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(model.id);
                      }}
                      title="Delete"
                    >
                      ×
                    </DeleteButton>
                  </ActionButtons>
                </VoiceModelCard>
              ))
            )}
          </VoiceModelGrid>

          <FooterButtons>
            <BackButton onClick={onBack}>Back</BackButton>
            <AddButton onClick={handleAddNew}>Add New Voice Model</AddButton>
          </FooterButtons>
        </>
      ) : (
        <FormContainer>
          <TabContainer>
            <Tab
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
            >
              General
            </Tab>
            {editingModel.provider === 'elevenlabs' && (
              <Tab
                active={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
              >
                Voice Settings
              </Tab>
            )}
          </TabContainer>

          {activeTab === 'general' ? (
            <>
              <FormGroup>
                <Label htmlFor="name">
                  Voice Model Name: <RequiredTag>Required</RequiredTag>
                </Label>
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
                <Label htmlFor="description">
                  Description: <OptionalTag>Optional</OptionalTag>
                </Label>
                <TextArea
                  id="description"
                  name="description"
                  value={editingModel.description}
                  onChange={handleChange}
                  placeholder="A brief description of this voice model"
                />
              </FormGroup>

              <FormGroup>
                <Label>Voice Provider:</Label>
                <ProviderSelectionContainer>
                  <ProviderCard
                    selected={editingModel.provider === 'browser'}
                    provider="browser"
                    onClick={() => handleSelectProvider('browser')}
                  >
                    <ProviderIcon>🔊</ProviderIcon>
                    <ProviderTitle provider="browser">
                      Browser Speech
                    </ProviderTitle>
                    <ProviderDescription>
                      Free, works offline, available on all devices. Quality
                      varies by browser and platform.
                    </ProviderDescription>
                  </ProviderCard>

                  <ProviderCard
                    selected={editingModel.provider === 'elevenlabs'}
                    provider="elevenlabs"
                    onClick={() => handleSelectProvider('elevenlabs')}
                  >
                    <ProviderIcon>🌟</ProviderIcon>
                    <ProviderTitle provider="elevenlabs">
                      ElevenLabs
                    </ProviderTitle>
                    <ProviderDescription>
                      Premium quality AI voice synthesis. Requires API key and
                      internet connection.
                    </ProviderDescription>
                  </ProviderCard>
                </ProviderSelectionContainer>
              </FormGroup>

              {editingModel.provider === 'elevenlabs' ? (
                <FormGroup>
                  <Label htmlFor="voiceId">
                    ElevenLabs Voice ID: <RequiredTag>Required</RequiredTag>
                  </Label>
                  <Input
                    type="text"
                    id="voiceId"
                    name="voiceId"
                    value={editingModel.voiceId || ''}
                    onChange={handleChange}
                    placeholder="Enter ElevenLabs Voice ID"
                  />

                  <VoiceBrowserButton
                    onClick={fetchElevenLabsVoices}
                    disabled={loadingVoices || !elevenlabsKeyExists}
                  >
                    {loadingVoices ? (
                      <>
                        <LoadingSpinner />
                        Loading Voices...
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        Browse Available ElevenLabs Voices
                      </>
                    )}
                  </VoiceBrowserButton>

                  {!elevenlabsKeyExists && (
                    <ErrorBox>
                      ElevenLabs API key is required to use premium voices.
                      Please add your API key in "Manage API Keys".
                    </ErrorBox>
                  )}

                  {availableVoices.length > 0 && (
                    <VoiceBrowser>
                      {availableVoices.map(voice => (
                        <VoiceItem
                          key={voice.voice_id}
                          onClick={() => {
                            setEditingModel({
                              ...editingModel,
                              voiceId: voice.voice_id,
                              name: editingModel.name || voice.name,
                              description:
                                editingModel.description ||
                                `${voice.name} - ${voice.labels?.accent || 'Unknown accent'}`,
                            });
                          }}
                        >
                          <VoiceInfo>
                            <VoiceName>{voice.name}</VoiceName>
                            <VoiceDescription>
                              {Object.entries(voice.labels || {})
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')}
                            </VoiceDescription>
                          </VoiceInfo>
                          <SelectButton>Select</SelectButton>
                        </VoiceItem>
                      ))}
                    </VoiceBrowser>
                  )}
                </FormGroup>
              ) : (
                <BrowserVoiceSection>
                  <Label>
                    Select Browser Voice: <RequiredTag>Required</RequiredTag>
                  </Label>

                  {browserVoices.length === 0 ? (
                    <InfoBox>
                      No browser voices detected. Voice support may vary
                      depending on your browser and operating system.
                    </InfoBox>
                  ) : (
                    <BrowserVoiceGrid>
                      {browserVoices.map((voice, index) => (
                        <BrowserVoiceOption
                          key={`${voice.voiceURI}-${index}`}
                          selected={selectedBrowserVoice === voice.voiceURI}
                          onClick={() =>
                            handleSelectBrowserVoice(voice.voiceURI)
                          }
                        >
                          <BrowserVoiceName>
                            {voice.name}
                            <BrowserVoiceTag islocal={voice.localService}>
                              {voice.localService ? 'Local' : 'Remote'}
                            </BrowserVoiceTag>
                          </BrowserVoiceName>
                          <BrowserVoiceDetails>
                            {voice.lang}
                          </BrowserVoiceDetails>
                        </BrowserVoiceOption>
                      ))}
                    </BrowserVoiceGrid>
                  )}
                </BrowserVoiceSection>
              )}
            </>
          ) : (
            // Settings tab for ElevenLabs
            <>
              <FormGroup>
                <Label htmlFor="settings.stability">
                  Stability: Affects variation in voice output
                </Label>
                <SliderContainer>
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
                  <SliderValue>
                    <span>Less stable</span>
                    <SliderValueNumber>
                      {editingModel.settings?.stability?.toFixed(2) || '0.50'}
                    </SliderValueNumber>
                    <span>More stable</span>
                  </SliderValue>
                </SliderContainer>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="settings.similarity_boost">
                  Similarity Boost: How closely to match the original voice
                </Label>
                <SliderContainer>
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
                  <SliderValue>
                    <span>More variation</span>
                    <SliderValueNumber>
                      {editingModel.settings?.similarity_boost?.toFixed(2) ||
                        '0.50'}
                    </SliderValueNumber>
                    <span>More similar</span>
                  </SliderValue>
                </SliderContainer>
              </FormGroup>

              <InfoBox>
                <strong>Voice Settings Guide:</strong>
                <br />
                <strong>Stability</strong> - Higher values create consistent
                output but may sound monotonous. Lower values add more emotion
                but may be unpredictable.
                <br />
                <strong>Similarity Boost</strong> - Higher values make the voice
                sound closer to the original voice sample, lower values allow
                more creativity.
              </InfoBox>
            </>
          )}

          <FooterButtons>
            <CancelButton onClick={handleCancel}>Cancel</CancelButton>
            <SaveButton onClick={handleSave}>Save Voice Model</SaveButton>{' '}
          </FooterButtons>
        </FormContainer>
      )}

      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Voice Model"
        message={`Are you sure you want to delete this voice model? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </Container>
  );
};

export default VoiceModelManager;
