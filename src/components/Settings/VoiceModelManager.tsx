import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadVoiceModels, saveVoiceModels, VoiceModel } from '../../utils/storageUtils';

const Container = styled.div`
  color: #0f0;
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

const ModelProvider = styled.div`
  font-size: 0.75em;
  color: #0f07;
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

const StatusMessage = styled.p`
  margin-top: 1em;
  text-align: center;
  font-weight: bold;
`;

interface VoiceModelManagerProps {
  onBack: () => void;
}

const VoiceModelManager: React.FC<VoiceModelManagerProps> = ({ onBack }) => {
  const [models, setModels] = useState<Record<string, VoiceModel>>({});
  const [editingModel, setEditingModel] = useState<VoiceModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  
  useEffect(() => {
    // Load existing voice models
    const savedModels = loadVoiceModels();
    setModels(savedModels);
  }, []);
  
  const handleAddNew = () => {
    setEditingModel({
      id: `model_${Date.now()}`,
      name: '',
      description: '',
      provider: 'elevenlabs'
    });
    setIsEditing(false);
  };
  
  const handleEdit = (model: VoiceModel) => {
    setEditingModel({ ...model });
    setIsEditing(true);
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this voice model?')) {
      const updatedModels = { ...models };
      delete updatedModels[id];
      saveVoiceModels(updatedModels);
      setModels(updatedModels);
      
      setStatus('Voice model deleted successfully');
      setTimeout(() => setStatus(null), 3000);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editingModel) return;
    
    const { name, value } = e.target;
    setEditingModel({
      ...editingModel,
      [name]: value
    });
  };
  
  const handleSave = () => {
    if (!editingModel || !editingModel.name.trim()) {
      setStatus('Please provide a name for the voice model');
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
      
      setStatus(isEditing ? 'Voice model updated successfully' : 'Voice model added successfully');
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus('Error saving voice model');
      console.error('Failed to save voice model:', error);
    }
  };
  
  const handleCancel = () => {
    setEditingModel(null);
  };
  
  return (
    <Container>
      <Title>Manage Voice Models</Title>
      
      <VoiceModelList>
        {Object.keys(models).length === 0 ? (
          <EmptyState>No voice models added yet.</EmptyState>
        ) : (
          Object.values(models).map(model => (
            <VoiceModelItem key={model.id}>
              <ModelInfo>
                <ModelName>{model.name}</ModelName>
                <ModelDescription>{model.description}</ModelDescription>
                <ModelProvider>Provider: {model.provider}</ModelProvider>
              </ModelInfo>
              <ButtonGroup>
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
            <Label htmlFor="name">Name:</Label>
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
            <Label htmlFor="description">Description:</Label>
            <TextArea
              id="description"
              name="description"
              value={editingModel.description}
              onChange={handleChange}
              placeholder="A brief description of this voice model"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="provider">Provider:</Label>
            <Select
              id="provider"
              name="provider"
              value={editingModel.provider}
              onChange={handleChange}
            >
              <option value="elevenlabs">ElevenLabs</option>
              <option value="browser">Browser Default</option>
            </Select>
          </FormGroup>
          
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
      
      {status && <StatusMessage>{status}</StatusMessage>}
    </Container>
  );
};

export default VoiceModelManager;