import React, { useState } from 'react';
import styled from 'styled-components';
import { useApi } from '../../context/ApiContext';

const QuerySectionContainer = styled.section`
  display: flex;
  align-items: center;
  padding: 1vh 2vw;
  gap: 1vw;
`;

const QueryInputWrapper = styled.div`
  flex: 1;
`;

const QueryInput = styled.input`
  width: 100%;
  padding: 0.5em;
  border: 1px solid #0f0;
  background: #000;
  color: #0f0;
  border-radius: 0.2em;
  
  &::placeholder {
    color: #0f0;
    opacity: 0.7;
  }
`;

const SendQueryButton = styled.button`
  font-family: inherit;
  color: #0f0;
  background: #000;
  border: 1px solid #0f0;
  padding: 0.5em 1em;
  border-radius: 0.2em;
  
  &:hover {
    background: #0f0;
    color: #000;
    cursor: pointer;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background: #000;
      color: #0f0;
    }
  }
`;

interface QuerySectionProps {
  personaContent?: string;
  activeCharacter?: string;
}

const QuerySection: React.FC<QuerySectionProps> = ({ 
  personaContent = "",
  activeCharacter = "ALTER EGO"
}) => {
  const [query, setQuery] = useState('');
  const { sendQuery, isLoading } = useApi();
  
  const handleSendQuery = async () => {
    if (query.trim() && !isLoading) {
      // Store the query to clear the input
      const currentQuery = query;
      setQuery('');
      
      // Create a custom event to update the UI
      const queryEvent = new CustomEvent('user-query', {
        detail: { query: currentQuery }
      });
      window.dispatchEvent(queryEvent);
      
      // Prepare the custom system prompt with the active persona's content
      const systemPrompt = personaContent ? 
        `You are ${activeCharacter}. ${personaContent}` :
        `You are ${activeCharacter}, an artificial intelligence. Please respond to the user's query.`;
      
      // Send the query to the API with the personalized system prompt
      // Make sure we're using the current persona's name to keep conversations separate
      const result = await sendQuery(currentQuery, systemPrompt, undefined, activeCharacter);
      
      // Dispatch response event
      const responseEvent = new CustomEvent('query-response', {
        detail: result
      });
      window.dispatchEvent(responseEvent);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendQuery();
    }
  };
  
  return (
    <QuerySectionContainer>
      <QueryInputWrapper>
        <QueryInput
          type="text"
          placeholder="Insert Query Here..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
        />
      </QueryInputWrapper>
      <SendQueryButton 
        onClick={handleSendQuery}
        disabled={isLoading || !query.trim()}
      >
        {isLoading ? 'Processing...' : 'Send Query'}
      </SendQueryButton>
    </QuerySectionContainer>
  );
};

export default QuerySection;