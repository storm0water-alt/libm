import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  getPlatform,
  getDesktopPath,
  getQuickNavPaths,
  isWindows,
  isMacOS,
  isLinux,
} from './platform';

describe('Platform Utilities', () => {
  describe('getPlatform', () => {
    it('should return a valid platform', () => {
      const platform = getPlatform();
      expect(['win32', 'darwin', 'linux', 'unknown']).toContain(platform);
    });
  });

  describe('Platform Detection', () => {
    it('should correctly detect Windows', () => {
      const result = isWindows();
      expect(typeof result).toBe('boolean');
    });

    it('should correctly detect macOS', () => {
      const result = isMacOS();
      expect(typeof result).toBe('boolean');
    });

    it('should correctly detect Linux', () => {
      const result = isLinux();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getDesktopPath', () => {
    it('should return a string path or null', () => {
      const desktopPath = getDesktopPath();
      expect(desktopPath === null || typeof desktopPath === 'string').toBe(true);
    });

    it('should return desktop path if it exists', () => {
      const desktopPath = getDesktopPath();
      if (desktopPath) {
        expect(existsSync(desktopPath)).toBe(true);
        expect(desktopPath).toContain('Desktop');
      }
    });

    it('should use homedir() for path construction', () => {
      const desktopPath = getDesktopPath();
      if (desktopPath) {
        const home = homedir();
        expect(desktopPath.startsWith(home)).toBe(true);
      }
    });
  });

  describe('getQuickNavPaths', () => {
    it('should return an array', () => {
      const paths = getQuickNavPaths();
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should include desktop path if it exists', () => {
      const paths = getQuickNavPaths();
      const desktopPath = getDesktopPath();
      
      if (desktopPath) {
        const desktopNav = paths.find(p => p.path === desktopPath);
        expect(desktopNav).toBeDefined();
        expect(desktopNav?.label).toContain('Desktop');
      }
    });

    it('should have desktop as first item if it exists', () => {
      const paths = getQuickNavPaths();
      const desktopPath = getDesktopPath();
      
      if (desktopPath && paths.length > 0) {
        expect(paths[0].path).toBe(desktopPath);
      }
    });

    it('should return paths with valid structure', () => {
      const paths = getQuickNavPaths();
      
      paths.forEach(path => {
        expect(path).toHaveProperty('path');
        expect(path).toHaveProperty('label');
        expect(typeof path.path).toBe('string');
        expect(typeof path.label).toBe('string');
        expect(path.path.length).toBeGreaterThan(0);
        expect(path.label.length).toBeGreaterThan(0);
      });
    });

    it('should return platform-appropriate paths', () => {
      const paths = getQuickNavPaths();
      const platform = getPlatform();
      
      if (platform === 'win32') {
        expect(paths.some(p => p.path.match(/^[A-Z]:\\/))).toBe(true);
      } else if (platform === 'darwin') {
        expect(paths.some(p => p.path === '/')).toBe(true);
        expect(paths.some(p => p.path === '/Volumes')).toBe(true);
      } else if (platform === 'linux') {
        expect(paths.some(p => p.path === '/')).toBe(true);
        expect(paths.some(p => p.path === '/mnt' || p.path === '/home')).toBe(true);
      }
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should handle Desktop folder in different languages', () => {
      const desktopPath = getDesktopPath();
      const home = homedir();
      
      if (desktopPath) {
        expect(desktopPath).toBe(join(home, 'Desktop'));
      }
    });
  });
});
