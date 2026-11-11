import { link, prefixLines, wrap } from './markdown-edit';

describe('wrap', () => {
  it('wraps the selection and keeps it selected', () => {
    const edit = wrap('Get free shipping now', 4, 17, '**', 'bold text');

    expect(edit.text).toBe('Get **free shipping** now');
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('free shipping');
  });

  it('inserts a placeholder at the cursor, selected to type over', () => {
    const edit = wrap('Hi ', 3, 3, '*', 'italic text');

    expect(edit.text).toBe('Hi *italic text*');
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('italic text');
  });
});

describe('link', () => {
  it('links the selection and selects the address for a paste', () => {
    const edit = link('See our sizes', 4, 13);

    expect(edit.text).toBe('See [our sizes](https://)');
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('https://');
  });
});

describe('prefixLines', () => {
  it('starts the current line when nothing is selected', () => {
    const text = 'Intro\nOpening hours\nMore';
    const cursor = text.indexOf('hours');

    expect(prefixLines(text, cursor, cursor, '## ').text).toBe('Intro\n## Opening hours\nMore');
  });

  it('starts every selected line', () => {
    const text = 'Red\nBlue\nGreen';

    expect(prefixLines(text, 0, text.length, '- ').text).toBe('- Red\n- Blue\n- Green');
  });

  it('numbers the selected lines in order', () => {
    const text = 'Pick a size\nAdd to cart';

    expect(prefixLines(text, 0, text.length, '', true).text).toBe('1. Pick a size\n2. Add to cart');
  });

  it('works on the first and last lines of the text', () => {
    expect(prefixLines('Quote me', 0, 0, '> ').text).toBe('> Quote me');
    expect(prefixLines('', 0, 0, '- ').text).toBe('- ');
  });
});
