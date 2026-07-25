import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  CheckIcon,
  WarningIcon,
  InfoIcon,
  CloseIcon,
  PauseIcon,
  PlayIcon,
} from '../Common/Icons';
import { safeAreaTop, safeAreaSides } from '../../styles/safeArea';

// Animation for notification entry
const slideIn = keyframes`
  from {
    transform: translateY(-12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
`;

const getAccent = (type: 'success' | 'error' | 'info' | 'warning') => {
  switch (type) {
    case 'success':
      return '#0f0';
    case 'error':
      return '#f33';
    case 'warning':
      return '#fa0';
    case 'info':
      return '#0af';
    default:
      return '#0f0';
  }
};

const NotificationViewport = styled.div`
  position: fixed;
  ${safeAreaTop('16px')}
  right: calc(16px + var(--ae-safe-right, 0px));
  z-index: var(--ae-z-toast);
  pointer-events: none;

  @media (max-width: 560px) {
    ${safeAreaTop('10px')}
    ${safeAreaSides('10px')}
  }
`;

const NotificationContainer = styled.div<{
  $type: 'success' | 'error' | 'info' | 'warning';
  $isExiting: boolean;
}>`
  width: min(500px, calc(100vw - 32px));
  min-width: min(320px, calc(100vw - 32px));
  padding: 0.9em 1em;
  border-radius: 8px;
  border: 1px solid ${props => getAccent(props.$type)};
  background: #030806;
  color: ${props => getAccent(props.$type)};
  font-family: 'Courier New', monospace;
  pointer-events: auto;
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  animation: ${props => (props.$isExiting ? slideOut : slideIn)} 0.22s ease;

  @media (max-width: 560px) {
    width: 100%;
    min-width: 0;
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5em;
`;

const NotificationTitle = styled.div<{
  $type: 'success' | 'error' | 'info' | 'warning';
}>`
  font-weight: bold;
  font-size: 1em;
  display: flex;
  align-items: center;
  gap: 0.5em;

  &::before {
    content: ${props => {
      switch (props.$type) {
        case 'success':
          return '""';
        case 'error':
          return '""';
        case 'warning':
          return '""';
        case 'info':
          return '""';
        default:
          return '""';
      }
    }};
    font-size: 1.2em;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 6px;
  color: inherit;
  cursor: pointer;
  padding: 0;
  margin-left: 1em;
  opacity: 0.75;
  width: 2.1em;
  height: 2.1em;
  min-width: 2.1em;
  min-height: 2.1em;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;

  /* X made from two diagonal lines */
  &::before {
    content: '';
    position: absolute;
    width: 1.2em;
    height: 2px;
    background: currentColor;
    transform: rotate(45deg);
  }

  &::after {
    content: '';
    position: absolute;
    width: 1.2em;
    height: 2px;
    background: currentColor;
    transform: rotate(-45deg);
  }

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.12);
  }

  &:active {
    transform: translateY(1px);
  }
`;

const NotificationMessage = styled.div`
  line-height: 1.4;
  margin-bottom: 0.8em;
`;

const ProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8em;
  margin-top: 0.8em;

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const ProgressBar = styled.div<{
  $type: 'success' | 'error' | 'info' | 'warning';
}>`
  flex: 1;
  height: 5px;
  min-width: 8em;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  overflow: hidden;

  @media (max-width: 560px) {
    width: 100%;
  }
`;

const ProgressFill = styled.div<{
  $type: 'success' | 'error' | 'info' | 'warning';
  $progress: number;
}>`
  width: ${props => props.$progress}%;
  height: 100%;
  background: ${props => getAccent(props.$type)};
  transition: width 0.1s linear;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5em;
  align-items: center;

  @media (max-width: 560px) {
    width: 100%;
    flex-wrap: wrap;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  background: transparent;
  border: 1px solid;
  color: inherit;
  border-color: ${props =>
    props.$variant === 'secondary'
      ? 'rgba(255, 255, 255, 0.3)'
      : 'currentColor'};
  padding: 0.3em 0.8em;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8em;
  font-family: inherit;
  opacity: ${props => (props.$variant === 'secondary' ? '0.7' : '1')};

  &:hover {
    background: currentColor;
    color: #000;
    opacity: 1;
  }
`;

const TimerText = styled.span`
  font-size: 0.7em;
  opacity: 0.7;
  min-width: 3em;
  text-align: center;
`;

export interface NotificationConfig {
  id?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number; // in milliseconds, 0 = no auto-dismiss
  showProgress?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  onClose?: () => void;
}

