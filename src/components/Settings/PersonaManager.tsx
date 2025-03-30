import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadPersonas, savePersonas, Persona } from '../../utils/storageUtils';
import { dispatchAppEvent, EVENTS } from '../../utils/events';

const Container = styled.div`
  color: #0f0;
  width: 100%;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const PersonaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1em;
  margin-bottom: 1.5em;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5em;
  border: 1px solid #0f03;
`;

const PersonaCard = styled.div<{ isActive?: boolean }>`
  border: 1px solid ${props => props.isActive ? '#0f0' : '#0f03'};
  background-color: ${props => props.isActive ? '#001500' : '#000'};
  padding: 1em;
  border-radius: 0.3em;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #0f0;
    background-color: #001000;
  }
`;

const PersonaName = styled.div`
  font-weight: bold;
  margin-bottom: 0.5em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PersonaDate = styled.div`
  font-size: 0.7em;
  color: #0f08;
  margin-bottom: 0.5em;
`;

const PersonaTag = styled.span`
  background-color: #0f01;
  color: #0f0;
  font-size: 0.7em;
  padding: 0.2em 0.4em;
  border-radius: 2px;
  margin-left: 0.3em;
  vertical-align: middle;
`;

const ActionButtons = styled.div`
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  display: flex;
  gap: 0.3em;
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.3em 0.6em;
  border-radius: 0.2em;
  cursor: pointer;
  font-size: 0.8em;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const IconButton = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  width: 1.6em;
  height: 1.6em;
  border-radius: 0.2em;
  cursor: pointer;
  font-size: 0.8em;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const DeleteButton = styled(IconButton)`
  color: #f00;
  border-color: #f00;
  
  &:hover {
    background: #f00;
    color: #000;
  }
`;

const EditButton = styled(IconButton)`
  color: #ff0;
  border-color: #ff0;
  
  &:hover {
    background: #ff0;
    color: #000;
  }
`;

const ViewButton = styled(IconButton)`
  color: #0af;
  border-color: #0af;
  
  &:hover {
    background: #0af;
    color: #000;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2em;
  color: #0f05;
  text-align: center;
  height: 150px;
  border: 1px dashed #0f03;
`;

const EmptyIcon = styled.div`
  font-size: 2em;
  margin-bottom: 0.5em;
`;

const FormContainer = styled.div`
  margin-top: 1em;
  padding: 1.5em;
  border: 1px solid #0f04;
  border-radius: 0.3em;
`;

const FormGroup = styled.div`
  margin-bottom: 1em;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.7em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  font-family: monospace;
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 200px;
  padding: 0.7em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  border-radius: 0.2em;
  font-family: monospace;
  resize: vertical;
`;

const ReadOnlyTextArea = styled(TextArea)`
  background-color: #001;
  border-color: #0f03;
  color: #0f08;
  cursor: not-allowed;
`;

const FormButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1.5em;
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

const ProtectedInfoBox = styled(InfoBox)`
  border-color: #f80;
  background-color: #200800;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1em;
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

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #0f03;
  margin-bottom: 1.5em;
`;

const Tab = styled.div<{ active?: boolean }>`
  padding: 0.6em 1em;
  cursor: pointer;
  border: 1px solid ${props => props.active ? '#0f0' : 'transparent'};
  border-bottom: none;
  background: ${props => props.active ? '#001500' : 'transparent'};
  color: ${props => props.active ? '#0f0' : '#0f08'};
  border-top-left-radius: 0.3em;
  border-top-right-radius: 0.3em;
  margin-right: 0.5em;
  
  &:hover {
    color: #0f0;
    background: ${props => props.active ? '#001500' : '#000500'};
  }
`;

const StatusMessage = styled.p<{ success?: boolean }>`
  margin-top: 1em;
  text-align: center;
  font-weight: bold;
  color: ${props => props.success ? '#0f0' : '#f00'};
`;

const PreviewContainer = styled.div`
  margin-top: 1.5em;
  padding: 1em;
  border: 1px solid #0f03;
  border-radius: 0.3em;
  background: #000800;
`;

const PreviewTitle = styled.h3`
  margin-top: 0;
  font-size: 1em;
  margin-bottom: 1em;
  color: #0f09;
`;

const PreviewContent = styled.div`
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 150px;
  overflow-y: auto;
  padding: 0.5em;
  border: 1px solid #0f02;
  background: #000;
  border-radius: 0.2em;
`;

const PersonaInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  margin-top: 1em;
  padding: 1em;
  border: 1px solid #0f03;
  border-radius: 0.3em;
`;

const PersonaInfoRow = styled.div`
  display: flex;
  gap: 1em;
`;

const PersonaInfoLabel = styled.div`
  font-weight: bold;
  color: #0f09;
  width: 100px;
