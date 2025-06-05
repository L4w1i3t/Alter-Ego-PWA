import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useApi } from '../../context/ApiContext';
import { loadChatHistory, ChatHistoryEntry } from '../../utils/storageUtils';
import { showSuccess, showError, showWarning, showInfo } from '../Common/NotificationManager';

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

// Tab navigation
const TabContainer = styled.div`
  display: flex;
  width: 100%;
  margin-bottom: 1.5em;
  border-bottom: 1px solid #0f04;
`;

const Tab = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
  padding: 0.5em 1em;
  cursor: pointer;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  color: ${props => props.active ? '#0f0' : '#0f08'};
  border-bottom: ${props => props.active ? '2px solid #0f0' : 'none'};
  
  &:hover {
    color: #0f0;
  }
`;

// Search and filtering
const SearchSection = styled.div`
  width: 100%;
  margin-bottom: 1.5em;
`;

const TimeSearchSection = styled.div`
  width: 100%;
  margin-bottom: 1.5em;
`;

const FilterSection = styled.div`
  width: 100%;
  margin-bottom: 1.5em;
  display: flex;
  align-items: center;
`;

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.8em;
`;

const Label = styled.label`
  margin-right: 1em;
  min-width: 80px;
`;

const Input = styled.input`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em;
  flex: 1;
`;

const Select = styled.select`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em;
  flex: 1;
`;

const Button = styled.button`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em 1em;
  cursor: pointer;
  margin-left: 0.5em;
  
  &:hover {
    background: #0f0;
    color: #000;
  }
`;

// Results display
const HistoryList = styled.div`
  width: 100%;
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

const ResultsSection = styled.div`
  width: 100%;
  border: 1px solid #0f0;
  padding: 1em;
  margin-top: 1em;
  max-height: 300px;
  overflow-y: auto;
`;

const ConversationDetail = styled.div`
  width: 100%;
  border: 1px solid #0f04;
  padding: 1em;
  max-height: 400px;
  overflow-y: auto;
`;

const Message = styled.div`
  margin-bottom: 1em;
  padding: 0.5em;
  border-bottom: 1px solid #0f03;
`;

const MessageContainer = styled.div`
  margin-bottom: 1em;
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.3em;
`;

const MessageRole = styled.div<{ role: 'user' | 'assistant' | 'system' }>`
  font-weight: bold;
  color: ${props => 
    props.role === 'user' ? '#0f0' : 
    props.role === 'assistant' ? '#0ff' : 
    '#ff0'  /* Yellow color for system messages */
  };
`;

const MessageTime = styled.div`
  font-size: 0.8em;
  color: #0f08;
`;

const MessageContent = styled.div`
  white-space: pre-wrap;
  line-height: 1.4;
`;

const UserMessage = styled.div`
  color: #0af;
  margin-bottom: 0.5em;
`;

const AIMessage = styled.div`
  color: #0f0;
`;

const SystemMessage = styled.div`
  color: #ff0;
  font-style: italic;
`;

const NoResults = styled.p`
  color: #f00;
  text-align: center;
  padding: 1em;
`;

const EmptyState = styled.div`
  padding: 2em;
  text-align: center;
  color: #0f06;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 1em;
