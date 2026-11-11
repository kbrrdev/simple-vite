import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver, which the chart library needs to mount. Nothing is drawn in
// tests, so an observer that never reports is enough.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
