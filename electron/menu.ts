import { BrowserWindow, Menu, MenuItemConstructorOptions, app, nativeTheme, shell } from 'electron';
import { SettingsStore } from './store.js';

export function buildAppMenu(win: BrowserWindow) {
  const isMac = process.platform === 'darwin';
  const theme = SettingsStore.get('theme') ?? 'system';

  const send = (action: string, payload?: any) => {
    win.webContents.send('menu:action', { action, payload });
  };

  const recent = SettingsStore.get('recentFiles');

  const appSubmenu: MenuItemConstructorOptions[] = [
    { role: 'about' },
    { type: 'separator' },
    { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: () => send('preferences') },
    { type: 'separator' },
    { role: 'services' },
    { type: 'separator' },
    { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
    { type: 'separator' },
    { role: 'quit' }
  ];

  const editSubmenu: MenuItemConstructorOptions[] = [
    { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
    { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
    ...(isMac
      ? ([{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }] as MenuItemConstructorOptions[])
      : ([{ role: 'delete' }, { role: 'selectAll' }] as MenuItemConstructorOptions[])),
    { type: 'separator' },
    { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => send('edit:find') },
    { label: 'Replace', accelerator: 'CmdOrCtrl+H', click: () => send('edit:replace') },
    { label: 'Go to Line', accelerator: 'CmdOrCtrl+G', click: () => send('edit:gotoLine') }
  ];

  const viewSubmenu: MenuItemConstructorOptions[] = [
    { role: 'toggleDevTools' },
    { type: 'separator' },
    { label: 'Toggle Word Wrap', accelerator: 'Alt+Z', click: () => send('view:toggleWordWrap') },
    { type: 'separator' },
    { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
    { type: 'separator' },
    {
      label: 'Theme',
      submenu: [
        { label: 'System', type: 'radio', checked: theme === 'system', click: () => send('theme:set', 'system') },
        { label: 'Light', type: 'radio', checked: theme === 'light', click: () => send('theme:set', 'light') },
        { label: 'Dark', type: 'radio', checked: theme === 'dark', click: () => send('theme:set', 'dark') }
      ] as MenuItemConstructorOptions[]
    }
  ];

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ label: 'DeltaPad', submenu: appSubmenu }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => send('file:new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => send('file:open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('file:save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('file:saveAs') },
        { type: 'separator' },
        {
          label: 'Open Recent',
          submenu: ([
            ...recent.map(p => ({ label: p, click: () => send('file:openPath', p) })),
            { type: 'separator' },
            { label: 'Clear Recent', click: () => send('app:clearRecent') }
          ] as MenuItemConstructorOptions[])
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: 'Edit',
      submenu: editSubmenu
    },
    {
      label: 'View',
      submenu: viewSubmenu
    },
    {
      label: 'Tools',
      submenu: ([
        { label: 'JSON Path Search', accelerator: 'CmdOrCtrl+J', click: () => send('tools:jsonpath') },
        { label: 'Compare With…', click: () => send('tools:compare') }
      ] as MenuItemConstructorOptions[])
    },
    {
      label: 'Help',
      submenu: ([
        { label: 'DeltaPad Website', click: () => shell.openExternal('https://example.com') },
        { role: 'about' }
      ] as MenuItemConstructorOptions[])
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  const themeSource = SettingsStore.get('theme');
  nativeTheme.themeSource = themeSource;
}

