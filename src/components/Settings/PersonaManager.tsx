import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadPersonas, savePersonas, Persona } from '../../utils/storageUtils';

const Container = styled.div`
  color: #0f0;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const PersonaList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1em 0;
  max-height: 200px;
  overflow-y: auto;
`;

const PersonaItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5em 0;
  border-bottom: 1px solid #0f03;
`;

const PersonaName = styled.span`
  flex-grow: 1;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5em;
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.3em 0.5em;
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

const FormContainer = styled.div`
  margin-top: 1em;
  border-top: 1px solid #0f03;
  padding-top: 1em;
`;

const FormGroup = styled.div`
  margin-bottom: 1em;
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

const TextArea = styled.textarea`
  width: 100%;
  height: 100px;
  padding: 0.5em;
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  font-family: monospace;
  resize: vertical;
`;

const BackButton = styled(Button)`
  margin-top: 1em;
`;

interface PersonaManagerProps {
  onBack: () => void;
}

const PersonaManager: React.FC<PersonaManagerProps> = ({ onBack }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    setPersonas(loadPersonas());
  }, []);
  
  const handleAddNew = () => {
    setEditingPersona({
      name: '',
      content: '',
      lastModified: new Date().toISOString()
    });
    setIsEditing(false);
  };
  
  const handleEdit = (persona: Persona) => {
    setEditingPersona({ ...persona });
    setIsEditing(true);
  };
  
  const handleDelete = (name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      const updatedPersonas = personas.filter(p => p.name !== name);
      savePersonas(updatedPersonas);
      setPersonas(updatedPersonas);
    }
  };
  
  const handleSave = () => {
    if (!editingPersona || !editingPersona.name.trim()) return;
    
    const updatedPersona: Persona = {
      ...editingPersona,
      lastModified: new Date().toISOString()
    };
    
    let updatedPersonas: Persona[];
    
    if (isEditing) {
      // Update existing persona
      updatedPersonas = personas.map(p => 
        p.name === updatedPersona.name ? updatedPersona : p
      );
    } else {
      // Add new persona
      updatedPersonas = [...personas, updatedPersona];
    }
    
    savePersonas(updatedPersonas);
    setPersonas(updatedPersonas);
    setEditingPersona(null);
  };
  
  const handleCancel = () => {
    setEditingPersona(null);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingPersona) return;
    
    const { name, value } = e.target;
    setEditingPersona({
      ...editingPersona,
      [name]: value
    });
  };
  
  return (
    <Container>
      <Title>Manage Personas</Title>
      
      <PersonaList>
        {personas.map(persona => (
          <PersonaItem key={persona.name}>
            <PersonaName>{persona.name}</PersonaName>
            <ButtonGroup>
              <Button onClick={() => handleEdit(persona)}>Edit</Button>
              {persona.name !== 'ALTER EGO' && (
                <DeleteButton onClick={() => handleDelete(persona.name)}>Delete</DeleteButton>
              )}
            </ButtonGroup>
          </PersonaItem>
        ))}
      </PersonaList>
      
      <Button onClick={handleAddNew}>Add New Persona</Button>
      
      {editingPersona && (
        <FormContainer>
          <FormGroup>
            <Label htmlFor="name">Name:</Label>
            <Input
              id="name"
              name="name"
              value={editingPersona.name}
              onChange={handleChange}
              disabled={isEditing}
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="content">Persona Description:</Label>
            <TextArea
              id="content"
              name="content"
              value={editingPersona.content}
              onChange={handleChange}
            />
          </FormGroup>
          
          <ButtonGroup>
            <Button onClick={handleSave}>Save</Button>
            <Button onClick={handleCancel}>Cancel</Button>
          </ButtonGroup>
        </FormContainer>
      )}
      
      <BackButton onClick={onBack}>Back to Settings</BackButton>
    </Container>
  );
};

export default PersonaManager;