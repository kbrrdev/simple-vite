import type { ReactNode } from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import type { Step, StepState } from './order-steps';

const stateText: Record<StepState, string> = {
  done: 'done',
  current: 'current',
  upcoming: 'not reached',
  stopped: 'stopped',
};

function Marker({ state }: { state: StepState }) {
  const base = 'relative flex size-6 shrink-0 items-center justify-center rounded-full';

  if (state === 'done') {
    return (
      <span className={`${base} bg-primary text-primary-foreground`}>
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'stopped') {
    return (
      <span className={`${base} bg-destructive text-white`}>
        <XIcon className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className={`${base} border-2 border-primary bg-background`}>
        <span className="size-2 rounded-full bg-primary" />
      </span>
    );
  }
  return <span className={`${base} border border-border bg-background`} />;
}

interface Props {
  label: string;
  steps: Step[];
  /** Extra content under the current step, such as the payment reference. */
  children?: ReactNode;
}

/** A vertical list of steps, with the current one marked. */
export function Steps({ label, steps, children }: Props) {
  return (
    <ol aria-label={label}>
      {steps.map((step, index) => {
        const active = step.state === 'current' || step.state === 'stopped';
        const labelClass =
          step.state === 'upcoming'
            ? 'text-muted-foreground'
            : step.state === 'stopped'
              ? 'font-medium text-destructive'
              : 'font-medium';

        return (
          <li
            key={step.key}
            aria-current={active ? 'step' : undefined}
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            {index < steps.length - 1 && (
              <span aria-hidden className="absolute top-6 bottom-0 left-[11.5px] w-px bg-border" />
            )}
            <Marker state={step.state} />
            <div className="min-w-0 flex-1 space-y-1 pt-0.5 text-sm">
              <p className={labelClass}>
                {step.label}
                <span className="sr-only"> ({stateText[step.state]})</span>
              </p>
              {step.note && <p className="text-muted-foreground">{step.note}</p>}
              {step.state === 'current' && children}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
