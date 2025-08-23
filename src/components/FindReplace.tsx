import React, { useEffect, useState } from 'react';

export default function FindReplace(props: { onClose: () => void }) {
  const { onClose } = props;
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [regex, setRegex] = useState(false);

  const trigger = (actionId: string) => {
    document.dispatchEvent(new CustomEvent(actionId));
  };

  useEffect(() => {
    trigger('editor:find');
  }, []);

  return (
    <div className="panel findreplace">
      <div className="panel-header">
        <strong>Find / Replace</strong>
        <button onClick={onClose}>×</button>
      </div>
      <div className="panel-body">
        <input placeholder="Find" value={find} onChange={e => setFind(e.target.value)} />
        <input placeholder="Replace" value={replace} onChange={e => setReplace(e.target.value)} />
        <label><input type="checkbox" checked={regex} onChange={e => setRegex(e.target.checked)} /> Regex</label>
        <div className="actions">
          <button onClick={() => trigger('editor:find')}>Find</button>
          <button onClick={() => trigger('editor:replace')}>Replace</button>
        </div>
        <div className="hint">Use Ctrl/Cmd+F, Ctrl/Cmd+H for built-in Monaco find/replace.</div>
      </div>
    </div>
  );
}

