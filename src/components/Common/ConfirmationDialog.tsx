import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  background-color: #000;
  border: 2px solid #0f0;
  border-radius: 0.5em;
  padding: 2em;
  max-width: 400px;
  width: 90%;
  color: #0f0;
  font-family: 'Courier New', monospace;
`;

const Title = styled.h3`
  margin: 0 0 1em 0;
  color: #0f0;
  font-size: 1.2em;
`;

const Message = styled.p`
  margin: 0 0 1.5em 0;
  line-height: 1.4;
  color: #0f0;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1em;
  justify-content: flex-end;
`;

const Button = styled.button`
  background: transparent;
  color: #0f0;
  border: 1px solid #0f0;
  padding: 0.7em 1.5em;
  cursor: pointer;
  border-radius: 0.3em;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  transition: all 0.2s ease;

  &:hover {
    background: #0f0;
    color: #000;
  }
`;

const CancelButton = styled(Button)`
  border-color: #666;
  color: #666;

  &:hover {
    background: #666;
    color: #000;
  }
`;

const ConfirmButton = styled(Button).withConfig({
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant?: 'danger' | 'primary' }>`
  border-color: ${props => props.variant === 'danger' ? '#f00' : '#0f0'};
  color: ${props => props.variant === 'danger' ? '#f00' : '#0f0'};

  &:hover {
    background: ${props => props.variant === 'danger' ? '#f00' : '#0f0'};
    color: #000;
  }
`;

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Dialog>
        <Title>{title}</Title>
        <Message>{message}</Message>
        <ButtonContainer>
          <CancelButton onClick={onCancel}>{cancelText}</CancelButton>
          <ConfirmButton variant={variant} onClick={onConfirm}>
            {confirmText}
          </ConfirmButton>
        </ButtonContainer>
      </Dialog>
    </Overlay>
  );
};

export default ConfirmationDialog;
