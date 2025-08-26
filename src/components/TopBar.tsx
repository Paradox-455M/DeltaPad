import React from 'react';
import { motion } from 'framer-motion';
import { FiFilePlus, FiFolder, FiSave, FiSearch, FiHash } from 'react-icons/fi';
import { MdSaveAlt, MdWrapText } from 'react-icons/md';
import { TbArrowsDiff } from 'react-icons/tb';
import { VscJson } from 'react-icons/vsc';
import EditorTabs, { Tab } from './EditorTabs';
import appIcon from '../assets/logoDeltaPad.png';

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
  diffActive?: boolean;
}) {
  const { tabs, activeTabId, onNew, onOpen, onSave, onSaveAs, onSelectTab, onCloseTab, onFind, onGoto, onToggleWrap, onToggleDiff, onToggleJson, jsonPathActive, diffActive } = props;
  return (
    <motion.div className="titlebar" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
      <div className="title-left" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={appIcon} alt="DeltaPad" width={22} height={22} style={{ borderRadius: 6 }} />
          <span className="brand-title">DeltaPad</span>
        </div>
        <div className="toolbar">
          <button title="New" onClick={onNew}><FiFilePlus/></button>
          <button title="Open" onClick={onOpen}><FiFolder/></button>
          <button title="Save" onClick={onSave}><FiSave/></button>
          <button title="Save As" onClick={onSaveAs}><MdSaveAlt/></button>
          <div className="sep"/>
          {/* <button title="Find" onClick={onFind}><FiSearch/></button>
          <button title="Go to Line" onClick={onGoto}><FiHash/></button>
          <button title="Word Wrap" onClick={onToggleWrap}><MdWrapText/></button> */}
          <button title="Diff View" onClick={onToggleDiff} className={diffActive ? 'active' : ''}><TbArrowsDiff/></button>
          <button title="JSON Path Search" className={jsonPathActive ? 'active' : ''} onClick={onToggleJson}><VscJson/></button>
        </div>
      </div>
      <div className="tabswrap" style={{ width: '100%' }}>
        <EditorTabs tabs={tabs} activeTabId={activeTabId} onNew={onNew} onSelect={onSelectTab} onClose={onCloseTab} />
      </div>
      <div className="title-right"/>
    </motion.div>
  );
}


