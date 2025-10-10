import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useApi } from '../../context/ApiContext';
import {
  loadChatHistory,
  ChatHistoryEntry,
  loadSettings,
  saveSettings,
  clearMemory,
} from '../../utils/storageUtils';
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from '../Common/NotificationManager';
import { clearAllMemory as clearAllLTM } from '../../memory/longTermDB';
import { clearAllAssociations } from '../../memory/associativeMemory';
import { loadPersonas } from '../../utils/storageUtils';
import ConfirmationDialog from '../Common/ConfirmationDialog';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #0f0;
  width: 100%;
  min-height: 60vh;

  @media (max-width: 768px) {
    padding: 1em;
    min-height: 70vh;
    align-items: stretch;
  }
`;

const Title = styled.h2`
  margin-bottom: 1em;
  font-size: 1.2em;

  @media (max-width: 768px) {
    font-size: 1.4em;
    margin-bottom: 1.5em;
    text-align: center;
  }
`;

// Tab navigation
const TabContainer = styled.div`
  display: flex;
  width: 100%;
  margin-bottom: 1.5em;
  border-bottom: 1px solid #0f04;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5em;
    margin-bottom: 2em;
  }
`;

const Tab = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'active',
})<{ active: boolean }>`
  padding: 0.5em 1em;
  cursor: pointer;
  font-weight: ${props => (props.active ? 'bold' : 'normal')};
  color: ${props => (props.active ? '#0f0' : '#0f08')};
  border-bottom: ${props => (props.active ? '2px solid #0f0' : 'none')};

  &:hover {
    color: #0f0;
  }

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    text-align: center;
    font-size: 1.1em;
    border: 1px solid ${props => (props.active ? '#0f0' : '#0f03')};
    border-radius: 0.3em;
    background: ${props => (props.active ? '#001500' : 'transparent')};
  }
`;

// Search and filtering
const SearchSection = styled.div`
  width: 100%;
  margin-bottom: 1.5em;

  @media (max-width: 768px) {
    margin-bottom: 2em;
  }
`;

const TimeSearchSection = styled.div`
  width: 100%;
  margin-bottom: 1.5em;

  @media (max-width: 768px) {
    margin-bottom: 2em;
  }
`;

const FilterSection = styled.div`
  width: 100%;
  margin-bottom: 1.5em;
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 2em;
  }
`;

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.8em;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 1.5em;
  }
`;

const Label = styled.label`
  margin-right: 1em;
  min-width: 80px;

  @media (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 0.8em;
    font-size: 1.1em;
    min-width: auto;
  }
`;

const Input = styled.input`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em;
  flex: 1;

  @media (max-width: 768px) {
    padding: 1em;
    font-size: 1em;
    margin-bottom: 1em;
    min-height: 2.5em;
    box-sizing: border-box;
  }
`;

const Select = styled.select`
  background: #000;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.5em;
  flex: 1;

  @media (max-width: 768px) {
    padding: 1em;
    font-size: 1em;
    min-height: 2.5em;
    box-sizing: border-box;
  }
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

  @media (max-width: 768px) {
    padding: 1em 1.5em;
    font-size: 1em;
    margin-left: 0;
    width: 100%;
    min-height: 3em;
  }
`;

// Results display
const HistoryList = styled.div`
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #0f04;
  margin-bottom: 1em;

  @media (max-width: 768px) {
    max-height: 50vh;
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
    min-height: 4em;
  }
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5em;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5em;
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

  @media (max-width: 768px) {
    padding: 1.2em;
    max-height: 50vh;
    margin-top: 1.5em;
  }
`;

const ConversationDetail = styled.div`
  width: 100%;
  border: 1px solid #0f04;
  padding: 1em;
  max-height: 400px;
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: 1.2em;
    max-height: 60vh;
  }
`;

const Message = styled.div`
  margin-bottom: 1em;
  padding: 0.5em;
  border-bottom: 1px solid #0f03;

  @media (max-width: 768px) {
    padding: 0.8em;
    margin-bottom: 1.2em;
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
    gap: 0.3em;
    margin-bottom: 0.8em;
  }
`;

const MessageRole = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'role',
})<{ role: 'user' | 'assistant' | 'system' }>`
  font-weight: bold;
  color: ${
    props =>
      props.role === 'user'
        ? '#0f0'
        : props.role === 'assistant'
          ? '#0ff'
          : '#ff0' /* Yellow color for system messages */
  };
`;

