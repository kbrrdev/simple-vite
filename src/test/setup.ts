import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { toast } from 'sonner';

// The whole suite runs files side by side, so a lazy screen or the first render can take more
// than the 1 second Testing Library waits by default. Waits still end as soon as things show.
configure({ asyncUtilTimeout: 3000 });

// Toasts live in one list shared by every test in a file, so one test's toast would show in the
// next. Each test starts with none.
afterEach(() => {
  toast.dismiss();
});

// jsdom has no ResizeObserver, which the chart library needs to mount. Nothing is drawn in
// tests, so an observer that never reports is enough.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
