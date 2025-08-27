import React, { useState } from 'react';
import styled from 'styled-components';
import { clearMemory } from '../../utils/storageUtils';
import { useApi } from '../../context/ApiContext';
import { showSuccess, showError } from '../Common/NotificationManager';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #0f0;

  @media (max-width: 768px) {
    min-height: 60vh;
    justify-content: center;
  }
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;

  @media (max-width: 768px) {
    margin-bottom: 1.5em;
    font-size: 1.3em;
    text-align: center;
  }
`;

const Message = styled.p`
  margin-bottom: 1em;
  text-align: center;
  line-height: 1.5;

  @media (max-width: 768px) {
    margin-bottom: 2em;
    font-size: 1.1em;
    padding: 0 1em;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 1em;
  gap: 1em;

  @media (max-width: 768px) {
    flex-direction: column;
    margin-top: 2em;
    gap: 1.2em;
    max-width: 300px;
  }
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em 1em;
  cursor: pointer;

  &:hover {
    background: #0f0;
    color: #000;
  }

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    font-size: 1.1em;
    border-width: 2px;
    border-radius: 0.3em;
  }
`;

const DangerButton = styled(Button)`
  border-color: #f00;
  color: #f00;

  &:hover {
    background: #f00;
    color: #000;
  }
`;

interface ClearMemoryProps {
  onBack: () => void;
}

const ClearMemory: React.FC<ClearMemoryProps> = ({ onBack }) => {
  const { clearConversation } = useApi(); // Get clearConversation function from context

  const handleClearMemory = () => {
    try {
      // Clear memory in local storage
      clearMemory();

      // Clear conversation in API context
      clearConversation();

      // Dispatch custom event to clear the chat display
      const clearChatEvent = new CustomEvent('clear-chat-display');
      window.dispatchEvent(clearChatEvent);

      onBack(); // Navigate back first
      showSuccess('Memory cleared successfully.'); // Then show notification
    } catch (error) {
      showError('Error clearing memory.');
      console.error('Failed to clear memory:', error);
    }
  };

  return (
    <Container>
      <Title>Clear Memory</Title>
      <Message>
        This will erase all conversation history with ALTER EGO. This action
        cannot be undone.
      </Message>
      <ButtonContainer>
        <Button onClick={onBack}>Cancel</Button>
        <DangerButton onClick={handleClearMemory}>Clear Memory</DangerButton>
      </ButtonContainer>
    </Container>
  );
};

export default ClearMemory;
