import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadChatHistory, ChatHistoryEntry } from '../../utils/storageUtils';

const Container = styled.div`
  color: #0f0;
  
  @media (max-width: 768px) {
    padding: 0 0.5em;
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

const HistoryFilterContainer = styled.div`
  margin-bottom: 1em;
  display: flex;
  align-items: center;
  gap: 0.5em;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1em;
    margin-bottom: 1.5em;
  }
`;

const Label = styled.label`
  @media (max-width: 768px) {
    font-size: 1.1em;
    font-weight: bold;
  }
`;

const Select = styled.select`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.3em;
  
  @media (max-width: 768px) {
    padding: 0.8em;
    font-size: 1em;
    border-width: 2px;
    border-radius: 0.3em;
    width: 100%;
    max-width: 250px;
  }
`;

const HistoryList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #0f04;
  margin-bottom: 1em;
  
  @media (max-width: 768px) {
    max-height: 400px;
    border-width: 2px;
    border-radius: 0.3em;
    margin-bottom: 1.5em;
  }
`;

const HistoryItem = styled.div`
  padding: 0.8em;
  border-bottom: 1px solid #0f03;
  cursor: pointer;
  
  &:hover {
    background-color: #0f01;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 768px) {
    padding: 1.2em;
    touch-action: manipulation;
    
    &:hover {
      background-color: #0f02;
    }
  }
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5em;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3em;
    margin-bottom: 0.8em;
  }
`;

const PersonaName = styled.div`
  font-weight: bold;
  
  @media (max-width: 768px) {
    font-size: 1.1em;
  }
`;

const Timestamp = styled.div`
  font-size: 0.8em;
  color: #0f08;
  
  @media (max-width: 768px) {
    font-size: 0.9em;
  }
`;

const MessagePreview = styled.div`
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0f0a;
  
  @media (max-width: 768px) {
    font-size: 1em;
    white-space: normal;
    line-height: 1.4;
    max-height: 2.8em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
`;

const HistoryDetail = styled.div`
  border: 1px solid #0f04;
  padding: 1em;
  max-height: 400px;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    border-width: 2px;
    border-radius: 0.3em;
    padding: 1.5em;
    max-height: 500px;
  }
`;

const MessageContainer = styled.div`
  margin-bottom: 1em;
  
  @media (max-width: 768px) {
    margin-bottom: 1.5em;
  }
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.3em;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2em;
    margin-bottom: 0.6em;
  }
`;

const MessageRole = styled.div<{ role: 'user' | 'assistant' | 'system' }>`
  font-weight: bold;
  color: ${props => 
    props.role === 'user' ? '#0f0' : 
    props.role === 'assistant' ? '#0ff' : 
    '#ff0'  /* Yellow color for system messages */
  };
  
  @media (max-width: 768px) {
    font-size: 1.1em;
  }
`;

const MessageTime = styled.div`
  font-size: 0.8em;
  color: #0f08;
  
  @media (max-width: 768px) {
    font-size: 0.9em;
  }
`;

const MessageContent = styled.div`
  white-space: pre-wrap;
  line-height: 1.4;
  
  @media (max-width: 768px) {
    font-size: 1em;
    line-height: 1.5;
  }
`;

const EmptyState = styled.div`
  padding: 2em;
  text-align: center;
  color: #0f06;
  
  @media (max-width: 768px) {
    padding: 3em 1.5em;
    font-size: 1.1em;
    line-height: 1.4;
  }
`;

const ButtonContainer = styled.div`
  margin-top: 1em;
  display: flex;
  justify-content: space-between;
  
  @media (max-width: 768px) {
    margin-top: 1.5em;
    flex-direction: column;
    gap: 1em;
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
    padding: 0.8em 1.5em;
    font-size: 1em;
    border-width: 2px;
    border-radius: 0.3em;
    min-height: 2.5em;
    touch-action: manipulation;
  }
`;

const BackButton = styled(Button)``;
const CloseDetailButton = styled(Button)``;

