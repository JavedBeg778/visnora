// Visnora — Anti-SSRF & Network Security Test Suite
// Verifies protection against all SSRF attack classes: IPv4, IPv6, ULA, Link-Local, Cloud Metadata, Alternate Encodings

import { describe, it, expect } from 'vitest';
import { validateSafeUrl, isSafePublicUrl } from '../../packages/shared/validation/url-validator';

describe('Phase 9 — Deep SSRF & Network Security Verification', () => {
  describe('Loopback & Internal Hostname Protection', () => {
    it('blocks IPv4 loopback variations', () => {
      expect(isSafePublicUrl('http://127.0.0.1/admin')).toBe(false);
      expect(isSafePublicUrl('https://127.0.0.1:8080/metrics')).toBe(false);
      expect(isSafePublicUrl('http://127.12.34.56/')).toBe(false);
      expect(isSafePublicUrl('http://0.0.0.0/')).toBe(false);
      expect(isSafePublicUrl('http://localhost:3000')).toBe(false);
      expect(isSafePublicUrl('https://localhost/api')).toBe(false);
    });

    it('blocks internal and private top-level domains', () => {
      expect(isSafePublicUrl('http://redis.internal:6379')).toBe(false);
      expect(isSafePublicUrl('https://database.local/')).toBe(false);
      expect(isSafePublicUrl('http://my-service.lan/')).toBe(false);
      expect(isSafePublicUrl('http://corp-server.corp/')).toBe(false);
    });
  });

  describe('IPv6 Security & Tunneling Protection', () => {
    it('blocks IPv6 loopback addresses', () => {
      expect(isSafePublicUrl('http://[::1]/')).toBe(false);
      expect(isSafePublicUrl('https://[::1]:8080/')).toBe(false);
    });

    it('blocks IPv6 Unique Local Addresses (ULA fc00::/7)', () => {
      expect(isSafePublicUrl('http://[fc00::1]/admin')).toBe(false);
      expect(isSafePublicUrl('http://[fd12:3456:789a::1]/status')).toBe(false);
    });

    it('blocks IPv6 Link-Local Addresses (fe80::/10)', () => {
      expect(isSafePublicUrl('http://[fe80::1]/')).toBe(false);
      expect(isSafePublicUrl('https://[fe80::200:5efe:10.0.0.1]/')).toBe(false);
    });

    it('blocks IPv4-mapped IPv6 addresses', () => {
      expect(isSafePublicUrl('http://[::ffff:127.0.0.1]/')).toBe(false);
      expect(isSafePublicUrl('http://[::ffff:169.254.169.254]/')).toBe(false);
      expect(isSafePublicUrl('http://[::ffff:10.0.0.1]/')).toBe(false);
    });
  });

  describe('Cloud Metadata Exfiltration Defense', () => {
    it('blocks AWS/GCP/Azure link-local instance metadata IP 169.254.169.254', () => {
      expect(isSafePublicUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(isSafePublicUrl('http://169.254.169.254/computeMetadata/v1/')).toBe(false);
      expect(isSafePublicUrl('http://169.254.1.1/')).toBe(false);
    });

    it('blocks GCP internal metadata hostname', () => {
      expect(isSafePublicUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(false);
    });

    it('blocks AWS instance-data hostname', () => {
      expect(isSafePublicUrl('http://instance-data/latest/meta-data/')).toBe(false);
    });
  });

  describe('RFC 1918 Private Subnets Defense', () => {
    it('blocks Class A 10.0.0.0/8', () => {
      expect(isSafePublicUrl('http://10.0.0.1/')).toBe(false);
      expect(isSafePublicUrl('http://10.254.12.3/api')).toBe(false);
    });

    it('blocks Class B 172.16.0.0/12', () => {
      expect(isSafePublicUrl('http://172.16.0.1/')).toBe(false);
      expect(isSafePublicUrl('http://172.24.50.1/')).toBe(false);
      expect(isSafePublicUrl('http://172.31.255.254/')).toBe(false);
    });

    it('blocks Class C 192.168.0.0/16', () => {
      expect(isSafePublicUrl('http://192.168.1.1/')).toBe(false);
      expect(isSafePublicUrl('http://192.168.100.254/')).toBe(false);
    });
  });

  describe('Encoded & Alternate IP Encodings', () => {
    it('blocks 32-bit decimal integer representations', () => {
      // 2130706433 === 127.0.0.1
      expect(isSafePublicUrl('http://2130706433/')).toBe(false);
      // 2852039166 === 169.254.169.254
      expect(isSafePublicUrl('http://2852039166/')).toBe(false);
    });

    it('blocks hexadecimal IP encodings', () => {
      // 0x7f000001 === 127.0.0.1
      expect(isSafePublicUrl('http://0x7f000001/')).toBe(false);
    });
  });

  describe('Disallowed Schemes', () => {
    it('blocks non-HTTP/HTTPS protocols', () => {
      expect(isSafePublicUrl('file:///etc/passwd')).toBe(false);
      expect(isSafePublicUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
      expect(isSafePublicUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isSafePublicUrl('gopher://127.0.0.1:70/')).toBe(false);
      expect(isSafePublicUrl('dict://127.0.0.1:11211/stat')).toBe(false);
      expect(isSafePublicUrl('ftp://public-mirror.org/')).toBe(false);
    });
  });

  describe('Legitimate Public URLs Verification', () => {
    it('accepts legitimate customer domains and competitors', () => {
      const zomato = validateSafeUrl('https://www.zomato.com/bangalore/restaurants');
      expect(zomato.safe).toBe(true);
      expect(zomato.domain).toBe('zomato.com');

      const swiggy = validateSafeUrl('https://swiggy.com/order');
      expect(swiggy.safe).toBe(true);
      expect(swiggy.domain).toBe('swiggy.com');

      const eatsure = validateSafeUrl('https://www.eatsure.com/');
      expect(eatsure.safe).toBe(true);

      const magicpin = validateSafeUrl('https://magicpin.in/deals');
      expect(magicpin.safe).toBe(true);
    });
  });
});

