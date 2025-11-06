import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

const MarkdownContainer = styled.div`
  line-height: 1.6;
  color: ${theme.colors.text};
  font-size: inherit; /* Inherit font size from parent */

  /* Paragraphs */
  p {
    margin: 0 0 0.5em 0;
    white-space: pre-wrap;
    word-break: break-word;

    &:last-child {
      margin-bottom: 0;
    }
  }

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    margin: 0.8em 0 0.4em 0;
    font-weight: 600;
    line-height: 1.3;

    &:first-child {
      margin-top: 0;
    }
  }

  h1 { font-size: 1.6em; }
  h2 { font-size: 1.4em; }
  h3 { font-size: 1.2em; }
  h4 { font-size: 1.1em; }
  h5 { font-size: 1em; }
  h6 { font-size: 0.9em; }

  /* Emphasis */
  strong {
    font-weight: 600;
    color: ${theme.colors.text};
  }

  em {
    font-style: italic;
    color: ${theme.colors.text};
  }

  /* Code */
  code {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9em;
  }

  pre {
    background-color: rgba(0, 0, 0, 0.1);
    padding: ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
    overflow-x: auto;
    margin: 0.5em 0;

    code {
      background-color: transparent;
      padding: 0;
      font-size: 0.85em;
    }
  }

  /* Lists */
  ul, ol {
    margin: 0.5em 0;
    padding-left: 1.5em;

    &:last-child {
      margin-bottom: 0;
    }
  }

  li {
    margin: 0.25em 0;
  }

  /* Nested lists */
  li > ul, li > ol {
    margin: 0.25em 0;
  }

  /* Blockquotes */
  blockquote {
    margin: 0.5em 0;
    padding-left: ${theme.spacing.md};
    border-left: 3px solid ${theme.colors.primary};
    color: ${theme.colors.textSecondary};
    font-style: italic;
  }

  /* Links */
  a {
    color: ${theme.colors.primary};
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s ease;

    &:hover {
      border-bottom-color: ${theme.colors.primary};
    }
  }

  /* Horizontal Rule */
  hr {
    border: none;
    border-top: 1px solid ${theme.colors.textSecondary};
    margin: 1em 0;
  }

  /* Tables (from GFM) */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5em 0;
    font-size: 0.9em;
  }

  th, td {
    border: 1px solid ${theme.colors.textSecondary};
    padding: 0.5em;
    text-align: left;
  }

  th {
    background-color: rgba(0, 0, 0, 0.05);
    font-weight: 600;
  }

  /* Strikethrough (from GFM) */
  del {
    text-decoration: line-through;
    opacity: 0.7;
  }

  /* Task lists (from GFM) */
  input[type="checkbox"] {
    margin-right: 0.5em;
  }
`;

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <MarkdownContainer className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Prevent external links from being dangerous
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </MarkdownContainer>
  );
};

export default MarkdownRenderer;
