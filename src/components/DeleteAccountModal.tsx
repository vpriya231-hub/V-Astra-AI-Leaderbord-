import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  errorMessage: string | null;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  isDeleting,
  errorMessage,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = confirmationInput.trim().toLowerCase() === 'delete';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;
    await onConfirmDelete();
  };

  return (
    <div 
      id="delete-account-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      <div 
        id="delete-account-modal"
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-100 overflow-hidden"
      >
        {/* Top Header Warning */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                Delete Account
              </h3>
              <p className="text-xs text-rose-600 font-semibold">
                Permanent and irreversible action
              </p>
            </div>
          </div>

          <button
            id="close-delete-modal-btn"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="mt-4 space-y-3">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Are you sure you want to delete your account? This will immediately:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside bg-rose-50/60 rounded-2xl p-3.5 border border-rose-100/80">
            <li>Permanently remove your profile from the live leaderboard</li>
            <li>Delete your unique referral code and referral stats</li>
            <li>Erase your account record from the database</li>
            <li>Delete your login credentials from Firebase</li>
          </ul>

          <div className="pt-2">
            <label 
              htmlFor="confirm-delete-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              To confirm, type <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 select-all">delete</span> below:
            </label>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                id="confirm-delete-input"
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder='Type "delete"'
                autoFocus
                disabled={isDeleting}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-rose-500 focus:bg-white focus:outline-none transition-all"
              />

              {errorMessage && (
                <div 
                  id="delete-error-message"
                  className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200"
                >
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  id="cancel-delete-btn"
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-btn"
                  type="submit"
                  disabled={!isConfirmed || isDeleting}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 active:scale-98 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm shadow-rose-200"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deleting Account...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
