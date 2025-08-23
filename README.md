# DeltaPad

A fast, cross-platform code/text editor with Monaco, side-by-side diff, and JSON dot-path search.

## Scripts
- Dev: `npm i`, then `npm run dev`
- Build: `npm run build`
- Package: `npm run package` (outputs to `release/`)

## Features
- Tabs with dirty markers, Notepad++-style editor (Monaco), status bar
- Find/Replace (Ctrl/Cmd+F, Ctrl/Cmd+H)
- JSON dot-path search panel (click to jump)
- Diff viewer (Monaco DiffEditor)
- Native file dialogs; recent files; EOL detection; UTF-8 encoding
- Light/Dark/System theme
- Secure IPC via preload with zod validation

## Icons
Put a 1024x1024 PNG at `electron/assets/icon.png`. Optionally run `./scripts/build-icons.sh` to generate a 256px PNG for Linux/Windows.

## License
MIT

