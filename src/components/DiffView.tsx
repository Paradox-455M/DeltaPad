import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { Tab } from './EditorTabs';

export default function DiffView(props: {
  tabs: Tab[];
  leftId?: string;
  rightId?: string;
  onSelect: (leftId?: string, rightId?: string) => void;
  onClose: () => void;
}) {
  const { tabs, leftId, rightId, onSelect, onClose } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const [leftLang, setLeftLang] = useState<string>('plaintext');
  const [rightLang, setRightLang] = useState<string>('plaintext');

  const left = tabs.find(t => t.id === leftId) ?? tabs[0];
  const right = tabs.find(t => t.id === rightId) ?? tabs[1];

  const languages = useMemo(() => ([
    'plaintext', 'json', 'javascript', 'typescript', 'html', 'css', 'scss', 'less', 'markdown',
    'yaml', 'xml', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'shell',
    'sql'
  ]), []);

  useEffect(() => {
    if (!ref.current) return;
    
    // Ensure container has explicit dimensions
    if (ref.current.parentElement) {
      ref.current.parentElement.style.width = '100%';
      ref.current.parentElement.style.height = '100%';
    }
    ref.current.style.width = '100%';
    ref.current.style.height = '100%';
    
    monaco.editor.setTheme('vs-dark');
    const e = monaco.editor.createDiffEditor(ref.current, {
      renderSideBySide: true,
      automaticLayout: true,
      readOnly: false,
      originalEditable: true,
      enableSplitViewResizing: true,
      minimap: { enabled: false }
    });
    
    // Force layout after creation
    setTimeout(() => {
      if (e) e.layout();
    }, 50);
    
    editorRef.current = e;
    return () => { e.dispose(); };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    if (!left || !right) return;
    
    const original = monaco.editor.createModel(left.content || '', leftLang || left.language || 'plaintext');
    const modified = monaco.editor.createModel(right.content || '', rightLang || right.language || 'plaintext');
    
    editorRef.current.setModel({ original, modified });
    
    const orig = editorRef.current.getOriginalEditor();
    const mod = editorRef.current.getModifiedEditor();
    
    // Make both sides editable
    orig.updateOptions({ readOnly: false });
    mod.updateOptions({ readOnly: false });
    
    // Force layout again after model change
    setTimeout(() => {
      if (editorRef.current) editorRef.current.layout();
      mod.focus(); // Focus modified editor to ensure paste works
    }, 50);
    
    return () => {
      original.dispose();
      modified.dispose();
    };
  }, [left?.id, right?.id, leftLang, rightLang, left?.content, right?.content]);

  return (
    <div className="diff-view">
      <div className="diff-toolbar">
        <div className="lane">
          <label style={{ marginRight: 6, opacity: 0.7 }}>Left</label>
          <select value={leftLang} onChange={e => setLeftLang(e.target.value)}>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="lane">
          <label style={{ marginRight: 6, opacity: 0.7 }}>Right</label>
          <select value={rightLang} onChange={e => setRightLang(e.target.value)}>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="spacer" />
        <button className="close" title="Close Diff" onClick={onClose}>×</button>
      </div>
      <div className="diff-editor" style={{ height: '100%', width: '100%', position: 'relative', display: 'flex' }}>
        <div ref={ref} style={{ position: 'absolute', inset: 0, flex: '1 1 auto', minWidth: '100%', minHeight: '100%' }} />
      </div>
    </div>
  );
}

