import React, { useState, useEffect, startTransition } from 'react';
import styled from 'styled-components';
import { loadPersonas, savePersonas, Persona, isExamplePersonaName } from '../../utils/storageUtils';
import { dispatchAppEvent, EVENTS } from '../../utils/events';
import ConfirmationDialog from '../Common/ConfirmationDialog';
import { showSuccess, showError } from '../Common/NotificationManager';
import { UserIcon, EyeIcon, PencilIcon, TrashIcon } from '../Common/Icons';

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

const PersonaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1em;
  margin-bottom: 1.5em;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5em;
  border: 1px solid #0f03;

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

const PersonaCard = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'isActive',
})<{ isActive?: boolean }>`
  border: 1px solid ${props => (props.isActive ? '#0f0' : '#0f03')};
  background-color: ${props => (props.isActive ? '#001500' : '#000')};
  padding: 1em;
  border-radius: 0.3em;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    border-color: #0f0;
    background-color: #001000;
  }

  @media (min-width: 769px) {
    padding: 1.2em;
    min-height: 140px;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 768px) {
    padding: 1.2em;
    margin-bottom: 0.5em;
    min-height: 4em;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
`;

const PersonaName = styled.div`
  font-weight: bold;
  margin-bottom: 0.5em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    font-size: 1.1em;
    white-space: normal;
    text-align: center;
    margin-bottom: 0.8em;
  }
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

  @media (max-width: 768px) {
    position: relative;
    top: auto;
    right: auto;
    justify-content: center;
    margin-top: 0.5em;
    gap: 0.8em;
  }
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

  @media (min-width: 769px) {
    padding: 0.5em 1em;
    font-size: 0.9em;
    border-width: 2px;
    border-radius: 0.3em;
    min-width: 80px;
  }

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    font-size: 1em;
    min-width: 8em;
    touch-action: manipulation;
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
  flex-shrink: 0;

  &:hover {
    background: #0f0;
    color: #000;
  }

  @media (min-width: 769px) {
    width: 2.2em;
    height: 2.2em;
    font-size: 1em;
    border-width: 2px;
    border-radius: 0.3em;
  }

  @media (max-width: 768px) {
    width: 3em;
    height: 3em;
    font-size: 1.2em;
    touch-action: manipulation;
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

  @media (max-width: 768px) {
    padding: 1.5em 1em;
    margin-top: 1.5em;
    border-width: 2px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1em;

  @media (max-width: 768px) {
    margin-bottom: 2em;
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
  font-family: monospace;

  @media (max-width: 768px) {
    padding: 1em;
    font-size: 1em;
    border-width: 2px;
  }
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

  @media (max-width: 768px) {
    padding: 1em;
    height: 150px;
    font-size: 1em;
    border-width: 2px;
  }
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

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1em;
    margin-top: 2em;

    button {
      width: 100%;
      max-width: none;
    }
  }
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

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1em;
    margin-top: 2em;

    button {
      width: 100%;
      padding: 1.2em;
      font-size: 1.1em;
    }
  }
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

// --- Template Picker Styled Components ---

const TemplatePickerTitle = styled.h3`
  font-size: 1em;
  color: #0f09;
  margin: 0 0 0.4em 0;
  text-align: center;
`;

const TemplatePickerSubtitle = styled.p`
  font-size: 0.85em;
  color: #0f07;
  text-align: center;
  margin: 0 0 1.5em 0;
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1em;
  margin-bottom: 1.5em;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TemplateCard = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'tier',
})<{ tier: 'quick' | 'standard' | 'full' }>`
  border: 1px solid
    ${p =>
      p.tier === 'quick'
        ? '#0f04'
        : p.tier === 'standard'
        ? '#0af4'
        : '#fa04'};
  border-radius: 0.4em;
  padding: 1.2em;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: #000;

  &:hover {
    border-color: ${p =>
      p.tier === 'quick' ? '#0f0' : p.tier === 'standard' ? '#0af' : '#fa0'};
    background: ${p =>
      p.tier === 'quick'
        ? '#001200'
        : p.tier === 'standard'
        ? '#00080e'
        : '#0d0700'};
  }

  @media (max-width: 768px) {
    padding: 1em;
  }
`;

