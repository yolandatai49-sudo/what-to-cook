// Component tests use a DOM simulator. Real Service Worker behavior is covered
// by the separate production-browser suite, never by this mock.
export function useRegisterSW() {
  return {
    offlineReady: [false, () => {}] as const,
    needRefresh: [false, () => {}] as const,
    updateServiceWorker: async () => {},
  };
}
