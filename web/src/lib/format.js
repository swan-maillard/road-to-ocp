// Lightweight Java snippet formatter used only for display. It leaves short
// lines and empty `{}` blocks compact, never splits two statements that share a
// line, and only expands a `{ ... }` block onto its own lines when the collapsed
// one-line version would be wider than MAX_WIDTH. String/char literals, text
// blocks and comments are preserved verbatim.

const MAX_WIDTH = 72;
const INDENT = '    ';

function tokenize(src) {
  const tokens = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
      let j = i + 1;
      while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\r' || src[j] === '\n')) j++;
      tokens.push({ t: 'ws', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      let j = i + 2;
      while (j < n && src[j] !== '\n') j++;
      tokens.push({ t: 'lit', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      tokens.push({ t: 'lit', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '"' && src[i + 1] === '"' && src[i + 2] === '"') {
      let j = i + 3;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '"' && src[j + 1] === '"' && src[j + 2] === '"') { j += 3; break; }
        j++;
      }
      tokens.push({ t: 'lit', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '"' || src[j] === '\n') { j++; break; }
        j++;
      }
      tokens.push({ t: 'lit', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === "'" || src[j] === '\n') { j++; break; }
        j++;
      }
      tokens.push({ t: 'lit', v: src.slice(i, j) });
      i = j;
      continue;
    }
    tokens.push({ t: c === '{' || c === '}' ? 'brace' : 'p', v: c });
    i++;
  }
  return tokens;
}

function matchBraces(tokens) {
  const match = {};
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].t !== 'brace') continue;
    if (tokens[i].v === '{') stack.push(i);
    else if (stack.length) { const o = stack.pop(); match[o] = i; match[i] = o; }
  }
  return match;
}

const advanceCol = (col, text) => { const nl = text.lastIndexOf('\n'); return nl === -1 ? col + text.length : text.length - nl - 1; };

function fmt(tokens, match, from, to, indent, startCol, maxWidth) {
  let out = '';
  let col = startCol;
  let depth = indent;
  let k = from;
  while (k < to) {
    const token = tokens[k];
    if (token.t === 'ws') { out += token.v; col = advanceCol(col, token.v); k++; continue; }
    if (token.t === 'brace' && token.v === '{' && match[k] != null && match[k] < to) {
      const j = match[k];
      let a = k + 1;
      let b = j;
      while (a < b && tokens[a].t === 'ws') a++;
      while (b > a && tokens[b - 1].t === 'ws') b--;
      if (a >= b) {
        out += '{'; col++;
        for (let x = k + 1; x < j; x++) { out += tokens[x].v; col = advanceCol(col, tokens[x].v); }
        out += '}'; col++;
        k = j + 1;
        continue;
      }
      let prev = k - 1;
      while (prev >= from && tokens[prev].t === 'ws') prev--;
      const arrayInit = prev >= from && (tokens[prev].v === ']' || tokens[prev].v === '=');
      let spansLines = false;
      let len = 0;
      for (let x = a; x < b; x++) {
        if (tokens[x].v.includes('\n')) spansLines = true;
        len += tokens[x].t === 'ws' ? 1 : tokens[x].v.length;
      }
      if (!arrayInit && !spansLines && col + 1 + len + 1 > maxWidth) {
        out += '{';
        out += '\n' + INDENT.repeat(depth + 1);
        out += fmt(tokens, match, a, b, depth + 1, (depth + 1) * INDENT.length, maxWidth);
        out += '\n' + INDENT.repeat(depth) + '}';
        col = depth * INDENT.length + 1;
        k = j + 1;
        continue;
      }
      out += '{'; col++; depth++; k++; continue;
    }
    if (token.t === 'brace' && token.v === '}' && match[k] != null && match[k] >= from) depth--;
    out += token.v; col = advanceCol(col, token.v); k++;
  }
  return out;
}

export function formatJava(code, maxWidth = MAX_WIDTH) {
  if (!code) return code || '';
  const tokens = tokenize(code);
  return fmt(tokens, matchBraces(tokens), 0, tokens.length, 0, 0, maxWidth);
}