`;

interface MemoryAndHistoryProps {
  onBack: () => void;
}

type DisplayMode = 'chronological' | 'search' | 'detail';

const MemoryAndHistory: React.FC<MemoryAndHistoryProps> = ({ onBack }) => {
  // Active tab/view
  const [activeTab, setActiveTab] = useState<'browse' | 'search'>('browse');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('chronological');
  
  // Chat history state (chronological view)
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ChatHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ChatHistoryEntry | null>(null);
  const [personaFilter, setPersonaFilter] = useState<string>('all');
  const [uniquePersonas, setUniquePersonas] = useState<string[]>([]);
    // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchResults, setSearchResults] = useState<{ role: 'user' | 'assistant' | 'system', content: string, timestamp?: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { searchLongTermMemory, retrieveTimeBasedMemories, retrieveLastNMemories, currentPersona } = useApi();
  
  useEffect(() => {
    // Load chat history for chronological browsing
    loadHistoryData();
  }, []);
  
  const loadHistoryData = () => {
    const chatHistory = loadChatHistory();
    setHistory(chatHistory);
    
    // Extract unique persona names
    const personas = Array.from(new Set(chatHistory.map(entry => entry.persona)));
    setUniquePersonas(personas);
    
    // Initial filtering
    setFilteredHistory(chatHistory);
  };
  
  // Handle tab switching
  const handleTabChange = (tab: 'browse' | 'search') => {
    setActiveTab(tab);
    if (tab === 'browse') {
      setDisplayMode('chronological');
      setSelectedEntry(null);
    } else {
      setDisplayMode('search');
      setSearchResults([]);
    }
  };
  
  // Chronological browsing handlers
  const handlePersonaFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
    setDisplayMode('detail');
  };
  
  const handleCloseDetail = () => {
    setSelectedEntry(null);
    setDisplayMode(activeTab === 'browse' ? 'chronological' : 'search');
  };
    // Search handlers
  const handleSearchQuery = async () => {
    if (!searchQuery.trim()) {
      showWarning('Please enter a search query');
      return;
    }
    
    setIsSearching(true);
    
    try {
      const results = await searchLongTermMemory(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        showWarning('No results found');
      } else {
        showSuccess(`Found ${results.length} results`);
      }
    } catch (error) {
      console.error('Search error:', error);
      showError('Error searching long-term memory');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
    const handleTimeSearch = async () => {
    if (!startDate || !endDate) {
      showWarning('Please select both start and end dates');
      return;
    }
    
    setIsSearching(true);
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        showError('Invalid date format');
        setIsSearching(false);
        return;
      }
      
      if (start > end) {
        showError('Start date must be before end date');
        setIsSearching(false);
        return;
      }
      
      const results = await retrieveTimeBasedMemories(start, end);
      setSearchResults(results);
      
      if (results.length === 0) {
        showWarning('No results found in the specified time range');
      } else {
        showSuccess(`Found ${results.length} results`);
      }
    } catch (error) {
      console.error('Time search error:', error);
      showError('Error retrieving memories by time range');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
    const handleRetrieveRecent = async () => {
    setIsSearching(true);
    
    try {
      const results = await retrieveLastNMemories(20); // Retrieve last 20 messages
      setSearchResults(results);
      
      if (results.length === 0) {
        showWarning('No recent memories found');
      } else {
        showSuccess(`Retrieved last ${results.length} memories`);
      }
    } catch (error) {
      console.error('Recent memory retrieval error:', error);
      showError('Error retrieving recent memories');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Utility functions
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
  
  // Render functions for different views
  const renderChronologicalView = () => (
    <>
      <FilterSection>
        <Label htmlFor="persona-filter">Filter by character:</Label>
        <Select 
          id="persona-filter" 
          value={personaFilter} 
          onChange={handlePersonaFilterChange}
        >
          <option value="all">All Characters</option>
          {uniquePersonas.map(persona => (
            <option key={persona} value={persona}>
              {persona}
            </option>
          ))}
        </Select>
      </FilterSection>
      
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
    </>
  );
  
  const renderSearchView = () => (
    <>
      <SearchSection>
        <InputGroup>
          <Label htmlFor="searchQuery">Search:</Label>
          <Input
            id="searchQuery"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter search terms..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchQuery();
            }}
          />
          <Button 
            onClick={handleSearchQuery}
            disabled={isSearching}
          >
            Search
          </Button>
        </InputGroup>
      </SearchSection>
      
      <TimeSearchSection>
        <InputGroup>
          <Label htmlFor="startDate">From:</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="endDate">To:</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button 
            onClick={handleTimeSearch}
            disabled={isSearching}
          >
            Find
          </Button>
        </InputGroup>
      </TimeSearchSection>
        <ButtonContainer>
        <Button onClick={handleRetrieveRecent} disabled={isSearching}>Recent Memories</Button>
      </ButtonContainer>
      
      {searchResults.length > 0 ? (
        <ResultsSection>
          {searchResults.map((message, index) => (
            <Message key={index}>
              {message.role === 'user' ? (
                <UserMessage>
                  <strong>You</strong> ({message.timestamp ? formatDateTime(message.timestamp) : 'unknown time'}): {message.content}
                </UserMessage>
              ) : message.role === 'assistant' ? (
                <AIMessage>
                  <strong>{currentPersona}</strong> ({message.timestamp ? formatDateTime(message.timestamp) : 'unknown time'}): {message.content}
                </AIMessage>
              ) : (
                <SystemMessage>
                  <strong>System</strong>: {message.content}
                </SystemMessage>
              )}
            </Message>
          ))}
        </ResultsSection>
      ) : isSearching ? null : (
        <NoResults>No search results to display</NoResults>
      )}
    </>
  );
  
  const renderDetailView = () => {
    if (!selectedEntry) return null;
    
    return (
      <ConversationDetail>
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
          <Button onClick={handleCloseDetail}>Back to List</Button>
        </ButtonContainer>
      </ConversationDetail>
    );
  };
  
  return (
    <Container>
      <Title>Memory & History</Title>
      
      <TabContainer>
        <Tab 
          active={activeTab === 'browse'} 
          onClick={() => handleTabChange('browse')}
        >
          Browse Conversations
        </Tab>
        <Tab 
          active={activeTab === 'search'} 
          onClick={() => handleTabChange('search')}
        >
          Search Memory
        </Tab>
      </TabContainer>
      
      {displayMode === 'chronological' && renderChronologicalView()}
      {displayMode === 'search' && renderSearchView()}
      {displayMode === 'detail' && renderDetailView()}
      
      {displayMode !== 'detail' && (
        <ButtonContainer>
          <Button onClick={onBack}>Back to Settings</Button>
        </ButtonContainer>
      )}
    </Container>
  );
};

export default MemoryAndHistory;