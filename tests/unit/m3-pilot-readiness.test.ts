import { describe, it, expect } from 'vitest';
import { validateSafeUrl, isSafePublicUrl } from '../../packages/shared/validation/url-validator';

describe('M3.4 & M3.5 Pilot Readiness, Reports & Security Tests', () => {
  describe('URL Safety & Anti-SSRF Validation', () => {
    it('accepts legitimate public web domains and URLs', () => {
      const validCases = [
        'https://zomato.com',
        'http://swiggy.com/menu',
        'eatsure.com',
        'https://www.magicpin.in/deals?category=dining',
      ];

      for (const url of validCases) {
        const result = validateSafeUrl(url);
        expect(result.safe).toBe(true);
        expect(result.domain).toBeDefined();
        expect(isSafePublicUrl(url)).toBe(true);
      }
    });

    it('blocks loopback and localhost addresses', () => {
      const loopbackCases = [
        'http://localhost:3000',
        'https://127.0.0.1/admin',
        'http://127.0.0.5',
        'http://localhost',
      ];

      for (const url of loopbackCases) {
        const result = validateSafeUrl(url);
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('Disallowed internal or private address');
        expect(isSafePublicUrl(url)).toBe(false);
      }
    });

    it('blocks RFC 1918 private network ranges (10.x, 172.16.x, 192.168.x)', () => {
      const privateCases = [
        'http://10.0.0.1/internal-api',
        'https://172.16.0.50/metrics',
        'http://192.168.1.1/router-setup',
      ];

      for (const url of privateCases) {
        const result = validateSafeUrl(url);
        expect(result.safe).toBe(false);
        expect(isSafePublicUrl(url)).toBe(false);
      }
    });

    it('blocks AWS and GCP cloud instance metadata endpoints', () => {
      const metadataCases = [
        'http://169.254.169.254/latest/meta-data/',
        'http://metadata.google.internal/computeMetadata/v1/',
        'http://instance-data/latest/api',
      ];

      for (const url of metadataCases) {
        const result = validateSafeUrl(url);
        expect(result.safe).toBe(false);
        expect(isSafePublicUrl(url)).toBe(false);
      }
    });

    it('blocks dangerous URI schemes', () => {
      const dangerousSchemes = [
        'javascript:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://anonymous@internal.ftp/dump',
      ];

      for (const url of dangerousSchemes) {
        const result = validateSafeUrl(url);
        expect(result.safe).toBe(false);
        expect(isSafePublicUrl(url)).toBe(false);
      }
    });
  });

  describe('Pilot Report CSV Formatting Integrity', () => {
    it('properly formats CSV rows with quotes and escape characters', () => {
      function escapeCsvCell(val: string | number): string {
        const s = String(val ?? '');
        return `"${s.replace(/"/g, '""')}"`;
      }

      const rawTitle = 'Optimize Presence for "Best Pizza" Queries';
      const escaped = escapeCsvCell(rawTitle);

      expect(escaped).toBe('"Optimize Presence for ""Best Pizza"" Queries"');
      expect(escaped.startsWith('"')).toBe(true);
      expect(escaped.endsWith('"')).toBe(true);
    });
  });
});