const MessageTime = styled.div`
  font-size: 0.8em;
  color: #0f08;
`;

const MessageContent = styled.div`
  white-space: pre-wrap;
  line-height: 1.4;

  @media (max-width: 768px) {
    font-size: 1em;
    line-height: 1.5;
  }
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

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1em;
    margin-top: 2em;
  }
`;

const ManageSection = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5em;

  @media (max-width: 768px) {
    gap: 2em;
  }
`;

const SectionCard = styled.div`
  width: 100%;
  border: 1px solid #0f04;
  border-radius: 0.4em;
  padding: 1.5em;
  background: #001000;
`;

const SectionTitle = styled.h3`
  margin: 0 0 0.6em;
  font-size: 1em;
`;

const SectionDescription = styled.p`
  margin: 0 0 1em;
  color: #0f08;
  line-height: 1.4;
`;

const HelperText = styled.p`
  margin: 1em 0 0;
  font-size: 0.9em;
  color: #0f08;
  font-style: italic;
`;

const ManageButtonRow = styled.div`
  display: flex;
  gap: 1em;
  margin-top: 1.5em;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled(Button)`
  margin-left: 0;
  flex: 1;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const DangerCard = styled(SectionCard)`
  border-color: #f00;
  background: #150000;
`;

const DangerButton = styled(PrimaryButton)`
  border-color: #f00;
  color: #f00;

  &:hover {
    background: #f00;
    color: #000;
  }
