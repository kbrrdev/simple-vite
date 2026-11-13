/** The text after an edit, and the part to select so that the writer can carry on. */
export interface Edit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Wraps the selection in `marker`, such as ** for bold. With nothing selected, it inserts a
 * placeholder and selects it, ready to be typed over.
 */
export function wrap(
  text: string,
  start: number,
  end: number,
  marker: string,
  placeholder: string,
): Edit {
  const inner = text.slice(start, end) || placeholder;
  const before = text.slice(0, start) + marker;
  return {
    text: before + inner + marker + text.slice(end),
    selectionStart: before.length,
    selectionEnd: before.length + inner.length,
  };
}

/** Turns the selection into a link and selects the address, ready for a paste. */
export function link(text: string, start: number, end: number): Edit {
  const label = text.slice(start, end) || 'link text';
  const url = 'https://';
  const before = `${text.slice(0, start)}[${label}](`;
  return {
    text: `${before}${url})${text.slice(end)}`,
    selectionStart: before.length,
    selectionEnd: before.length + url.length,
  };
}

/**
 * Puts an image on its own paragraph at the selection, replacing any selected text, with the
 * cursor after it. Brackets are dropped from the alt text, as they would end the Markdown early.
 */
export function insertImage(
  text: string,
  start: number,
  end: number,
  alt: string,
  url: string,
): Edit {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const image = `![${alt.replace(/[[\]]/g, '')}](${url})`;
  const gap = (side: string, edge: 'start' | 'end') => {
    if (side === '') return '';
    const blank = edge === 'end' ? side.endsWith('\n\n') : side.startsWith('\n\n');
    const single = edge === 'end' ? side.endsWith('\n') : side.startsWith('\n');
    return blank ? '' : single ? '\n' : '\n\n';
  };
  const head = before + gap(before, 'end') + image + gap(after, 'start');
  return { text: head + after, selectionStart: head.length, selectionEnd: head.length };
}

/**
 * Starts each selected line with `prefix`, such as "## " or "- ". With `numbered`, the lines
 * are counted 1., 2., 3. instead. With nothing selected, it applies to the current line.
 */
export function prefixLines(
  text: string,
  start: number,
  end: number,
  prefix: string,
  numbered = false,
): Edit {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;

  const lines = text
    .slice(lineStart, lineEnd)
    .split('\n')
    .map((line, index) => `${numbered ? `${index + 1}. ` : prefix}${line}`);
  const block = lines.join('\n');

  return {
    text: text.slice(0, lineStart) + block + text.slice(lineEnd),
    selectionStart: lineStart + block.length,
    selectionEnd: lineStart + block.length,
  };
}
