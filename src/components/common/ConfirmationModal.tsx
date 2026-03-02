import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmButtonColor = '#19411F',
  cancelButtonColor = '#6B7280'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-6 text-center">
          {message}
        </p>
        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="w-full py-3 text-white font-medium text-base rounded-lg transition-colors flex items-center justify-center"
            style={{ backgroundColor: confirmButtonColor }}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 text-gray-700 font-medium text-base rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
            style={{ color: cancelButtonColor }}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

