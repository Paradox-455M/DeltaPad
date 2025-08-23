import React from 'react';
import { FiFilePlus, FiFolder, FiSave, FiSearch, FiHash } from 'react-icons/fi';
import { MdSaveAlt, MdWrapText } from 'react-icons/md';
import { TbArrowsDiff } from 'react-icons/tb';
import { VscJson } from 'react-icons/vsc';
import EditorTabs, { Tab } from './EditorTabs';

export default function TopBar(props: {
  tabs: Tab[];
  activeTabId?: string;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onFind: () => void;
  onGoto: () => void;
  onToggleWrap: () => void;
  onToggleDiff: () => void;
  onToggleJson: () => void;
  jsonPathActive?: boolean;
}) {
  const { tabs, activeTabId, onNew, onOpen, onSave, onSaveAs, onSelectTab, onCloseTab, onFind, onGoto, onToggleWrap, onToggleDiff, onToggleJson, jsonPathActive } = props;
  return (
    <div className="titlebar">
      <div className="title-left">
        <div className="appname">DeltaPad</div>
        <div className="toolbar">
          <button title="New" onClick={onNew}><FiFilePlus/></button>
          <button title="Open" onClick={onOpen}><FiFolder/></button>
          <button title="Save" onClick={onSave}><FiSave/></button>
          <button title="Save As" onClick={onSaveAs}><MdSaveAlt/></button>
          <div className="sep"/>
          <button title="Find" onClick={onFind}><FiSearch/></button>
          <button title="Go to Line" onClick={onGoto}><FiHash/></button>
          <button title="Word Wrap" onClick={onToggleWrap}><MdWrapText/></button>
          <button title="Diff View" onClick={onToggleDiff}><TbArrowsDiff/></button>
          <button title="JSON Path Search" className={jsonPathActive ? 'active' : ''} onClick={onToggleJson}><VscJson/></button>
        </div>
      </div>
      <div className="tabswrap">
        <EditorTabs tabs={tabs} activeTabId={activeTabId} onNew={onNew} onSelect={onSelectTab} onClose={onCloseTab} />
      </div>
      <div className="title-right"/>
    </div>
  );
}


