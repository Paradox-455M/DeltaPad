import React, { useEffect, useState } from 'react';
import { Tab } from './EditorTabs';

export default function StatusBar(props: { activeTab?: Tab; wrap: boolean }) {
  const { activeTab, wrap } = props;
  const [pos, setPos] = useState({ line: 1, column: 1 });
  const [meta, setMeta] = useState<{ eol: 'lf' | 'crlf'; encoding: string }>({ eol: 'lf', encoding: 'UTF-8' });

  useEffect(() => {
    const onPos = (ev: any) => setPos(ev.detail);
    const onMeta = (ev: any) => setMeta(ev.detail);
    document.addEventListener('status:update', onPos as EventListener);
    document.addEventListener('status:meta', onMeta as EventListener);
    return () => {
      document.removeEventListener('status:update', onPos as EventListener);
      document.removeEventListener('status:meta', onMeta as EventListener);
    };
  }, []);

  const language = activeTab?.language ?? 'plaintext';
  const eol = meta.eol === 'crlf' ? 'CRLF' : 'LF';

  return (
    <div className="statusbar">
      <span>{language}</span>
      <span>Ln {pos.line}, Col {pos.column}</span>
      <span>{eol}</span>
      <span>{meta.encoding}</span>
      <span>{wrap ? 'Word Wrap: On' : 'Word Wrap: Off'}</span>
    </div>
  );
}

