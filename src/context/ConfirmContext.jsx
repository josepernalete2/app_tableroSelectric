import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ModalConfirmacion from '../components/ModalConfirmacion';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger', // 'danger' | 'warning' | 'info'
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    isAlert: false,
  });

  // Referencia a la función de resolución de la Promesa
  const resolverRef = useRef(null);

  /**
   * confirm: Abre un diálogo de confirmación asíncrono que retorna una Promesa booleana.
   * @param {string|object} options - Mensaje en texto o configuración completa
   */
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;

      if (typeof options === 'string') {
        setModalState({
          isOpen: true,
          title: 'Confirmar acción',
          message: options,
          type: 'danger',
          confirmText: 'Confirmar',
          cancelText: 'Cancelar',
          isAlert: false,
        });
      } else {
        const {
          title = 'Confirmar acción',
          message = '',
          type = 'danger',
          confirmText = 'Confirmar',
          cancelText = 'Cancelar',
        } = options || {};

        setModalState({
          isOpen: true,
          title,
          message,
          type,
          confirmText,
          cancelText,
          isAlert: false,
        });
      }
    });
  }, []);

  /**
   * alert: Abre un diálogo de alerta asíncrono estilizado con un solo botón de aceptación.
   * @param {string|object} options - Mensaje en texto o configuración completa
   */
  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;

      if (typeof options === 'string') {
        setModalState({
          isOpen: true,
          title: 'Notificación',
          message: options,
          type: 'warning',
          confirmText: 'Entendido',
          cancelText: '',
          isAlert: true,
        });
      } else {
        const {
          title = 'Notificación',
          message = '',
          type = 'warning',
          confirmText = 'Entendido',
        } = options || {};

        setModalState({
          isOpen: true,
          title,
          message,
          type,
          confirmText,
          cancelText: '',
          isAlert: true,
        });
      }
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <ModalConfirmacion
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        isAlert={modalState.isAlert}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm debe ser utilizado dentro de un ConfirmProvider');
  }
  return context;
};

export default ConfirmContext;