interface ChatHistoryProps {
  onBack: () => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ onBack }) => {
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ChatHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ChatHistoryEntry | null>(null);
  const [personaFilter, setPersonaFilter] = useState<string>('all');
  const [uniquePersonas, setUniquePersonas] = useState<string[]>([]);
  
  useEffect(() => {
    // Load chat history
    const chatHistory = loadChatHistory();
    setHistory(chatHistory);
    
    // Extract unique persona names
    const personas = Array.from(new Set(chatHistory.map(entry => entry.persona)));
    setUniquePersonas(personas);
    
    // Initial filtering
    setFilteredHistory(chatHistory);
  }, []);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filter = e.target.value;
    setPersonaFilter(filter);
    
    if (filter === 'all') {
      setFilteredHistory(history);
    } else {
      setFilteredHistory(history.filter(entry => entry.persona === filter));
    }
    
    // Clear selected entry when filter changes
    setSelectedEntry(null);
  };
  
  const handleSelectEntry = (entry: ChatHistoryEntry) => {
    setSelectedEntry(entry);
  };
  
  const handleCloseDetail = () => {
    setSelectedEntry(null);
  };
  
  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  // Function to get a short preview of the conversation
  const getPreview = (entry: ChatHistoryEntry) => {
    if (entry.messages.length === 0) return "No messages";
    
    // Find the first assistant response, or use the first user message if no assistant responses
    const firstResponse = entry.messages.find(m => m.role === 'assistant');
    if (firstResponse) {
      return firstResponse.content.substring(0, 60) + (firstResponse.content.length > 60 ? "..." : "");
    }
    
    // Fall back to first user message
    return entry.messages[0].content.substring(0, 60) + (entry.messages[0].content.length > 60 ? "..." : "");
  };
  
  return (
    <Container>
      <Title>Chat History</Title>
      
      <HistoryFilterContainer>
        <Label htmlFor="persona-filter">Filter by character:</Label>
        <Select 
          id="persona-filter" 
          value={personaFilter} 
          onChange={handleFilterChange}
        >
          <option value="all">All Characters</option>
          {uniquePersonas.map(persona => (
            <option key={persona} value={persona}>
              {persona}
            </option>
          ))}
        </Select>
      </HistoryFilterContainer>
      
      {selectedEntry ? (
        <HistoryDetail>
          <HistoryHeader>
            <PersonaName>{selectedEntry.persona}</PersonaName>
            <Timestamp>{formatDateTime(selectedEntry.timestamp)}</Timestamp>
          </HistoryHeader>
          
          {selectedEntry.messages.map((message, index) => (
            <MessageContainer key={index}>
              <MessageHeader>
                <MessageRole role={message.role}>
                  {message.role === 'user' 
                    ? 'You' 
                    : message.role === 'system' 
                      ? 'System' 
                      : selectedEntry.persona}
                </MessageRole>
                <MessageTime>{formatDateTime(message.timestamp)}</MessageTime>
              </MessageHeader>
              <MessageContent>{message.content}</MessageContent>
            </MessageContainer>
          ))}
          
          <ButtonContainer>
            <CloseDetailButton onClick={handleCloseDetail}>Back to List</CloseDetailButton>
          </ButtonContainer>
        </HistoryDetail>
      ) : (
        <>
          <HistoryList>
            {filteredHistory.length === 0 ? (
              <EmptyState>No chat history found.</EmptyState>
            ) : (
              filteredHistory.map(entry => (
                <HistoryItem 
                  key={entry.id} 
                  onClick={() => handleSelectEntry(entry)}
                >
                  <HistoryHeader>
                    <PersonaName>{entry.persona}</PersonaName>
                    <Timestamp>{formatDateTime(entry.timestamp)}</Timestamp>
                  </HistoryHeader>
                  <MessagePreview>{getPreview(entry)}</MessagePreview>
                </HistoryItem>
              ))
            )}
          </HistoryList>
          
          <ButtonContainer>
            <BackButton onClick={onBack}>Back</BackButton>
          </ButtonContainer>
        </>
      )}
    </Container>
  );
};

export default ChatHistory;