const TemplateBadge = styled.span.withConfig({
  shouldForwardProp: prop => prop !== 'tier',
})<{ tier: 'quick' | 'standard' | 'full' }>`
  display: inline-block;
  font-size: 0.7em;
  padding: 0.2em 0.5em;
  border-radius: 2px;
  margin-bottom: 0.7em;
  background: ${p =>
    p.tier === 'quick'
      ? '#0f022'
      : p.tier === 'standard'
      ? '#0af2'
      : '#fa02'};
  color: ${p =>
    p.tier === 'quick' ? '#0f0' : p.tier === 'standard' ? '#0af' : '#fa0'};
  border: 1px solid
    ${p =>
      p.tier === 'quick'
        ? '#0f05'
        : p.tier === 'standard'
        ? '#0af5'
        : '#fa05'};
`;

const TemplateCardTitle = styled.div`
  font-size: 1em;
  font-weight: bold;
  margin-bottom: 0.5em;
  color: #0f0;
`;

const TemplateCardDesc = styled.div`
  font-size: 0.8em;
  color: #0f08;
  margin-bottom: 0.8em;
  line-height: 1.4;
`;

const TemplateFeatureList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const TemplateFeatureItem = styled.li`
  font-size: 0.75em;
  color: #0f06;
  padding: 0.1em 0;

  &::before {
    content: '+ ';
    color: #0f04;
  }
`;

// Template content scaffolds — each pre-fills the persona content textarea.

const TEMPLATE_QUICK = `You are [NAME], [one-sentence description of who they are].

[Write 2-4 sentences describing their personality, how they speak, and what makes them unique. Mention actual quirks, verbal habits, or perspectives that define them.]`;

const TEMPLATE_STANDARD = `You are [NAME], a [brief description of who they are].

PERSONALITY & TRAITS:
- [Key personality trait or defining characteristic]
- [Emotional tendencies, values, or worldview]
- [A quirk, habit, or contradiction that makes them real]

COMMUNICATION STYLE:
- [How they speak — formal/casual, verbose/brief, direct/roundabout]
- [Any catchphrases, verbal tics, or signature expressions]
- [Topics they're passionate about or deliberately avoid]

BEHAVIORAL GUIDELINES:
- [How they approach problems, questions, or requests]
- [How they react to topics outside their expertise or comfort zone]
- [Their general stance — helpful, challenging, mysterious, etc.]`;

const TEMPLATE_FULL = `You are [NAME], [brief description of who they are].

CORE IDENTITY:
- [Who they fundamentally are — their essence in one sentence]
- [Their central philosophy, values, or code they live by]
- [What drives or motivates them at the deepest level]

PERSONALITY & TRAITS:
- [Defining personality trait]
- [Emotional tendencies, psychological quirks, or contradictions]
- [How they present themselves vs. who they actually are]

COMMUNICATION STYLE:
- [Speech style — formal/casual, verbose/concise, direct/evasive]
- [Catchphrases, verbal tics, or signature expressions they use]
- [Topics they speak passionately about or deliberately avoid]

BACKGROUND & HISTORY:
- [Their origin, upbringing, or the world they come from]
- [Formative events or experiences that shaped them]
- [Relationships, losses, or alliances that define them]

WORLD & SETTING:
- [The world, era, or universe they inhabit]
- [Their role, occupation, or status in that world]
- [Factions, cultures, or forces they're connected to or at odds with]

KNOWLEDGE & EXPERTISE:
- [Areas of deep knowledge, skill, or power]
- [Tools, abilities, or resources they have access to]
- [Notable blind spots, gaps, or forbidden knowledge]

BEHAVIORAL GUIDELINES:
- [How they respond in their core domain or area of expertise]
- [How they handle challenges, threats, or topics that push their limits]
- [Hard lines they won't cross — rules, oaths, or principles]

EXAMPLE DIALOGUE:
User: [Write a sample question or prompt relevant to this character]
[NAME]: [Write their response in their authentic voice — show, don't tell]`;

