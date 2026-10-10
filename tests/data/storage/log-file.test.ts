import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '..', '..', '..', 'test-data-logs');
const TEST_LOG_FILE = path.join(TEST_DIR, 'app.log');

// Set environment variables BEFORE importing the module
process.env.SPOTY_LOG_DIR = TEST_DIR;
process.env.SPOTY_LOG_FILE = TEST_LOG_FILE;

import { getLogFilePath, logFileSetup } from '@/data/storage/log-file.js';

describe('log-file.ts - Log rotation', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    if (fs.existsSync(TEST_LOG_FILE)) {
      fs.unlinkSync(TEST_LOG_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_LOG_FILE)) {
      fs.unlinkSync(TEST_LOG_FILE);
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('logFileSetup', () => {
    it('should create directory if not exists', () => {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
      logFileSetup();
      expect(fs.existsSync(TEST_DIR)).toBe(true);
    });

    it('should truncate log file if larger than 5MB', () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024);
      fs.writeFileSync(TEST_LOG_FILE, largeContent);
      expect(fs.statSync(TEST_LOG_FILE).size).toBeGreaterThan(5 * 1024 * 1024);

      logFileSetup();

      expect(fs.statSync(TEST_LOG_FILE).size).toBe(0);
    });

    it('should not truncate log file if smaller than 5MB', () => {
      const smallContent = 'small log content';
      fs.writeFileSync(TEST_LOG_FILE, smallContent);
      logFileSetup();
      expect(fs.readFileSync(TEST_LOG_FILE, 'utf8')).toBe(smallContent);
    });
  });

  describe('getLogFilePath', () => {
    it('should return correct path', () => {
      expect(getLogFilePath()).toBe(TEST_LOG_FILE);
    });
  });
});
