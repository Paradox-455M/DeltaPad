import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { flattenJson, type Entry } from '../lib/json/flatten';

export default function JsonPathPanel(props: {
  content: string;
  onJump: (pos: { lineNumber: number; column: number }) => void;
  onClose: () => void;
  width: number;
  onResize: (w: number) => void;
}) {
  const { content, onJump, onClose, width, onResize } = props;
  const [query, setQuery] = useState('');
  const [warn, setWarn] = useState<string | null>(null);

  const items = useMemo(() => {
    if (!query.trim()) return [] as Array<Entry>;
    try {
      const { entries } = flattenJson(content, query.trim(), { max: 1000 });
      setWarn(entries.truncated ? 'Results truncated' : null);
      return entries.items;
    } catch (e: any) {
      setWarn(e.message);
      return [];
    }
  }, [content, query]);

  const handleClick = (entry: Entry) => {
    const before = content.slice(0, entry.start);
    const lineNumber = before.split(/\r?\n/).length;
    const lastNl = before.lastIndexOf('\n');
    const column = entry.start - (lastNl >= 0 ? lastNl : -1);
    onJump({ lineNumber, column });
  };

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      const dx = startX - ev.clientX; // dragging handle at left edge of right panel
      const next = Math.max(260, Math.min(640, startW + dx));
      onResize(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const panel = (
    <motion.div className="panel jsonpath" style={{ width }} initial={{ x: 12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="resizer-left" onMouseDown={startDrag} />
      <div className="panel-header">
        <span className="neon-text" style={{ fontWeight: 600 }}>JSON Path</span>
        <input className="jsonpath-input" placeholder="e.g. address.city or items[0].name" value={query} onChange={e => setQuery(e.target.value)} />
        <button className="close" title="Close" aria-label="Close JSON Path" onClick={onClose}>×</button>
      </div>
      <div className="panel-body jsonpath-body">
        {warn && <div className="warn">{warn}</div>}
        <ul>
          {items.map((entry, i) => (
            <li key={i} onClick={() => handleClick(entry)}>
              <code>{entry.path}</code>
              <span> = </span>
              <code className="value">{formatValue(entry.value)}</code>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );

  return createPortal(panel, document.body);
}

function formatValue(v: unknown) {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v === null) return 'null';
  return Array.isArray(v) ? `[${v.length}]` : '{...}';
}

