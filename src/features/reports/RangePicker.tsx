import { useState, type FormEvent } from 'react';
import { NativeSelect } from '@/components/NativeSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DateRange } from './api';
import { presetFor, presets } from './range';

interface Props {
  range: DateRange;
  today: string;
  onChange: (range: DateRange) => void;
}

/** Presets for common ranges, and From and To days for any other. */
export function RangePicker({ range, today, onChange }: Props) {
  const selected = presetFor(range, today);
  const [custom, setCustom] = useState(selected === 'custom');
  const [from, setFrom] = useState(range.from ?? '');
  const [to, setTo] = useState(range.to ?? '');
  const [problem, setProblem] = useState<string | null>(null);

  function choose(key: string) {
    setProblem(null);
    const preset = presets.find((item) => item.key === key);
    setCustom(!preset);
    if (!preset) return;
    // The backend's default is the last 30 days, so that one needs no dates in the URL.
    onChange(preset.key === '30d' ? {} : preset.range(today));
  }

  function applyCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to) {
      setProblem('Choose both days.');
    } else if (from > to) {
      setProblem('The first day must come before the last.');
    } else {
      setProblem(null);
      onChange({ from, to });
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 sm:w-48">
        <Label htmlFor="report-range">Range</Label>
        <NativeSelect
          id="report-range"
          value={custom ? 'custom' : selected}
          onChange={(event) => choose(event.target.value)}
        >
          {presets.map((preset) => (
            <option key={preset.key} value={preset.key}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom range</option>
        </NativeSelect>
      </div>

      {custom && (
        <form onSubmit={applyCustom} noValidate className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              max={today}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">To</Label>
            <Input
              id="report-to"
              type="date"
              max={today}
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
          {problem && (
            <p role="alert" className="w-full text-sm text-destructive">
              {problem}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