interface NotificationProps extends NotificationConfig {
  onDismiss: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({
  id = '',
  type,
  title,
  message,
  duration = 5000,
  showProgress = true,
  actions = [],
  onClose,
  onDismiss,
}) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Notification';
    }
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
      onDismiss(id);
    }, 300);
  };

  const handlePause = () => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now() - (duration - timeRemaining);
  };

  // Auto-dismiss timer with progress
  useEffect(() => {
    if (duration === 0 || isPaused) return;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      const progressPercent = (remaining / duration) * 100;

      setProgress(progressPercent);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        handleClose();
      }
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [duration, isPaused, timeRemaining]);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <NotificationContainer $type={type} $isExiting={isExiting}>
      <NotificationHeader>
        <NotificationTitle $type={type}>
          {type === 'success' && <CheckIcon size={16} aria-hidden="true" />}
          {type === 'warning' && <WarningIcon size={16} aria-hidden="true" />}
          {type === 'info' && <InfoIcon size={16} aria-hidden="true" />}
          {type === 'error' && <CloseIcon size={16} aria-hidden="true" />}
          {getTitle()}
        </NotificationTitle>
        <CloseButton onClick={handleClose} aria-label="Dismiss notification" />
      </NotificationHeader>

      <NotificationMessage>{message}</NotificationMessage>

      {(showProgress || actions.length > 0) && (
        <ProgressContainer>
          {showProgress && duration > 0 && (
            <>
              <ProgressBar $type={type}>
                <ProgressFill $type={type} $progress={progress} />
              </ProgressBar>
              <TimerText>{formatTime(timeRemaining)}</TimerText>
            </>
          )}

          <ActionButtons>
            {duration > 0 && (
              <ActionButton
                $variant="secondary"
                onClick={isPaused ? handleResume : handlePause}
              >
                {isPaused ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <PlayIcon size={14} aria-hidden="true" /> Resume
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <PauseIcon size={14} aria-hidden="true" /> Pause
                  </span>
                )}
              </ActionButton>
            )}

            {actions.map((action, index) => (
              <ActionButton
                key={index}
                $variant={action.variant}
                onClick={() => {
                  action.action();
                  handleClose();
                }}
              >
                {action.label}
              </ActionButton>
            ))}
          </ActionButtons>
        </ProgressContainer>
      )}
    </NotificationContainer>
  );
};

interface NotificationManagerState {
  notification: (NotificationConfig & { id: string }) | null;
}

let notificationManagerInstance: {
  show: (config: NotificationConfig) => string;
  dismiss: (id: string) => void;
  clear: () => void;
} | null = null;

export const NotificationManager: React.FC = () => {
  const [state, setState] = useState<NotificationManagerState>({
    notification: null,
  });
  const nextIdRef = useRef(1);

  const show = (config: NotificationConfig): string => {
    const id = config.id || `notification-${nextIdRef.current++}`;
    const notification = { ...config, id };

    // Replace any existing notification immediately with the new one
    setState({ notification });

    return id;
  };

  const dismiss = (id: string) => {
    setState(prev => ({
      notification: prev.notification?.id === id ? null : prev.notification,
    }));
  };

  const clear = () => {
    setState({ notification: null });
  };

  // Set up the global instance
  useEffect(() => {
    notificationManagerInstance = { show, dismiss, clear };
    return () => {
      notificationManagerInstance = null;
    };
  }, []);

  return (
    <>
      {state.notification && (
        <NotificationViewport>
          <Notification {...state.notification} onDismiss={dismiss} />
        </NotificationViewport>
      )}
    </>
  );
};

// Global notification API
export const showNotification = (config: NotificationConfig): string => {
  if (!notificationManagerInstance) {
    console.warn('NotificationManager not initialized');
    return '';
  }
  return notificationManagerInstance.show(config);
};

export const dismissNotification = (id: string): void => {
  if (!notificationManagerInstance) {
    console.warn('NotificationManager not initialized');
    return;
  }
  notificationManagerInstance.dismiss(id);
};

export const clearAllNotifications = (): void => {
  if (!notificationManagerInstance) {
    console.warn('NotificationManager not initialized');
    return;
  }
  notificationManagerInstance.clear();
};

// Convenience functions for common notification types
export const showSuccess = (
  message: string,
  options?: Partial<NotificationConfig>
) => showNotification({ type: 'success', message, ...options });

export const showError = (
  message: string,
  options?: Partial<NotificationConfig>
) => showNotification({ type: 'error', message, duration: 0, ...options }); // Errors don't auto-dismiss

export const showWarning = (
  message: string,
  options?: Partial<NotificationConfig>
) => showNotification({ type: 'warning', message, ...options });

export const showInfo = (
  message: string,
  options?: Partial<NotificationConfig>
) => showNotification({ type: 'info', message, ...options });

export default NotificationManager;
