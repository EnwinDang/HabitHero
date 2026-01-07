import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  label?: string;
  maxWidth?: number;
  showClose?: boolean;
}

export function Modal({ title, children, onClose, label = "Modal", maxWidth = 720, showClose = false }: ModalProps) {
  return (
    <div className="hh-modal-overlay">
      <div className="hh-modal" style={{ maxWidth }}>
        <div className="hh-modal__head">
          <div>
            <div className="hh-label">{label}</div>
            <div className="hh-title-sm" style={{ marginTop: 6 }}>
              {title}
            </div>
          </div>
          {showClose && (
            <button type="button" onClick={onClose} className="hh-btn hh-btn-secondary">
              Close
            </button>
          )}
        </div>
        <div className="hh-modal__body">{children}</div>
      </div>
    </div>
  );
}

