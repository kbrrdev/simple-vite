import { useState } from 'react';
import { BanIcon } from 'lucide-react';
import { cn } from 'cn';
import { Input } from '@/components/ui/input';
import { categoryIcons } from './icons';

interface Props {
  value: string | null;
  onChange: (name: string | null) => void;
  error?: string;
}

const optionClass =
  'flex cursor-pointer flex-col items-center gap-1 rounded-md border p-2 text-xs has-checked:border-foreground has-checked:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring';

/**
 * Picks one icon, or none, as a radio group of labelled icons with a search to narrow them.
 * The store shows the image when a category has one, and the icon otherwise.
 */
export function IconPicker({ value, onChange, error }: Props) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const shown = categoryIcons.filter(
    (item) =>
      !term ||
      item.label.toLowerCase().includes(term) ||
      item.name.includes(term) ||
      item.keywords.includes(term),
  );
  // Another frontend may have stored a name this app does not have, so say so.
  const unknown = value !== null && !categoryIcons.some((item) => item.name === value);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm leading-none font-medium">Icon</legend>
      <p className="text-xs text-muted-foreground">
        Shown in the store when the category has no image.
      </p>
      <Input
        type="search"
        aria-label="Search icons"
        placeholder="Search icons, such as shoes"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {unknown && (
        <p className="text-sm text-muted-foreground">
          This category uses “{value}”, which this app does not offer. Choose another to change it.
        </p>
      )}
      <div
        role="radiogroup"
        aria-label="Icon"
        className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto p-0.5 sm:grid-cols-6"
      >
        {!term && (
          <label className={optionClass}>
            <input
              type="radio"
              name="category-icon"
              className="sr-only"
              checked={value === null}
              onChange={() => onChange(null)}
            />
            <BanIcon aria-hidden className="size-5 text-muted-foreground" />
            None
          </label>
        )}
        {shown.map((item) => (
          <label key={item.name} className={optionClass}>
            <input
              type="radio"
              name="category-icon"
              className="sr-only"
              checked={value === item.name}
              onChange={() => onChange(item.name)}
            />
            <item.icon aria-hidden className="size-5" />
            <span className={cn('truncate', value === item.name && 'font-medium')}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="text-sm text-muted-foreground">No icons match “{search.trim()}”.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}
