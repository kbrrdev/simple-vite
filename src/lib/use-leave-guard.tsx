import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';
import { ConfirmDialog } from '@/components/ConfirmDialog';

/**
 * Asks before leaving a page with unsaved changes. React Router's blocker covers links and Back,
 * and the browser asks when the tab is closed or reloaded. Call `allowLeave` just before leaving
 * on purpose, such as after a save that opens another page.
 */
export function useLeaveGuard(dirty: boolean, description: string) {
  const leaving = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const dialog = blocker.state === 'blocked' && (
    <ConfirmDialog
      title="Leave without saving?"
      description={description}
      actionLabel="Leave"
      destructive
      pending={false}
      error={null}
      onConfirm={() => blocker.proceed()}
      onClose={() => blocker.reset()}
    />
  );

  return {
    dialog,
    allowLeave: () => {
      leaving.current = true;
    },
  };
}
