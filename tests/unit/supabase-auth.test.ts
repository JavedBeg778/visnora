import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock Supabase SSR module
const mockGetUser = vi.fn();
const mockExchangeCode = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url, _key, options) => {
    return {
      auth: {
        getUser: mockGetUser,
        exchangeCodeForSession: mockExchangeCode,
        signOut: mockSignOut,
      },
    };
  }),
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  })),
}));

// Mock user service for profile synchronization
vi.mock('@/domain/administration/user-service', () => ({
  syncUserProfile: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
  getUserProfile: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [{ name: 'sb-token', value: 'valid-token' }],
    get: (key: string) => ({ name: key, value: 'valid-token' }),
    set: vi.fn(),
  }),
}));

import { updateSession } from '../../apps/web/lib/supabase/middleware';
import { getAuthenticatedUser } from '../../apps/web/lib/api-handler';

describe('Supabase Auth & Protected Routes Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://gbxjxmwziskaqjonxwrc.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  describe('Middleware Route Protection', () => {
    it('redirects unauthenticated user accessing /dashboard to /login', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth session missing') });

      const request = new NextRequest('http://localhost:3000/dashboard');
      const response = await updateSession(request);

      expect(response.status).toBe(307); // Next.js redirect
      const location = response.headers.get('location');
      expect(location).toContain('/login?redirectTo=%2Fdashboard');
    });

    it('redirects unauthenticated user accessing nested protected routes to /login', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const protectedPaths = [
        '/brands',
        '/competitors',
        '/prompts',
        '/runs',
        '/citations',
        '/recommendations',
        '/projects',
        '/workspaces',
        '/team',
        '/settings',
        '/onboarding',
      ];

      for (const path of protectedPaths) {
        const request = new NextRequest(`http://localhost:3000${path}`);
        const response = await updateSession(request);
        expect(response.status).toBe(307);
        const location = response.headers.get('location');
        expect(location).toContain(`/login?redirectTo=${encodeURIComponent(path)}`);
      }
    });

    it('redirects authenticated user accessing /login to /dashboard', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr_123', email: 'founder@visnora.com' } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/login');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/dashboard');
    });

    it('redirects authenticated user accessing /signup to /dashboard', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr_123', email: 'founder@visnora.com' } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/signup');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/dashboard');
    });

    it('allows unauthenticated access to public routes like landing page and invitations', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const request = new NextRequest('http://localhost:3000/');
      const response = await updateSession(request);

      // Should not redirect
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it('allows authenticated users to access protected routes without redirection', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr_123', email: 'user@visnora.com' } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/dashboard');
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('API Route Authentication Helper', () => {
    it('authenticates user from valid Supabase cookie session', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr_test_1', email: 'member@visnora.com' } },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/workspaces');
      const user = await getAuthenticatedUser(req);

      expect(user).not.toBeNull();
      expect(user?.id).toBe('usr_test_1');
      expect(user?.email).toBe('member@visnora.com');
    });

    it('authenticates user from Bearer authorization header', async () => {
      mockGetUser.mockImplementation((token?: string) => {
        if (token === 'valid-jwt-token') {
          return Promise.resolve({
            data: { user: { id: 'usr_jwt_2', email: 'api-user@visnora.com' } },
            error: null,
          });
        }
        return Promise.resolve({ data: { user: null }, error: new Error('Invalid JWT') });
      });

      const req = new NextRequest('http://localhost:3000/api/v1/projects', {
        headers: {
          authorization: 'Bearer valid-jwt-token',
        },
      });

      const user = await getAuthenticatedUser(req);
      expect(user).not.toBeNull();
      expect(user?.id).toBe('usr_jwt_2');
      expect(user?.email).toBe('api-user@visnora.com');
    });

    it('returns null when no session and no valid token is provided', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('No user'),
      });

      // Clear test dev bypass headers
      const req = new NextRequest('http://localhost:3000/api/v1/brands');
      const user = await getAuthenticatedUser(req);

      expect(user).toBeNull();
    });
  });
});