`;

const PersonaInfoValue = styled.div`
  flex: 1;
`;

interface PersonaManagerProps {
  onBack: () => void;
}

const PersonaManager: React.FC<PersonaManagerProps> = ({ onBack }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'content'>('details');
  const [viewingPersona, setViewingPersona] = useState<Persona | null>(null);
  
  useEffect(() => {
    // Load personas
    const loadedPersonas = loadPersonas();
    setPersonas(loadedPersonas);
  }, []);

  const handleCreateNew = () => {
    setEditingPersona({
      name: '',
      content: 'You are a helpful assistant.',
      lastModified: new Date().toISOString()
    });
    setViewingPersona(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEdit = (persona: Persona) => {
    setEditingPersona({ ...persona });
    setViewingPersona(null);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleView = (persona: Persona) => {
    setEditingPersona(null);
    setViewingPersona({ ...persona });
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleDelete = (personaName: string) => {
    // Don't allow deleting the base ALTER EGO persona
    if (personaName === "ALTER EGO") {
      setStatus('Cannot delete the default "ALTER EGO" persona');
      setIsSuccess(false);
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete the persona "${personaName}"?`)) {
      const updatedPersonas = personas.filter(p => p.name !== personaName);
      savePersonas(updatedPersonas);
      setPersonas(updatedPersonas);
      
      // Reset the editing state if we were editing this persona
      if (editingPersona && editingPersona.name === personaName) {
        setEditingPersona(null);
      }
      
      // Reset the viewing state if we were viewing this persona
      if (viewingPersona && viewingPersona.name === personaName) {
        setViewingPersona(null);
      }
      
      setStatus(`Persona "${personaName}" deleted successfully`);
      setIsSuccess(true);
      setTimeout(() => setStatus(null), 3000);
      
      // Dispatch event to notify that personas have been updated
      dispatchAppEvent('personas-updated', { personas: updatedPersonas });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingPersona) return;
    
    const { name, value } = e.target;
    setEditingPersona({
      ...editingPersona,
      [name]: value,
      lastModified: new Date().toISOString()
    });
  };

  const handleSave = () => {
    if (!editingPersona) return;
    
    if (!editingPersona.name.trim()) {
      setStatus('Please provide a name for the persona');
      setIsSuccess(false);
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    
    // Check if the name already exists (for new personas)
    if (isCreating && personas.some(p => p.name === editingPersona.name)) {
      setStatus(`A persona named "${editingPersona.name}" already exists`);
      setIsSuccess(false);
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    
    // Create updated persona list
    const updatedPersonas = isEditing
      ? personas.map(p => (p.name === editingPersona.name ? editingPersona : p))
      : [...personas, editingPersona];
    
    savePersonas(updatedPersonas);
    setPersonas(updatedPersonas);
    
    setStatus(`Persona "${editingPersona.name}" ${isEditing ? 'updated' : 'created'} successfully`);
    setIsSuccess(true);
    setTimeout(() => setStatus(null), 3000);
    
    setEditingPersona(null);
    setIsEditing(false);
    setIsCreating(false);
    
    // Dispatch event to notify that personas have been updated
    dispatchAppEvent('personas-updated', { personas: updatedPersonas });
  };

  const handleCancel = () => {
    setEditingPersona(null);
    setViewingPersona(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Check if a persona is the default ALTER EGO persona
  const isDefaultPersona = (name: string) => name === "ALTER EGO";

  // Render the persona list and editor
  return (
    <Container>
      <Title>Manage Personas</Title>
      
      {!editingPersona && !viewingPersona && !isCreating && (
        <InfoBox>
          Personas define how ALTER EGO behaves and responds. Each persona has specific characteristics and knowledge. 
          You can create, edit, and switch between different personas using the Load Character button in the main interface.
        </InfoBox>
      )}
      
      {!editingPersona && !viewingPersona && !isCreating ? (
        <>
          <PersonaGrid>
            {personas.length === 0 ? (
              <EmptyState>
                <EmptyIcon>👤</EmptyIcon>
                <div>No personas found</div>
                <div>Click "Create New" to add a persona</div>
              </EmptyState>
            ) : (
              personas.map(persona => (
                <PersonaCard 
                  key={persona.name}
                  onClick={() => handleView(persona)}
                >
                  <PersonaName>
                    {persona.name}
                    {isDefaultPersona(persona.name) && <PersonaTag>Default</PersonaTag>}
                  </PersonaName>
                  <PersonaDate>
                    Modified: {formatDate(persona.lastModified)}
                  </PersonaDate>
                  <ActionButtons>
                    <ViewButton onClick={(e) => {
                      e.stopPropagation();
                      handleView(persona);
                    }} title="View">
                      👁️
                    </ViewButton>
                    <EditButton onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(persona);
                    }} title="Edit">
                      ✏️
                    </EditButton>
                    {!isDefaultPersona(persona.name) && (
                      <DeleteButton onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(persona.name);
                      }} title="Delete">
                        ×
                      </DeleteButton>
                    )}
                  </ActionButtons>
                </PersonaCard>
              ))
            )}
          </PersonaGrid>
          
          <ButtonContainer>
            <Button onClick={onBack}>Back</Button>
            <Button onClick={handleCreateNew}>Create New</Button>
          </ButtonContainer>
        </>
      ) : editingPersona ? (
        // Editing or creating persona
        <FormContainer>
          <TabContainer>
            <Tab 
              active={activeTab === 'details'} 
              onClick={() => setActiveTab('details')}
            >
              Details
            </Tab>
            <Tab 
              active={activeTab === 'content'} 
              onClick={() => setActiveTab('content')}
            >
              Content
            </Tab>
          </TabContainer>
          
          {activeTab === 'details' ? (
            // Details tab
            <FormGroup>
              <Label htmlFor="name">Persona Name: <RequiredTag>Required</RequiredTag></Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={editingPersona.name}
                onChange={handleChange}
                placeholder="e.g., Sci-Fi Assistant"
                readOnly={isEditing && isDefaultPersona(editingPersona.name)} // Don't allow renaming the default persona
              />
              
              {isCreating && (
                <PreviewContainer>
                  <PreviewTitle>Basic Persona Preview</PreviewTitle>
                  <PreviewContent>
                    Name: {editingPersona.name || '[Name required]'}{'\n'}
                    Created: {formatDate(editingPersona.lastModified)}{'\n'}
                    Behavior: Will respond as {editingPersona.name || 'the specified persona'}, with specific traits and knowledge defined in the Content tab.
                  </PreviewContent>
                </PreviewContainer>
              )}
            </FormGroup>
          ) : (
            // Content tab
            <FormGroup>
              <Label htmlFor="content">Persona Instructions:</Label>
              
              {isDefaultPersona(editingPersona.name) ? (
                // Read-only textarea for ALTER EGO default persona
                <>
                  <ReadOnlyTextArea
                    id="content"
                    name="content"
                    value={editingPersona.content}
                    readOnly
                  />
                  <ProtectedInfoBox>
                    The default ALTER EGO persona cannot be modified. This is the baseline personality
                    that defines the core behavior of the system. To create a customized version,
                    please create a new persona instead.
                  </ProtectedInfoBox>
                </>
              ) : (
                // Editable textarea for all other personas
                <>
                  <TextArea
                    id="content"
                    name="content"
                    value={editingPersona.content}
                    onChange={handleChange}
                    placeholder="Describe how this persona should behave, what knowledge they have, their personality, etc."
                  />
                  
                  <InfoBox>
                    Write detailed instructions for how this persona should behave. For example:
                    "You are a helpful assistant specializing in science fiction. You're enthusiastic about space exploration, 
                    futuristic technology, and speculative science. When asked about sci-fi topics, provide detailed, 
                    imaginative responses that reference major works in the genre."
                  </InfoBox>
                </>
              )}
            </FormGroup>
          )}
          
          <FormButtons>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </FormButtons>
        </FormContainer>
      ) : viewingPersona ? (
        // Viewing persona details
        <div>
          <PersonaInfoContainer>
            <PersonaInfoRow>
              <PersonaInfoLabel>Name:</PersonaInfoLabel>
              <PersonaInfoValue>
                {viewingPersona.name}
                {isDefaultPersona(viewingPersona.name) && <PersonaTag>Default</PersonaTag>}
              </PersonaInfoValue>
            </PersonaInfoRow>
            <PersonaInfoRow>
              <PersonaInfoLabel>Modified:</PersonaInfoLabel>
              <PersonaInfoValue>{formatDate(viewingPersona.lastModified || '')}</PersonaInfoValue>
            </PersonaInfoRow>
            <PersonaInfoRow>
              <PersonaInfoLabel>Content:</PersonaInfoLabel>
              <PersonaInfoValue>
                <PreviewContent>
                  {viewingPersona.content}
                </PreviewContent>
              </PersonaInfoValue>
            </PersonaInfoRow>
          </PersonaInfoContainer>
          
          <FormButtons>
            <Button onClick={handleCancel}>Back</Button>
            <Button onClick={() => handleEdit(viewingPersona)}>Edit</Button>
            {/* Removed the Activate button as requested */}
          </FormButtons>
        </div>
      ) : null}
      
      {status && <StatusMessage success={isSuccess || undefined}>{status}</StatusMessage>}
    </Container>
  );
};

export default PersonaManager;