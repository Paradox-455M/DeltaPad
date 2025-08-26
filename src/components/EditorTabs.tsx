import React from 'react';
import { motion } from 'framer-motion';

export type Tab = {
  id: string;
  title: string;
  filePath?: string;
  content: string;
  language: string;
  eol: 'lf' | 'crlf';
  dirty: boolean;
};

export default function EditorTabs(props: {
  tabs: Tab[];
  activeTabId?: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const { tabs, activeTabId, onNew, onSelect, onClose } = props;
  return (
    <div className="tabs">
      <div className="tablist">
        {tabs.map(t => (
          <motion.div
            key={t.id}
            className={`tab ${t.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSelect(t.id)}
            title={t.filePath ?? t.title}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
          >
            <span className="title">{t.title}{t.dirty ? '*' : ''}</span>
            <button className="close-btn" onClick={(e) => { e.stopPropagation(); onClose(t.id); }} aria-label="Close Tab">×</button>
          </motion.div>
        ))}
        <button className="new-btn" onClick={onNew} title="New Tab">+</button>
      </div>
    </div>
  );
}

