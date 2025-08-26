import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildAppMenu } from './menu.js';
import { SettingsStore } from './store.js';
import { DialogOpenParams, FileOpenParams, FileSaveAsParams, FileSaveParams, SettingsGetParams, SettingsSetParams } from './ipc/schema.js';

let win: BrowserWindow | null = null;

// Ensure proper app name in macOS menu bar and titlebar
app.setName('DeltaPad');
app.setAboutPanelOptions?.({ applicationName: 'DeltaPad' });

function detectEol(text: string): 'lf' | 'crlf' {
  return text.includes('\r\n') ? 'crlf' : 'lf';
}

async function saveToNewPath(content: string, eol: 'lf' | 'crlf', defaultPath?: string) {
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: defaultPath ?? path.join(os.homedir(), 'untitled.txt')
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const normalized = eol === 'crlf' ? content.replace(/\r?\n/g, '\r\n') : content.replace(/\r?\n/g, '\n');
  await fs.writeFile(result.filePath, normalized, { encoding: 'utf-8' });
  SettingsStore.pushRecent(result.filePath);
  buildAppMenu(win!);
  return { canceled: false, filePath: result.filePath };
}

async function createWindow() {
  const bounds = SettingsStore.get('windowBounds');
  win = new BrowserWindow({
    width: bounds?.width ?? 1200,
    height: bounds?.height ?? 800,
    x: bounds?.x,
    y: bounds?.y,
    show: true,
    title: 'DeltaPad',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL!);
  } else {
    await win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  buildAppMenu(win);
  win.webContents.on('did-finish-load', () => {
    if (!win?.isVisible()) win?.show();
  });
  win.webContents.on('did-fail-load', (_e, ec, desc, url) => {
    console.error('Renderer failed to load', ec, desc, url);
    if (!win?.isVisible()) win?.show();
  });
  win.on('close', () => {
    if (!win) return;
    const bounds = win.getBounds();
    SettingsStore.set('windowBounds', bounds as any);
  });
}

app.whenReady().then(async () => {
  await createWindow();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* IPC handlers (validated) */
ipcMain.handle('file:open', async (_e, raw) => {
  const params = FileOpenParams.safeParse(raw);
  if (!params.success) {
    dialog.showErrorBox('Invalid Request', 'Bad parameters for file:open');
    return { canceled: true };
  }

  let filePath = params.data.path;
  if (!filePath) {
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    filePath = result.filePaths[0];
  }
  try {
    const content = await fs.readFile(filePath!, { encoding: 'utf-8' });
    const eol = detectEol(content);
    SettingsStore.pushRecent(filePath!);
    buildAppMenu(win!);
    return { canceled: false, filePath, content, eol };
  } catch (err: any) {
    dialog.showErrorBox('Open Error', err?.message ?? String(err));
    return { canceled: true, error: err?.message ?? String(err) };
  }
});

ipcMain.handle('file:save', async (_e, raw) => {
  const parsed = FileSaveParams.safeParse(raw);
  if (!parsed.success) {
    dialog.showErrorBox('Invalid Request', 'Bad parameters for file:save');
    return { canceled: true };
  }
  const { filePath, content, eol } = parsed.data;
  try {
    if (!filePath) {
      return await saveToNewPath(content, eol);
    }
    const normalized = eol === 'crlf' ? content.replace(/\r?\n/g, '\r\n') : content.replace(/\r?\n/g, '\n');
    await fs.writeFile(filePath, normalized, { encoding: 'utf-8' });
    SettingsStore.pushRecent(filePath);
    buildAppMenu(win!);
    return { canceled: false, filePath };
  } catch (err: any) {
    dialog.showErrorBox('Save Error', err?.message ?? String(err));
    return { canceled: true, error: err?.message ?? String(err) };
  }
});

ipcMain.handle('file:saveAs', async (_e, raw) => {
  const parsed = FileSaveAsParams.safeParse(raw);
  if (!parsed.success) {
    dialog.showErrorBox('Invalid Request', 'Bad parameters for file:saveAs');
    return { canceled: true };
  }
  const { content, eol, defaultPath } = parsed.data;
  try {
    return await saveToNewPath(content, eol, defaultPath);
  } catch (err: any) {
    dialog.showErrorBox('Save Error', err?.message ?? String(err));
    return { canceled: true, error: err?.message ?? String(err) };
  }
});

ipcMain.handle('dialog:open', async (_e, raw) => {
  const parsed = DialogOpenParams.safeParse(raw ?? {});
  if (!parsed.success) {
    dialog.showErrorBox('Invalid Request', 'Bad parameters for dialog:open');
    return { canceled: true };
  }
  const res = await dialog.showOpenDialog(win!, {
    properties: parsed.data.properties,
    filters: parsed.data.filters
  });
  return res;
});

ipcMain.handle('app:getRecent', async () => {
  return SettingsStore.get('recentFiles');
});
ipcMain.handle('app:clearRecent', async () => {
  SettingsStore.clearRecent();
  buildAppMenu(win!);
  return true;
});

ipcMain.handle('settings:get', async (_e, raw) => {
  const parsed = SettingsGetParams.safeParse(raw);
  if (!parsed.success) return null;
  return SettingsStore.get(parsed.data.key as any);
});
ipcMain.handle('settings:set', async (_e, raw) => {
  const parsed = SettingsSetParams.safeParse(raw);
  if (!parsed.success) return false;
  const { key, value } = parsed.data as any;
  SettingsStore.set(key, value);
  if (key === 'theme') {
    nativeTheme.themeSource = value;
  }
  return true;
});

