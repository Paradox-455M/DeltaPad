import React from 'react';

export default function ConfirmCloseDialog(props: {
  confirm: { tabId?: string; title?: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { confirm, onConfirm, onCancel } = props;
  if (!confirm) return null;
  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Save changes to “{confirm.title}”?</h3>
        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm}>Don’t Save</button>
        </div>
      </div>
    </div>
  );
}

