import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { flattenJson } from '../lib/json/flatten';

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
    if (!query.trim()) return [] as Array<{ path: string; value: unknown }>;
    try {
      const { entries } = flattenJson(content, query.trim(), { max: 1000 });
      setWarn(entries.truncated ? 'Results truncated' : null);
      return entries.items;
    } catch (e: any) {
      setWarn(e.message);
      return [];
    }
  }, [content, query]);

  const handleClick = (path: string, value: unknown) => {
    const needle = JSON.stringify(value);
    const lines = content.split(/\r?\n/);
    const idx = lines.findIndex(l => l.includes(needle) || l.includes(path.split('.').pop() ?? ''));
    const lineNumber = Math.max(1, idx + 1);
    const column = Math.max(1, (lines[idx]?.indexOf(needle?.replace(/^"|"$/g, '')) ?? 0) + 1);
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
          {items.map(({ path, value }, i) => (
            <li key={i} onClick={() => handleClick(path, value)}>
              <code>{path}</code>
              <span> = </span>
              <code className="value">{formatValue(value)}</code>
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

