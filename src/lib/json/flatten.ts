export type Options = { max?: number; batchSize?: number };
export type Entry = { path: string; value: unknown; start: number; end: number };
type Entries = { items: Entry[]; truncated: boolean };

// Flatten JSON and capture exact character offsets for primitive values.
// Offsets are [start, end) in the original text.
export function flattenJson(text: string, dotPathFilter?: string, options?: Options): { entries: Entries } {
  const max = options?.max ?? 5000;

  // Validate JSON first to mirror previous error behavior
  try {
    JSON.parse(text);
  } catch {
    throw new Error('Not valid JSON. Open a JSON file to use this panel.');
  }

  const items: Entry[] = [];
  let truncated = false;

  const push = (path: string, value: unknown, start: number, end: number) => {
    if (dotPathFilter && !path.includes(dotPathFilter)) return;
    if (items.length < max) items.push({ path, value, start, end });
    else truncated = true;
  };

  const len = text.length;
  let i = 0;

  const isWs = (ch: number) => ch === 0x20 || ch === 0x0a || ch === 0x0d || ch === 0x09;
  const peek = () => text.charCodeAt(i);
  const curr = () => text[i];
  const eof = () => i >= len;
  const skipWs = () => { while (!eof() && isWs(peek())) i++; };

  function parseString(): { value: string; start: number; end: number } {
    const quote = text[i];
    if (quote !== '"') throw new Error('Invalid JSON string');
    const start = i;
    i++; // skip opening quote
    let result = '';
    while (!eof()) {
      const ch = text[i];
      if (ch === '"') { i++; return { value: result, start, end: i }; }
      if (ch === '\\') {
        i++;
        if (eof()) throw new Error('Invalid escape');
        const e = text[i++];
        switch (e) {
          case '"': result += '"'; break;
          case '\\': result += '\\'; break;
          case '/': result += '/'; break;
          case 'b': result += '\b'; break;
          case 'f': result += '\f'; break;
          case 'n': result += '\n'; break;
          case 'r': result += '\r'; break;
          case 't': result += '\t'; break;
          case 'u': {
            const h = text.slice(i, i + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(h)) throw new Error('Invalid unicode escape');
            result += String.fromCharCode(parseInt(h, 16));
            i += 4;
            break;
          }
          default:
            throw new Error('Invalid escape');
        }
      } else {
        result += ch;
        i++;
      }
    }
    throw new Error('Unterminated string');
  }

  function parseNumber(): { value: number; start: number; end: number } {
    const start = i;
    if (curr() === '-') i++;
    if (curr() === '0') {
      i++;
    } else {
      if (curr() < '0' || curr() > '9') throw new Error('Invalid number');
      while (!eof() && curr() >= '0' && curr() <= '9') i++;
    }
    if (curr() === '.') {
      i++;
      if (curr() < '0' || curr() > '9') throw new Error('Invalid number');
      while (!eof() && curr() >= '0' && curr() <= '9') i++;
    }
    if (curr() === 'e' || curr() === 'E') {
      i++;
      if (curr() === '+' || curr() === '-') i++;
      if (curr() < '0' || curr() > '9') throw new Error('Invalid number');
      while (!eof() && curr() >= '0' && curr() <= '9') i++;
    }
    const end = i;
    const raw = text.slice(start, end);
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error('Invalid number');
    return { value, start, end };
  }

  function expectWord(word: string) {
    if (text.slice(i, i + word.length) !== word) throw new Error('Invalid token');
    i += word.length;
  }

  function parseValue(path: string): void {
    skipWs();
    if (eof()) throw new Error('Unexpected end of input');
    const ch = curr();
    if (ch === '"') {
      const s = parseString();
      push(path || '$', s.value, s.start, s.end);
      return;
    }
    if (ch === '{') { parseObject(path); return; }
    if (ch === '[') { parseArray(path); return; }
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const n = parseNumber();
      push(path || '$', n.value, n.start, n.end);
      return;
    }
    if (text.startsWith('true', i)) {
      const start = i; expectWord('true'); const end = i; push(path || '$', true, start, end); return;
    }
    if (text.startsWith('false', i)) {
      const start = i; expectWord('false'); const end = i; push(path || '$', false, start, end); return;
    }
    if (text.startsWith('null', i)) {
      const start = i; expectWord('null'); const end = i; push(path || '$', null, start, end); return;
    }
    throw new Error('Invalid value');
  }

  function parseObject(path: string): void {
    if (curr() !== '{') throw new Error('Expected {');
    i++; // skip {
    skipWs();
    if (curr() === '}') { i++; return; }
    while (true) {
      skipWs();
      const keyTok = parseString();
      const key = keyTok.value;
      skipWs();
      if (curr() !== ':') throw new Error('Expected :');
      i++;
      const nextPath = path ? `${path}.${key}` : key;
      parseValue(nextPath);
      skipWs();
      const c = curr();
      if (c === ',') { i++; continue; }
      if (c === '}') { i++; break; }
      throw new Error('Expected , or }');
    }
  }

  function parseArray(path: string): void {
    if (curr() !== '[') throw new Error('Expected [');
    i++; // skip [
    skipWs();
    if (curr() === ']') { i++; return; }
    let idx = 0;
    while (true) {
      const nextPath = path ? `${path}[${idx}]` : `[${idx}]`;
      parseValue(nextPath);
      idx++;
      skipWs();
      const c = curr();
      if (c === ',') { i++; continue; }
      if (c === ']') { i++; break; }
      throw new Error('Expected , or ]');
    }
  }

  skipWs();
  if (eof()) return { entries: { items, truncated } };
  const ch = curr();
  if (ch === '{') parseObject('');
  else if (ch === '[') parseArray('');
  else parseValue('');
  skipWs();
  // ignore trailing whitespace but error on non-ws
  if (!eof()) {
    while (!eof() && isWs(peek())) i++;
    if (!eof()) throw new Error('Not valid JSON. Open a JSON file to use this panel.');
  }

  return { entries: { items, truncated } };
}

