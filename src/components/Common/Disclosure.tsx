import React, { useCallback, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

/**
 * Supplementary-content primitives.
 *
 * Explanatory copy used to be rendered as always-open, high-contrast panels
 * that visually outranked the controls they described. These components give
 * that copy a consistent, recessive treatment:
 *
 *   <Disclosure> -- collapsed by default; the summary line is the only thing
 *                   competing for attention until the reader opts in. Remembers
 *                   its open state per `id` so a reader who wants the detail
 *                   keeps it.
 *   <Notice>     -- short, always-visible status text (one or two lines).
 *                   For things the reader must see, not things they may want.
 *   <Hint>       -- inline field-level help, quieter than body text.
 *
 * All three share one tone scale so the app stops mixing five different
 * "supplementary text" visual languages.
 */

export type Tone = 'info' | 'warn' | 'danger' | 'neutral';

const TONES: Record<Tone, { accent: string; surface: string; text: string }> = {
  neutral: { accent: '#0f04', surface: '#00140c', text: '#0f0c' },
  info: { accent: '#0ff5', surface: '#00161c', text: '#9fe8e8' },
  warn: { accent: '#fa05', surface: '#1a1200', text: '#f3c877' },
  danger: { accent: '#f445', surface: '#1a0606', text: '#f19a9a' },
};

const toneStyles = (tone: Tone) => {
  const t = TONES[tone];
  return css`
    border: 1px solid ${t.accent};
    background: ${t.surface};
    color: ${t.text};
  `;
};

const STORAGE_PREFIX = 'alterEgo.disclosure.';

const readPersisted = (id?: string): boolean | null => {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    return raw === null ? null : raw === '1';
  } catch {
    return null;
  }
};

const persist = (id: string | undefined, open: boolean): void => {
  if (!id) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + id, open ? '1' : '0');
  } catch {
    /* storage unavailable; open state is simply not remembered */
  }
};

/* -------------------------------------------------------------------------- */
/* Disclosure                                                                  */
/* -------------------------------------------------------------------------- */

const DisclosureRoot = styled.div<{ $tone: Tone }>`
  ${props => toneStyles(props.$tone)}
  border-radius: var(--ae-radius-sm);
  margin: 0 0 1em;
  font-size: 0.85em;
  line-height: 1.55;
`;

const SummaryButton = styled.button<{ $tone: Tone }>`
  && {
    display: flex;
    align-items: center;
    gap: 0.6em;
    width: 100%;
    min-height: 0;
    padding: 0.55em 0.8em;
    margin: 0;
    border: 0;
    border-radius: var(--ae-radius-sm);
    background: transparent;
    color: ${props => TONES[props.$tone].text};
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  &&:hover {
    background: #ffffff08;
    color: ${props => TONES[props.$tone].text};
  }

  &&:focus-visible {
    outline: none;
    box-shadow: var(--ae-focus-ring);
  }
`;

const Marker = styled.span`
  flex: none;
  width: 1.1em;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
`;

const SummaryText = styled.span`
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const Panel = styled.div<{ $tone: Tone }>`
  padding: 0 0.8em 0.75em 2.5em;
  color: ${props => TONES[props.$tone].text};

  p {
    margin: 0 0 0.6em;
  }

  p:last-child,
  ul:last-child,
  ol:last-child {
    margin-bottom: 0;
  }

  ul,
  ol {
    margin: 0 0 0.6em;
    padding-left: 1.2em;
  }

  li {
    margin-bottom: 0.35em;
  }

  li:last-child {
    margin-bottom: 0;
  }

  strong {
    color: #fff;
    font-weight: bold;
  }

  a {
    color: var(--ae-color-blue);
  }

  @media (max-width: 480px) {
    padding-left: 0.8em;
  }
`;

interface DisclosureProps {
  /** The always-visible summary line. Keep it under ~60 characters. */
  summary: string;
  /** Stable key used to remember the open state across sessions. */
  id?: string;
  tone?: Tone;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Disclosure: React.FC<DisclosureProps> = ({
  summary,
  id,
  tone = 'info',
  defaultOpen = false,
  children,
  className,
}) => {
  const [open, setOpen] = useState<boolean>(
    () => readPersisted(id) ?? defaultOpen
  );

  // A different `id` means a different disclosure; re-read its remembered state.
  useEffect(() => {
    setOpen(readPersisted(id) ?? defaultOpen);
  }, [id, defaultOpen]);

  const toggle = useCallback(() => {
    setOpen(prev => {
      persist(id, !prev);
      return !prev;
    });
  }, [id]);

  const panelId = id ? `disclosure-panel-${id}` : undefined;

  return (
    <DisclosureRoot $tone={tone} className={className}>
      <SummaryButton
        type="button"
        $tone={tone}
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Marker aria-hidden="true">{open ? '[-]' : '[+]'}</Marker>
        <SummaryText>{summary}</SummaryText>
      </SummaryButton>
      {open && (
        <Panel id={panelId} $tone={tone}>
          {children}
        </Panel>
      )}
    </DisclosureRoot>
  );
};

/* -------------------------------------------------------------------------- */
/* Notice                                                                      */
/* -------------------------------------------------------------------------- */

export const Notice = styled.div<{ $tone?: Tone }>`
  ${props => toneStyles(props.$tone ?? 'info')}
  border-radius: var(--ae-radius-sm);
  padding: 0.6em 0.85em;
  margin: 0 0 1em;
  font-size: 0.85em;
  line-height: 1.5;
  overflow-wrap: anywhere;

  strong {
    color: #fff;
  }

  a {
    color: var(--ae-color-blue);
  }

  > :last-child {
    margin-bottom: 0;
  }
`;

/* -------------------------------------------------------------------------- */
/* Hint                                                                        */
/* -------------------------------------------------------------------------- */

/** Field-level help. Sits directly under the input it describes. */
export const Hint = styled.p`
  margin: 0.4em 0 0;
  font-size: 0.78em;
  line-height: 1.45;
  color: var(--ae-color-text-muted);
  overflow-wrap: anywhere;

  a {
    color: var(--ae-color-blue);
  }
`;

/** One-line intro under a screen title. Sets context without a boxed panel. */
export const ScreenIntro = styled.p`
  margin: -0.4em 0 1.2em;
  font-size: 0.85em;
  line-height: 1.5;
  color: var(--ae-color-text-muted);
`;

export default Disclosure;
