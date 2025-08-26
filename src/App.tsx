import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import TopBar from './components/TopBar';
import CodeEditor from './components/CodeEditor';
import DiffView from './components/DiffView';
import JsonPathPanel from './components/JsonPathPanel';
import StatusBar from './components/StatusBar';
import ConfirmCloseDialog from './components/ConfirmCloseDialog';
import useEditorState from './lib/hooks/useEditorState';
import useSettings from './lib/hooks/useSettings';

export default function App() {
  // simple visual to ensure renderer mounted even before Monaco
  const {
    tabs, activeTabId, setActiveTabId, createTab, closeTabRequest, confirmClose, cancelClose,
    applyClose, updateActiveContent, setActiveLanguage, saveActive, saveActiveAs, openFileFromPath, openFileViaDialog,
    setWrap, wrap
  } = useEditorState();

  const { theme, setTheme } = useSettings();

  const [showDiff, setShowDiff] = useState(false);
  const [diffIds, setDiffIds] = useState<{ leftId?: string; rightId?: string }>({});
  const [showJsonPath, setShowJsonPath] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(360);

  // Use a ref to keep latest handlers but register the IPC listener only once
  const handlersRef = useRef({
    createTab,
    openFileViaDialog,
    openFileFromPath,
    saveActive,
    saveActiveAs,
    setTheme,
    setWrap,
    setShowJsonPath,
    setShowDiff
  });
  useEffect(() => {
    handlersRef.current = { createTab, openFileViaDialog, openFileFromPath, saveActive, saveActiveAs, setTheme, setWrap, setShowJsonPath, setShowDiff };
  }, [createTab, openFileViaDialog, openFileFromPath, saveActive, saveActiveAs, setTheme, setWrap, setShowJsonPath, setShowDiff]);

  useEffect(() => {
    window.api.onMenuAction(({ action, payload }) => {
      const h = handlersRef.current;
      switch (action) {
        case 'file:new': h.createTab(); break;
        case 'file:open': h.openFileViaDialog(); break;
        case 'file:openPath': h.openFileFromPath(String(payload)); break;
        case 'file:save': h.saveActive(); break;
        case 'file:saveAs': h.saveActiveAs(); break;
        case 'app:clearRecent': window.api.clearRecent(); break;
        case 'edit:find': document.dispatchEvent(new CustomEvent('editor:find')); break;
        case 'edit:replace': document.dispatchEvent(new CustomEvent('editor:replace')); break;
        case 'edit:gotoLine': document.dispatchEvent(new CustomEvent('editor:gotoLine')); break;
        case 'view:toggleWordWrap': h.setWrap(w => !w); break;
        case 'tools:jsonpath': h.setShowJsonPath(v => !v); break;
        case 'tools:compare': h.setShowDiff(true); break;
        case 'theme:set': h.setTheme(payload); break;
      }
    });
  }, []);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  return (
    <div className="app" data-theme={theme}>
      <TopBar
        tabs={tabs}
        activeTabId={activeTabId}
        onNew={createTab}
        onOpen={openFileViaDialog}
        onSave={saveActive}
        onSaveAs={saveActiveAs}
        onSelectTab={setActiveTabId}
        onCloseTab={closeTabRequest}
        onFind={() => setShowFind(true)}
        onGoto={() => document.dispatchEvent(new CustomEvent('editor:gotoLine'))}
        onToggleWrap={() => setWrap(w => !w)}
        onToggleDiff={() => setShowDiff(s => !s)}
        onToggleJson={() => setShowJsonPath(v => {
          // Quick checks: ensure width and z-index sane when opening
          if (!v) return true;
          setRightPanelWidth(w => Math.max(300, w || 360));
          return !showJsonPath;
        })}
        jsonPathActive={showJsonPath}
        diffActive={showDiff}
      />

      <div
        className={`content ${showJsonPath ? 'with-right-panel' : ''} ${showFind ? 'with-left-panel' : ''}`}
        style={{ ['--right-panel-width' as any]: `${rightPanelWidth}px` }}
      >
        {showDiff ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ flex: 1, display: 'flex' }}>
            <DiffView
              tabs={tabs}
              leftId={diffIds.leftId}
              rightId={diffIds.rightId}
              onClose={() => setShowDiff(false)}
              onSelect={(leftId, rightId) => setDiffIds({ leftId, rightId })}
            />
          </motion.div>
        ) : (
          activeTab && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }} style={{ flex: 1, display: 'flex' }}>
              <div className="editor-glass" style={{ width: '100%' }}>
                <CodeEditor
                  key={activeTab.id}
                  tab={activeTab}
                  wordWrap={wrap}
                  onContentChange={updateActiveContent}
                  onLanguageChange={setActiveLanguage}
                  onSave={() => saveActive()}
                />
              </div>
            </motion.div>
          )
        )}
        {showJsonPath && activeTab && (
          <JsonPathPanel
            content={activeTab.content}
            onJump={sel => document.dispatchEvent(new CustomEvent('editor:reveal', { detail: sel }))}
            onClose={() => setShowJsonPath(false)}
            width={rightPanelWidth}
            onResize={setRightPanelWidth}
          />
        )}
      </div>

      <StatusBar activeTab={activeTab} wrap={wrap} />
      <ConfirmCloseDialog confirm={confirmClose} onConfirm={applyClose} onCancel={cancelClose} />
    </div>
  );
}

