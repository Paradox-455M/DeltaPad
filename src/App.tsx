import React, { useEffect, useMemo, useState } from 'react';
import TopBar from './components/TopBar';
import CodeEditor from './components/CodeEditor';
import DiffView from './components/DiffView';
import JsonPathPanel from './components/JsonPathPanel';
import FindReplace from './components/FindReplace';
import StatusBar from './components/StatusBar';
import ConfirmCloseDialog from './components/ConfirmCloseDialog';
import useEditorState from './lib/hooks/useEditorState';
import useSettings from './lib/hooks/useSettings';

export default function App() {
  // simple visual to ensure renderer mounted even before Monaco
  const {
    tabs, activeTabId, setActiveTabId, createTab, closeTabRequest, confirmClose, cancelClose,
    applyClose, updateActiveContent, saveActive, saveActiveAs, openFileFromPath, openFileViaDialog,
    setWrap, wrap
  } = useEditorState();

  const { theme, setTheme } = useSettings();

  const [showDiff, setShowDiff] = useState(false);
  const [diffIds, setDiffIds] = useState<{ leftId?: string; rightId?: string }>({});
  const [showJsonPath, setShowJsonPath] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(360);

  useEffect(() => {
    window.api.onMenuAction(({ action, payload }) => {
      switch (action) {
        case 'file:new': createTab(); break;
        case 'file:open': openFileViaDialog(); break;
        case 'file:openPath': openFileFromPath(String(payload)); break;
        case 'file:save': saveActive(); break;
        case 'file:saveAs': saveActiveAs(); break;
        case 'app:clearRecent': window.api.clearRecent(); break;
        case 'edit:find': setShowFind(true); break;
        case 'edit:replace': setShowFind(true); break;
        case 'edit:gotoLine': document.dispatchEvent(new CustomEvent('editor:gotoLine')); break;
        case 'view:toggleWordWrap': setWrap(w => !w); break;
        case 'tools:jsonpath': setShowJsonPath(v => !v); break;
        case 'tools:compare': setShowDiff(true); break;
        case 'theme:set': setTheme(payload); break;
      }
    });
  }, [createTab, openFileViaDialog, openFileFromPath, saveActive, saveActiveAs, setTheme, setWrap]);

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
      />

      <div
        className={`content ${showJsonPath ? 'with-right-panel' : ''} ${showFind ? 'with-left-panel' : ''}`}
        style={{ ['--right-panel-width' as any]: `${rightPanelWidth}px` }}
      >
        {showDiff ? (
          <DiffView
            tabs={tabs}
            leftId={diffIds.leftId}
            rightId={diffIds.rightId}
            onClose={() => setShowDiff(false)}
            onSelect={(leftId, rightId) => setDiffIds({ leftId, rightId })}
          />
        ) : (
          activeTab && (
            <CodeEditor
              key={activeTab.id}
              tab={activeTab}
              wordWrap={wrap}
              onContentChange={updateActiveContent}
              onSave={() => saveActive()}
            />
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
        {showFind && activeTab && (
          <FindReplace onClose={() => setShowFind(false)} />
        )}
      </div>

      <StatusBar activeTab={activeTab} wrap={wrap} />
      <ConfirmCloseDialog confirm={confirmClose} onConfirm={applyClose} onCancel={cancelClose} />
    </div>
  );
}

