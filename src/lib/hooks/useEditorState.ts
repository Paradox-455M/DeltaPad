import { useCallback, useMemo, useRef, useState } from 'react';
import { detectLanguage } from '../monaco/language';

type Tab = {
  id: string;
  title: string;
  filePath?: string;
  content: string;
  language: string;
  eol: 'lf' | 'crlf';
  dirty: boolean;
};

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

function computeNextUntitledTitle(existing: string[]): string {
  const used = new Set<number>();
  for (const t of existing) {
    const m = /^(?:[Uu]ntitled)-(\d+)$/.exec(t.trim());
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) used.add(n);
    }
  }
  let i = 1;
  while (used.has(i)) i += 1;
  return `Untitled-${i}`;
}

export default function useEditorState() {
  const [tabs, setTabs] = useState<Tab[]>(() => [{
    id: newId(),
    title: `Untitled-1`,
    content: '',
    language: 'plaintext',
    eol: 'lf',
    dirty: false
  }]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [wrap, setWrapState] = useState<boolean>(true);
  const [confirmClose, setConfirmClose] = useState<{ tabId?: string; title?: string } | null>(null);
  const closeTargetRef = useRef<string | null>(null);

  const activeIdx = useMemo(() => tabs.findIndex(t => t.id === activeTabId), [tabs, activeTabId]);

  const createTab = useCallback(() => {
    const t: Tab = { id: newId(), title: computeNextUntitledTitle(tabs.map(x => x.title)), content: '', language: 'plaintext', eol: 'lf', dirty: false };
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
  }, [tabs]);

  const closeTabRequest = useCallback((id: string) => {
    const t = tabs.find(x => x.id === id);
    if (!t) return;
    if (t.dirty) {
      setConfirmClose({ tabId: id, title: t.title });
      closeTargetRef.current = id;
    } else {
      if (tabs.length === 1) {
        // Reset last tab to a fresh untitled instead of removing
        const nextTitle = computeNextUntitledTitle(tabs.filter(x => x.id !== id).map(x => x.title));
        setTabs(prev => prev.map(x => x.id === id ? { ...x, title: nextTitle, filePath: undefined, content: '', language: 'plaintext', dirty: false } : x));
        setActiveTabId(id);
      } else {
        setTabs(prev => prev.filter(x => x.id !== id));
        if (activeTabId === id && tabs.length > 1) {
          const idx = tabs.findIndex(x => x.id === id);
          const next = tabs[idx - 1] ?? tabs[idx + 1];
          if (next) setActiveTabId(next.id);
        }
      }
    }
  }, [tabs, activeTabId]);

  const applyClose = useCallback(() => {
    const id = closeTargetRef.current;
    if (!id) return;
    if (tabs.length === 1) {
      const nextTitle = computeNextUntitledTitle(tabs.filter(x => x.id !== id).map(x => x.title));
      setTabs(prev => prev.map(x => x.id === id ? { ...x, title: nextTitle, filePath: undefined, content: '', language: 'plaintext', dirty: false } : x));
      setActiveTabId(id);
    } else {
      setTabs(prev => prev.filter(x => x.id !== id));
      if (activeTabId === id && tabs.length > 1) {
        const idx = tabs.findIndex(x => x.id === id);
        const next = tabs[idx - 1] ?? tabs[idx + 1];
        if (next) setActiveTabId(next.id);
      }
    }
    setConfirmClose(null);
    closeTargetRef.current = null;
  }, [activeTabId, tabs]);

  const cancelClose = useCallback(() => {
    setConfirmClose(null);
    closeTargetRef.current = null;
  }, []);

  const updateActiveContent = useCallback((content: string) => {
    setTabs(prev => prev.map((t, i) => i === activeIdx ? { ...t, content, dirty: true } : t));
  }, [activeIdx]);

  const setActiveLanguage = useCallback((language: string) => {
    setTabs(prev => prev.map((t, i) => i === activeIdx ? { ...t, language } : t));
  }, [activeIdx]);

  const saveActive = useCallback(async () => {
    const t = tabs[activeIdx];
    if (!t) return;
    const res = await window.api.saveFile({ filePath: t.filePath, content: t.content, eol: t.eol });
    if (!res.canceled) {
      const filePath = res.filePath ?? t.filePath;
      const title = filePath ? filePath.split(/[\\/]/).pop()! : t.title;
      setTabs(prev => prev.map((tab, i) => i === activeIdx ? { ...tab, dirty: false, filePath, title, language: detectLanguage(filePath) } : tab));
    }
  }, [tabs, activeIdx]);

  const saveActiveAs = useCallback(async () => {
    const t = tabs[activeIdx];
    if (!t) return;
    const res = await window.api.saveFileAs({ content: t.content, eol: t.eol, defaultPath: t.filePath });
    if (!res.canceled && res.filePath) {
      const title = res.filePath.split(/[\\/]/).pop()!;
      setTabs(prev => prev.map((tab, i) => i === activeIdx ? { ...tab, dirty: false, filePath: res.filePath, title, language: detectLanguage(res.filePath) } : tab));
    }
  }, [tabs, activeIdx]);

  const openFileViaDialog = useCallback(async () => {
    const res = await window.api.openFile();
    if (res.canceled || !res.filePath) return;
    const title = res.filePath.split(/[\\/]/).pop()!;
    const language = detectLanguage(res.filePath);
    const t: Tab = { id: newId(), title, filePath: res.filePath, content: res.content ?? '', language, eol: (res.eol as any) ?? 'lf', dirty: false };
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
  }, []);

  const openFileFromPath = useCallback(async (filePath: string) => {
    const res = await window.api.openFile({ path: filePath } as any);
    if (!res || res.canceled || !res.filePath) return;
    const title = res.filePath.split(/[\\/]/).pop()!;
    const language = detectLanguage(res.filePath);
    const t: Tab = { id: newId(), title, filePath: res.filePath, content: res.content ?? '', language, eol: (res.eol as any) ?? 'lf', dirty: false };
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
  }, []);

  const setWrap = useCallback((updater: (w: boolean) => boolean | boolean) => {
    setWrapState(prev => typeof updater === 'function' ? (updater as any)(prev) : Boolean(updater));
  }, []);

  return {
    tabs, activeTabId, setActiveTabId,
    createTab, closeTabRequest, confirmClose, applyClose, cancelClose,
    updateActiveContent, setActiveLanguage, saveActive, saveActiveAs, openFileViaDialog, openFileFromPath,
    wrap, setWrap
  };
}

