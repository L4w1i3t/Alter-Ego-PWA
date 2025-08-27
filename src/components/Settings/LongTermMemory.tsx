import React, { useState } from 'react';
import styled from 'styled-components';
import { useApi } from '../../context/ApiContext';
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from '../Common/NotificationManager';

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

const SearchSection = styled.div`
  width: 100%;
  margin-bottom: 2em;

  @media (max-width: 768px) {
    margin-bottom: 2.5em;
  }
`;

const TimeSearchSection = styled.div`
  width: 100%;
  margin-bottom: 2em;

  @media (max-width: 768px) {
    margin-bottom: 2.5em;
  }
`;

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1em;

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

const Message = styled.div`
  margin-bottom: 1em;
  padding: 0.5em;
  border-bottom: 1px solid #0f03;

  @media (max-width: 768px) {
    padding: 0.8em;
    margin-bottom: 1.2em;
  }
`;

const UserMessage = styled.div`
  color: #0af;
  margin-bottom: 0.5em;

  @media (max-width: 768px) {
    font-size: 1em;
    line-height: 1.5;
  }
`;

const AIMessage = styled.div`
  color: #0f0;

  @media (max-width: 768px) {
    font-size: 1em;
    line-height: 1.5;
  }
`;

const NoResults = styled.p`
  color: #f00;
  text-align: center;
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

interface LongTermMemoryProps {
  onBack: () => void;
}

const LongTermMemory: React.FC<LongTermMemoryProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchResults, setSearchResults] = useState<
    { role: 'user' | 'assistant' | 'system'; content: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  const {
    searchLongTermMemory,
    retrieveTimeBasedMemories,
    retrieveLastNMemories,
    currentPersona,
  } = useApi();
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

  return (
    <Container>
      <Title>Long-Term Memory - {currentPersona}</Title>

      <SearchSection>
        <InputGroup>
          <Label htmlFor="searchQuery">Search:</Label>
          <Input
            id="searchQuery"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Enter search terms..."
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
        <Button onClick={onBack}>Back</Button>
        <Button onClick={handleRetrieveRecent} disabled={isSearching}>
          Recent Memories
        </Button>{' '}
      </ButtonContainer>

      {searchResults.length > 0 ? (
        <ResultsSection>
          {searchResults.map((message, index) => (
            <Message key={index}>
              {message.role === 'user' ? (
                <UserMessage>You: {message.content}</UserMessage>
              ) : message.role === 'assistant' ? (
                <AIMessage>
                  {currentPersona}: {message.content}
                </AIMessage>
              ) : (
                <AIMessage>System: {message.content}</AIMessage>
              )}
            </Message>
          ))}
        </ResultsSection>
      ) : isSearching ? null : (
        <NoResults>No memory results to display</NoResults>
      )}
    </Container>
  );
};

export default LongTermMemory;
