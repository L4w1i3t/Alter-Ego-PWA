import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

// Animation for notification entry
const slideIn = keyframes`
  from {
    transform: translateY(-100%);
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

const NotificationContainer = styled.div<{
  $type: 'success' | 'error' | 'info' | 'warning';
  $isExiting: boolean;
}>`
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 320px;
  max-width: 500px;
  padding: 1em 1.5em;
  border-radius: 0.5em;
  border: 2px solid;
  background: #000;
  color: #fff;
  font-family: 'Courier New', monospace;
  z-index: 10000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  animation: ${props => (props.$isExiting ? slideOut : slideIn)} 0.3s
    ease-in-out;

  ${props => {
    switch (props.$type) {
      case 'success':
        return `
          border-color: #0f0;
          background: linear-gradient(135deg, #001100 0%, #002200 100%);
          color: #0f0;
        `;
      case 'error':
        return `
          border-color: #f00;
          background: linear-gradient(135deg, #110000 0%, #220000 100%);
          color: #f00;
        `;
      case 'warning':
        return `
          border-color: #ff0;
          background: linear-gradient(135deg, #111100 0%, #222200 100%);
          color: #ff0;
        `;
      case 'info':
        return `
          border-color: #00f;
          background: linear-gradient(135deg, #000011 0%, #000022 100%);
          color: #00f;
        `;
      default:
        return `
          border-color: #0f0;
          background: linear-gradient(135deg, #001100 0%, #002200 100%);
          color: #0f0;
        `;
    }
  }}
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
          return '"✓"';
        case 'error':
          return '"✗"';
        case 'warning':
          return '"⚠"';
        case 'info':
          return '"ⓘ"';
        default:
          return '"✓"';
      }
    }};
    font-size: 1.2em;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: inherit;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0;
  margin-left: 1em;
  opacity: 0.7;

  &:hover {
    opacity: 1;
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
`;

const ProgressBar = styled.div<{
  $type: 'success' | 'error' | 'info' | 'warning';
}>`
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: ${props => {
      switch (props.$type) {
        case 'success':
          return '#0f0';
        case 'error':
          return '#f00';
        case 'warning':
          return '#ff0';
        case 'info':
          return '#00f';
        default:
          return '#0f0';
      }
    }};
    transition: width 0.1s linear;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5em;
  align-items: center;
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
  border-radius: 0.3em;
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
        <NotificationTitle $type={type}>{getTitle()}</NotificationTitle>
        <CloseButton onClick={handleClose}>×</CloseButton>
      </NotificationHeader>

      <NotificationMessage>{message}</NotificationMessage>

      {(showProgress || actions.length > 0) && (
        <ProgressContainer>
          {showProgress && duration > 0 && (
            <>
              <ProgressBar $type={type}>
                <div style={{ width: `${progress}%` }} />
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
                {isPaused ? '▶' : '⏸'}
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
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10000,
          }}
        >
          <Notification {...state.notification} onDismiss={dismiss} />
        </div>
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