`;

interface MemoryAndHistoryProps {
  onBack: () => void;
}

type DisplayMode = 'chronological' | 'search' | 'detail' | 'manage';

const MemoryAndHistory: React.FC<MemoryAndHistoryProps> = ({ onBack }) => {
  // Active tab/view
  const [activeTab, setActiveTab] = useState<'browse' | 'search' | 'manage'>(
    'browse'
  );
  const [displayMode, setDisplayMode] = useState<DisplayMode>('chronological');

  // Chat history state (chronological view)
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ChatHistoryEntry[]>(
    []
  );
  const [selectedEntry, setSelectedEntry] = useState<ChatHistoryEntry | null>(
    null
  );
  const [personaFilter, setPersonaFilter] = useState<string>('all');
  const [uniquePersonas, setUniquePersonas] = useState<string[]>([]);
  const [allPersonaNames, setAllPersonaNames] = useState<string[]>([]);
  const [personaToClear, setPersonaToClear] = useState<string>('');
  const [isPersonaConfirmOpen, setIsPersonaConfirmOpen] = useState(false);
  const [isAllConfirmOpen, setIsAllConfirmOpen] = useState(false);
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchResults, setSearchResults] = useState<
    {
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp?: string;
    }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  const [savedMemoryBuffer, setSavedMemoryBuffer] = useState(() => {
    const settings = loadSettings();
    return settings.memoryBuffer ?? 3;
  });
  const [memoryBuffer, setMemoryBuffer] = useState(savedMemoryBuffer);

  const {
    searchLongTermMemory,
    retrieveTimeBasedMemories,
    retrieveLastNMemories,
    currentPersona,
    clearConversation,
  } = useApi();

  useEffect(() => {
    // Load chat history for chronological browsing
    loadHistoryData();
  }, []);

  // Sync when other parts of the app update chat history
  useEffect(() => {
    const onUpdated = () => loadHistoryData();
    window.addEventListener(
      'chat-history-updated',
      onUpdated as EventListener
    );
    return () => {
      window.removeEventListener(
        'chat-history-updated',
        onUpdated as EventListener
      );
    };
  }, []);

  const loadHistoryData = () => {
    const chatHistory = loadChatHistory();
    setHistory(chatHistory);

    // Extract unique persona names
    const personas = Array.from(
      new Set(chatHistory.map(entry => entry.persona))
    );
    setUniquePersonas(personas);

    // Also pre-populate manage tab persona list from storage
    try {
      const stored = loadPersonas().map(p => p.name);
      const combined = Array.from(new Set([...(stored || []), ...personas]));
      setAllPersonaNames(combined);
      if (!personaToClear && combined.length > 0) {
        setPersonaToClear(combined[0]);
      }
    } catch (e) {
      // ignore storage errors
    }

    // Initial filtering
    setFilteredHistory(chatHistory);
  };

  // Handle tab switching
  const handleTabChange = (tab: 'browse' | 'search' | 'manage') => {
    setActiveTab(tab);
    setSelectedEntry(null);

    if (tab === 'browse') {
      setDisplayMode('chronological');
    } else if (tab === 'search') {
      setDisplayMode('search');
      setSearchResults([]);
    } else {
      const latestSettings = loadSettings();
      const latestBuffer = latestSettings.memoryBuffer ?? 3;
      setSavedMemoryBuffer(latestBuffer);
      setMemoryBuffer(latestBuffer);
      setDisplayMode('manage');
      // refresh personas list when entering manage tab
      try {
        const stored = loadPersonas().map(p => p.name);
        const combined = Array.from(new Set([...(stored || []), ...uniquePersonas]));
        setAllPersonaNames(combined);
        if (!personaToClear && combined.length > 0) {
          setPersonaToClear(combined[0]);
        }
      } catch (e) {
        // ignore
      }
    }
  };

  // Chronological browsing handlers
  const handlePersonaFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
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
    if (entry.messages.length === 0) return 'No messages';

    // Find the first assistant response, or use the first user message if no assistant responses
    const firstResponse = entry.messages.find(m => m.role === 'assistant');
    if (firstResponse) {
      return (
        firstResponse.content.substring(0, 60) +
        (firstResponse.content.length > 60 ? '...' : '')
      );
    }

    // Fall back to first user message
    return (
      entry.messages[0].content.substring(0, 60) +
      (entry.messages[0].content.length > 60 ? '...' : '')
    );
  };

  // Render functions for different views
  const handleResetMemoryBuffer = () => {
    setMemoryBuffer(savedMemoryBuffer);
  };

  const handleSaveMemoryBuffer = () => {
    try {
      const currentSettings = loadSettings();
      saveSettings({
        ...currentSettings,
        memoryBuffer,
      });
      setSavedMemoryBuffer(memoryBuffer);
      showSuccess('Memory settings saved successfully.');
    } catch (error) {
      showError('Error saving memory settings.');
      console.error('Failed to save memory settings:', error);
    }
  };

  const handleConfirmClearPersona = async () => {
    setIsPersonaConfirmOpen(false);
    if (!personaToClear) {
      showWarning('Please select a character to clear.');
      return;
    }
    try {
      // Clear both STM (chat history) and LTM (Dexie + associations) for selected persona
      await clearConversation(personaToClear);
      showSuccess(`Cleared memory (STM + LTM) for ${personaToClear}.`);
      // Notify and refresh UI state
      window.dispatchEvent(new CustomEvent('chat-history-updated'));
      loadHistoryData();
      setSelectedEntry(null);
    } catch (err) {
      console.error('Failed to clear persona memory:', err);
      showError('Error clearing persona memory.');
    }
  };

  const handleConfirmClearAll = async () => {
    setIsAllConfirmOpen(false);
    try {
      // Clear all long-term memory (Dexie) and associations
      await clearAllLTM();
      clearAllAssociations();
      // Clear all short-term conversation history (all personas) in localStorage
      clearMemory();
      // Reset current persona's in-memory session and view
      await clearConversation(currentPersona);
      window.dispatchEvent(new CustomEvent('clear-chat-display'));
      window.dispatchEvent(new CustomEvent('chat-history-updated'));
      // Refresh UI lists and selections
      loadHistoryData();
      setSelectedEntry(null);
      setPersonaFilter('all');
      showSuccess('Cleared ALL personas\' memory (STM + LTM).');
    } catch (err) {
      console.error('Failed to clear all memory:', err);
      showError('Error clearing all memory.');
    }
  };

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
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Enter search terms..."
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearchQuery();
            }}
          />
          <Button onClick={handleSearchQuery} disabled={isSearching}>
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
            onChange={e => setStartDate(e.target.value)}
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="endDate">To:</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
          <Button onClick={handleTimeSearch} disabled={isSearching}>
            Find
          </Button>
        </InputGroup>
      </TimeSearchSection>
      <ButtonContainer>
        <Button onClick={handleRetrieveRecent} disabled={isSearching}>
          Recent Memories
        </Button>
      </ButtonContainer>

      {searchResults.length > 0 ? (
        <ResultsSection>
          {searchResults.map((message, index) => (
            <Message key={index}>
              {message.role === 'user' ? (
                <UserMessage>
                  <strong>You</strong> (
                  {message.timestamp
                    ? formatDateTime(message.timestamp)
                    : 'unknown time'}
                  ): {message.content}
                </UserMessage>
              ) : message.role === 'assistant' ? (
                <AIMessage>
                  <strong>{currentPersona}</strong> (
                  {message.timestamp
                    ? formatDateTime(message.timestamp)
                    : 'unknown time'}
                  ): {message.content}
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

  const renderManageView = () => {
    const hasMemoryChanges = memoryBuffer !== savedMemoryBuffer;

    return (
      <ManageSection>
        <SectionCard>
          <SectionTitle>Short-Term Memory Window</SectionTitle>
          <SectionDescription>
            These settings control how many conversation exchanges ALTER EGO
            remembers in short-term memory. Lower values may reduce response
            quality but can improve performance and minimize token costs.
          </SectionDescription>
          <InputGroup>
            <Label htmlFor="memoryBuffer">Remember last:</Label>
            <Select
              id="memoryBuffer"
              value={memoryBuffer}
              onChange={e => setMemoryBuffer(Number(e.target.value))}
            >
              <option value="1">
                1 exchange (worst quality, least tokens)
              </option>
              <option value="2">2 exchanges</option>
              <option value="3">3 exchanges (recommended)</option>
              <option value="5">5 exchanges</option>
              <option value="10">
                10 exchanges (best quality, most tokens)
              </option>
            </Select>
          </InputGroup>
          <HelperText>
            Note: Each exchange includes both your message and ALTER EGO's
            response. Changes apply to new messages only.
          </HelperText>
          <ManageButtonRow>
            <PrimaryButton
              onClick={handleResetMemoryBuffer}
              disabled={!hasMemoryChanges}
            >
              Reset
            </PrimaryButton>
            <PrimaryButton
              onClick={handleSaveMemoryBuffer}
              disabled={!hasMemoryChanges}
            >
              Save Settings
            </PrimaryButton>
          </ManageButtonRow>
        </SectionCard>

        <DangerCard>
          <SectionTitle>Clear Memory (Selected Character)</SectionTitle>
          <SectionDescription>
            Permanently delete BOTH short-term conversation history and long-term memory (including associations) for a single character.
          </SectionDescription>
          <InputGroup>
            <Label htmlFor="persona-clear-select">Character:</Label>
            <Select
              id="persona-clear-select"
              value={personaToClear}
              onChange={e => setPersonaToClear(e.target.value)}
            >
              {allPersonaNames.length === 0 ? (
                <option value="" disabled>
                  No characters available
                </option>
              ) : (
                allPersonaNames.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))
              )}
            </Select>
          </InputGroup>
          <DangerButton
            onClick={() => setIsPersonaConfirmOpen(true)}
            disabled={!personaToClear}
          >
            Clear Selected Character Memory
          </DangerButton>
        </DangerCard>

        <DangerCard>
          <SectionTitle>Clear Memory (All Characters)</SectionTitle>
          <SectionDescription>
            Permanently delete ALL short-term conversation histories and long-term memories (including associations) across all characters.
          </SectionDescription>
          <DangerButton onClick={() => setIsAllConfirmOpen(true)}>
            Clear All Memory
          </DangerButton>
        </DangerCard>

        <ConfirmationDialog
          isOpen={isPersonaConfirmOpen}
          title="Confirm Character Memory Deletion"
          message={`This will permanently erase BOTH short-term (chat) and long-term memory for "${personaToClear}". This cannot be undone.`}
          confirmText="Delete Memory"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleConfirmClearPersona}
          onCancel={() => setIsPersonaConfirmOpen(false)}
        />
        <ConfirmationDialog
          isOpen={isAllConfirmOpen}
          title="Confirm Delete ALL Memory"
          message="This will permanently erase ALL short-term conversations and long-term memories (including associations) for every character. This cannot be undone."
          confirmText="Delete ALL Memory"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleConfirmClearAll}
          onCancel={() => setIsAllConfirmOpen(false)}
        />
      </ManageSection>
    );
  };

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
        <Tab
          active={activeTab === 'manage'}
          onClick={() => handleTabChange('manage')}
        >
          Manage Memory
        </Tab>
      </TabContainer>

      {displayMode === 'chronological' && renderChronologicalView()}
      {displayMode === 'search' && renderSearchView()}
      {displayMode === 'manage' && renderManageView()}
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