interface PersonaManagerProps {
  onBack: () => void;
}

const PersonaManager: React.FC<PersonaManagerProps> = ({ onBack }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'content'>('details');
  const [viewingPersona, setViewingPersona] = useState<Persona | null>(null);
  const [templateStep, setTemplateStep] = useState(false);

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState<string>('');

  useEffect(() => {
    // Load personas
    const loadedPersonas = loadPersonas();
    setPersonas(loadedPersonas);
  }, []);

  const handleCreateNew = () => {
    setEditingPersona(null);
    setViewingPersona(null);
    setIsCreating(true);
    setIsEditing(false);
    setTemplateStep(true);
    setActiveTab('details');
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

  const handleTemplateSelect = (tier: 'quick' | 'standard' | 'full') => {
    const content =
      tier === 'quick'
        ? TEMPLATE_QUICK
        : tier === 'standard'
        ? TEMPLATE_STANDARD
        : TEMPLATE_FULL;

    setEditingPersona(prev => ({
      name: prev?.name ?? '',
      content,
      lastModified: new Date().toISOString(),
    }));
    setTemplateStep(false);
    setActiveTab('details');
  };

  const handleBackToTemplates = () => {
    setTemplateStep(true);
    setActiveTab('details');
  };

  const handleDelete = (personaName: string) => {
    // Don't allow deleting the base ALTER EGO persona
    if (personaName === 'ALTER EGO') {
      showError('Cannot delete the default "ALTER EGO" persona');
      return;
    }

    // Show confirmation dialog
    setPersonaToDelete(personaName);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    const updatedPersonas = personas.filter(p => p.name !== personaToDelete);

    // Close dialog and reset UI state first for immediate responsiveness
    setShowDeleteConfirmation(false);
    setPersonaToDelete('');

    // Reset the editing state if we were editing this persona
    if (editingPersona && editingPersona.name === personaToDelete) {
      setEditingPersona(null);
    }

    // Reset the viewing state if we were viewing this persona
    if (viewingPersona && viewingPersona.name === personaToDelete) {
      setViewingPersona(null);
    }

    // Use startTransition for non-urgent updates to prevent blocking
    startTransition(() => {
      // Then save and update data
      savePersonas(updatedPersonas);
      setPersonas(updatedPersonas);

      // Show notification
      showSuccess(`Persona "${personaToDelete}" deleted successfully`);

      // Dispatch event to notify that personas have been updated
      dispatchAppEvent('personas-updated', { personas: updatedPersonas });
    });
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setPersonaToDelete('');
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!editingPersona) return;

    const { name, value } = e.target;
    setEditingPersona({
      ...editingPersona,
      [name]: value,
      lastModified: new Date().toISOString(),
    });
  };
  const handleSave = () => {
    if (!editingPersona) return;

    if (!editingPersona.name.trim()) {
      showError('Please provide a name for the persona');
      return;
    }

    // Check if the name already exists (for new personas)
    if (isCreating && personas.some(p => p.name === editingPersona.name)) {
      showError(`A persona named "${editingPersona.name}" already exists`);
      return;
    }

    // Create updated persona list
    const updatedPersonas = isEditing
      ? personas.map(p => (p.name === editingPersona.name ? editingPersona : p))
      : [...personas, editingPersona];

    // Reset UI state first for immediate responsiveness
    setEditingPersona(null);
    setIsEditing(false);
    setIsCreating(false);

    // Use startTransition for non-urgent updates to prevent blocking
    startTransition(() => {
      // Then save and update data
      savePersonas(updatedPersonas);
      setPersonas(updatedPersonas);

      // Show notification
      showSuccess(
        `Persona "${editingPersona.name}" ${isEditing ? 'updated' : 'created'} successfully`
      );

      // Dispatch event to notify that personas have been updated
      dispatchAppEvent('personas-updated', { personas: updatedPersonas });
    });
  };

  const handleCancel = () => {
    setEditingPersona(null);
    setViewingPersona(null);
    setIsEditing(false);
    setIsCreating(false);
    setTemplateStep(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Check if a persona is the default ALTER EGO persona
  const isDefaultPersona = (name: string) => name === 'ALTER EGO';

  // Check if a persona is one of the example personas
  const isExamplePersona = (name: string) => isExamplePersonaName(name);

  // Render the persona list and editor
  return (
    <Container>
      <Title>Manage Personas</Title>

      {!editingPersona && !viewingPersona && !isCreating && (
        <InfoBox>
          Personas define ALTER EGO's complete personality, communication style,
          and behavior. Each persona should be a fully-realized character with
          unique traits, speech patterns, knowledge areas, and emotional
          tendencies. The more detailed and specific your persona definition,
          the more authentic and engaging the conversations will be.
          <br />
          <br />
          <strong>Tip:</strong> Check out the example personas (marked with
          "Example" tags) to see how to create compelling, immersive characters.
          You can view them for inspiration, edit them to make them your own, or
          create entirely new personas from scratch.
        </InfoBox>
      )}

      {isCreating && templateStep ? (
        // Template picker — step 1 of new persona creation
        <>
          <TemplatePickerTitle>Choose a Template</TemplatePickerTitle>
          <TemplatePickerSubtitle>
            Select a starting template for your new persona. You can customize
            everything after picking.
          </TemplatePickerSubtitle>
          <TemplateGrid>
            <TemplateCard
              tier="quick"
              onClick={() => handleTemplateSelect('quick')}
            >
              <TemplateBadge tier="quick">Quick</TemplateBadge>
              <TemplateCardTitle>Quick Start</TemplateCardTitle>
              <TemplateCardDesc>
                A minimal, freeform persona. Best for simple characters or
                casual use.
              </TemplateCardDesc>
              <TemplateFeatureList>
                <TemplateFeatureItem>Name + description</TemplateFeatureItem>
                <TemplateFeatureItem>
                  Free-form personality block
                </TemplateFeatureItem>
              </TemplateFeatureList>
            </TemplateCard>
            <TemplateCard
              tier="standard"
              onClick={() => handleTemplateSelect('standard')}
            >
              <TemplateBadge tier="standard">Standard</TemplateBadge>
              <TemplateCardTitle>Standard</TemplateCardTitle>
              <TemplateCardDesc>
                A structured persona with personality, communication style, and
                behavioral rules.
              </TemplateCardDesc>
              <TemplateFeatureList>
                <TemplateFeatureItem>Personality and traits</TemplateFeatureItem>
                <TemplateFeatureItem>Communication style</TemplateFeatureItem>
                <TemplateFeatureItem>Behavioral guidelines</TemplateFeatureItem>
              </TemplateFeatureList>
            </TemplateCard>
            <TemplateCard
              tier="full"
              onClick={() => handleTemplateSelect('full')}
            >
              <TemplateBadge tier="full">Full</TemplateBadge>
              <TemplateCardTitle>Full Lore</TemplateCardTitle>
              <TemplateCardDesc>
                A rich, fully-realized character with history, world context,
                and example dialogue.
              </TemplateCardDesc>
              <TemplateFeatureList>
                <TemplateFeatureItem>
                  Core identity and personality
                </TemplateFeatureItem>
                <TemplateFeatureItem>Background and history</TemplateFeatureItem>
                <TemplateFeatureItem>World and setting</TemplateFeatureItem>
                <TemplateFeatureItem>Knowledge and expertise</TemplateFeatureItem>
                <TemplateFeatureItem>Example dialogue</TemplateFeatureItem>
              </TemplateFeatureList>
            </TemplateCard>
          </TemplateGrid>
          <ButtonContainer>
            <Button onClick={handleCancel}>Cancel</Button>
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
              <Label htmlFor="name">
                Persona Name: <RequiredTag>Required</RequiredTag>
              </Label>
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
                    Name: {editingPersona.name || '[Name required]'}
                    {'\n'}
                    Created: {formatDate(editingPersona.lastModified)}
                    {'\n'}
                    Behavior: Will respond as{' '}
                    {editingPersona.name || 'the specified persona'}, with
                    specific traits and knowledge defined in the Content tab.
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
                    The default ALTER EGO persona cannot be modified. This is
                    the baseline personality that defines the core behavior of
                    the system. To create a customized version, please create a
                    new persona instead.
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
                    placeholder="Create a detailed, immersive character with personality, background, speech patterns, and unique traits. Be specific about how they think, speak, and react to different situations."
                  />

                  <InfoBox>
                    Create a rich, detailed character that feels authentic and
                    engaging. Instead of generic instructions like "You are a
                    helpful assistant," try:
                    <br />
                    <br />
                    <strong>Good:</strong> "You are Marcus, a retired detective
                    who's seen too much but still believes in justice. You speak
                    with dry wit, often reference old cases, and have strong
                    opinions about right and wrong. You're skeptical of
                    technology but appreciate when it solves problems."
                    <br />
                    <br />
                    <strong>Even Better:</strong> Include specific traits,
                    speech patterns, personal history, areas of expertise,
                    emotional tendencies, and how they approach different
                    situations. The more detailed and specific you are, the more
                    the character will come alive in conversations!
                  </InfoBox>
                </>
              )}
            </FormGroup>
          )}

          <FormButtons>
            <Button onClick={handleCancel}>Cancel</Button>
            {isCreating && (
              <Button onClick={handleBackToTemplates}>Change Template</Button>
            )}
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
                {isDefaultPersona(viewingPersona.name) && (
                  <PersonaTag>Default</PersonaTag>
                )}
                {isExamplePersona(viewingPersona.name) && (
                  <PersonaTag
                    style={{ backgroundColor: '#0088ff22', color: '#0af' }}
                  >
                    Example
                  </PersonaTag>
                )}
              </PersonaInfoValue>
            </PersonaInfoRow>
            <PersonaInfoRow>
              <PersonaInfoLabel>Modified:</PersonaInfoLabel>
              <PersonaInfoValue>
                {formatDate(viewingPersona.lastModified || '')}
              </PersonaInfoValue>
            </PersonaInfoRow>
            <PersonaInfoRow>
              <PersonaInfoLabel>Content:</PersonaInfoLabel>
              <PersonaInfoValue>
                <PreviewContent>{viewingPersona.content}</PreviewContent>
              </PersonaInfoValue>
            </PersonaInfoRow>
          </PersonaInfoContainer>
          <FormButtons>
            <Button onClick={handleCancel}>Back</Button>
            <Button onClick={() => handleEdit(viewingPersona)}>Edit</Button>
            {/* Removed the Activate button as requested */}
          </FormButtons>{' '}
        </div>
      ) : (
        // Default: persona list
        <>
          <PersonaGrid>
            {personas.length === 0 ? (
              <EmptyState>
                <EmptyIcon>
                  <UserIcon size={24} aria-hidden="true" />
                </EmptyIcon>
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
                    {isDefaultPersona(persona.name) && (
                      <PersonaTag>Default</PersonaTag>
                    )}
                    {isExamplePersona(persona.name) && (
                      <PersonaTag
                        style={{ backgroundColor: '#0088ff22', color: '#0af' }}
                      >
                        Example
                      </PersonaTag>
                    )}
                  </PersonaName>
                  <PersonaDate>
                    Modified: {formatDate(persona.lastModified)}
                  </PersonaDate>
                  <ActionButtons>
                    <ViewButton
                      onClick={e => {
                        e.stopPropagation();
                        handleView(persona);
                      }}
                      title="View"
                    >
                      <EyeIcon size={14} aria-hidden="true" />
                    </ViewButton>
                    <EditButton
                      onClick={e => {
                        e.stopPropagation();
                        handleEdit(persona);
                      }}
                      title="Edit"
                    >
                      <PencilIcon size={14} aria-hidden="true" />
                    </EditButton>
                    {!isDefaultPersona(persona.name) && (
                      <DeleteButton
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(persona.name);
                        }}
                        title="Delete"
                      >
                        <TrashIcon size={14} aria-hidden="true" />
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
      )}

      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Persona"
        message={`Are you sure you want to delete the persona "${personaToDelete}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </Container>
  );
};

export default PersonaManager;
