import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadChatHistory, ChatHistoryEntry } from '../../utils/storageUtils';

const Container = styled.div`
  color: #0f0;
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;
`;

const HistoryFilterContainer = styled.div`
  margin-bottom: 1em;
  display: flex;
  align-items: center;
  gap: 0.5em;
`;

const Label = styled.label``;

const Select = styled.select`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.3em;
`;

const HistoryList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #0f04;
  margin-bottom: 1em;
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
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5em;
`;

const PersonaName = styled.div`
  font-weight: bold;
`;

const Timestamp = styled.div`
  font-size: 0.8em;
  color: #0f08;
`;

const MessagePreview = styled.div`
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0f0a;
`;

const HistoryDetail = styled.div`
  border: 1px solid #0f04;
  padding: 1em;
  max-height: 400px;
  overflow-y: auto;
`;

const MessageContainer = styled.div`
  margin-bottom: 1em;
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.3em;
`;

const MessageRole = styled.div<{ role: 'user' | 'assistant' }>`
  font-weight: bold;
  color: ${props => props.role === 'user' ? '#0f0' : '#0ff'};
`;

const MessageTime = styled.div`
  font-size: 0.8em;
  color: #0f08;
`;

const MessageContent = styled.div`
  white-space: pre-wrap;
  line-height: 1.4;
`;

const EmptyState = styled.div`
  padding: 2em;
  text-align: center;
  color: #0f06;
`;

const ButtonContainer = styled.div`
  margin-top: 1em;
  display: flex;
  justify-content: space-between;
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
                  {message.role === 'user' ? 'You' : selectedEntry.persona}
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