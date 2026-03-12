import React from 'react';
import '../styles/confirm-dialog.css';

/**
 * Propiedades para el componente ConfirmDialog.
 */
interface ConfirmDialogProps {
  /** Indica si el diálogo está visible. */
  isOpen: boolean;
  /** Título principal del diálogo. */
  title: string;
  /** Mensaje o descripción del diálogo. */
  message: string;
  /** Texto del botón de confirmación (por defecto 'Confirmar'). */
  confirmText?: string;
  /** Texto del botón de cancelación (por defecto 'Cancelar'). */
  cancelText?: string;
  /** Si es true, el botón de confirmación resalta como acción peligrosa. */
  isDangerous?: boolean;
  /** Función a ejecutar al confirmar. */
  onConfirm: () => void;
  /** Función a ejecutar al cancelar o cerrar. */
  onCancel: () => void;
  /** Muestra un estado de carga en los botones. */
  isLoading?: boolean;
}

/**
 * Componente modal de confirmación reutilizable.
 * Permite al usuario confirmar o cancelar acciones importantes o peligrosas.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDangerous = false,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-dialog-buttons">
          <button
            className="confirm-dialog-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-dialog-confirm ${isDangerous ? 'dangerous' : ''}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner"></span> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
