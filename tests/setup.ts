import { afterEach, vi } from 'vitest';

// Mock global fetch for MSW
global.fetch = vi.fn();

// Mock crypto.getRandomValues for deterministic PKCE in tests
const originalGetRandomValues = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  getRandomValues: <T extends ArrayBufferView>(arr: T): T => {
    if (!originalGetRandomValues) {
      // Fill with deterministic values for testing
      const uint8Arr = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
      for (let i = 0; i < uint8Arr.length; i++) {
        uint8Arr[i] = i % 256;
      }
      return arr;
    }
    return originalGetRandomValues?.(arr as ArrayBufferView<ArrayBuffer>) as T;
  },
});

// Silence console.log in tests unless explicitly testing output
const originalLog = console.log;
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();

// Restore after each test
afterEach(() => {
  console.log = originalLog;
});
