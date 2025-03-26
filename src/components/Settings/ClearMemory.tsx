import React, { useState } from 'react';
import styled from 'styled-components';
import { clearMemory } from '../../utils/storageUtils';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #0f0;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const Message = styled.p`
  margin-bottom: 1em;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 1em;
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
`;

const DangerButton = styled(Button)`
  border-color: #f00;
  color: #f00;
  
  &:hover {
    background: #f00;
    color: #000;
  }
`;

const StatusMessage = styled.p`
  margin-top: 1em;
  color: #0f0;
  font-weight: bold;
`;

interface ClearMemoryProps {
  onBack: () => void;
}

const ClearMemory: React.FC<ClearMemoryProps> = ({ onBack }) => {
  const [status, setStatus] = useState<string | null>(null);

  const handleClearMemory = () => {
    try {
      clearMemory();
      setStatus("Memory cleared successfully.");
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      setStatus("Error clearing memory.");
      console.error("Failed to clear memory:", error);
    }
  };

  return (
    <Container>
      <Title>Clear Memory</Title>
      <Message>
        This will erase all conversation history with ALTER EGO.
        This action cannot be undone.
      </Message>
      
      <ButtonContainer>
        <Button onClick={onBack}>Cancel</Button>
        <DangerButton onClick={handleClearMemory}>Clear Memory</DangerButton>
      </ButtonContainer>
      
      {status && <StatusMessage>{status}</StatusMessage>}
    </Container>
  );
};

export default ClearMemory;