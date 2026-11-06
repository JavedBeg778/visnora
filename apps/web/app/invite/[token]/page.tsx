'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { createClient } from '../../../lib/supabase/client';

interface InvitationDetails {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: string;
  status: string;
  isValid: boolean;
  expiresAt: string;
}

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitationAndAuth();
    }
  }, [token]);

  const loadInvitationAndAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Check Auth Status
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        setIsAuthenticated(true);
        setCurrentUserEmail(authData.user.email || null);
      } else {
        setIsAuthenticated(false);
      }

      // 2. Fetch Invitation by token
      const res = await fetch(`/api/v1/invitations/${token}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid or expired invitation link');
      }

      setInvitation(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to verify invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/invitations/${token}/accept`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to accept invitation');
      }

      setSuccess(true);

      // Set active org cookie to newly joined organization
      if (invitation?.organizationId) {
        document.cookie = `visnora_active_org=${invitation.organizationId}; path=/; max-age=2592000; SameSite=Lax`;
      }

      // Redirect to dashboard after brief confirmation
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred while accepting invitation.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <Link href="/" className="inline-flex items-center space-x-2">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            V
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Visnora</span>
        </Link>
        <p className="text-xs text-slate-500 mt-1">Enterprise AI Visibility & Competitive Intelligence</p>
      </div>

      <div className="w-full max-w-md">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-xs text-slate-500 font-medium">Verifying invitation link...</p>
            </CardContent>
          </Card>
        ) : error || !invitation ? (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle>Invitation Unavailable</CardTitle>
              <CardDescription>
                {error || 'This invitation link is invalid or has expired.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 text-center space-y-3">
              <p className="text-xs text-slate-500">
                Please request a new invitation link from your organization administrator.
              </p>
              <div className="pt-2">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Return to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : success ? (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle>Invitation Accepted!</CardTitle>
              <CardDescription>
                You are now a member of <strong className="text-slate-900">{invitation.organizationName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-slate-500 mb-4">Redirecting you to the dashboard...</p>
              <div className="animate-pulse flex justify-center">
                <div className="h-2 w-24 bg-blue-600 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                <Building2 className="h-6 w-6" />
              </div>
              <CardTitle>Join {invitation.organizationName}</CardTitle>
              <CardDescription>
                You have been invited to collaborate on Visnora.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Organization:</span>
                  <span className="font-bold text-slate-900">{invitation.organizationName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Assigned Role:</span>
                  <Badge variant="blue" className="uppercase text-[10px]">
                    {invitation.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Invited Email:</span>
                  <span className="font-medium text-slate-800">{invitation.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 flex items-center">
                    <Clock className="h-3 w-3 mr-1" /> Expires
                  </span>
                  <span className="text-slate-500">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {isAuthenticated ? (
                <div className="space-y-3 pt-2">
                  {currentUserEmail && currentUserEmail.toLowerCase() !== invitation.email.toLowerCase() && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      Note: You are currently signed in as <strong>{currentUserEmail}</strong>, while this invitation was issued to <strong>{invitation.email}</strong>.
                    </div>
                  )}

                  <Button
                    onClick={handleAccept}
                    isLoading={accepting}
                    className="w-full py-2.5"
                  >
                    Accept Invitation & Join
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-center text-slate-600">
                    Please log in or create an account with <strong>{invitation.email}</strong> to accept this invitation.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/login?redirect=/invite/${token}`}
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full">
                        <LogIn className="h-3.5 w-3.5 mr-1.5" />
                        Log In
                      </Button>
                    </Link>

                    <Link
                      href={`/signup?email=${encodeURIComponent(invitation.email)}&redirect=/invite/${token}`}
                      className="w-full"
                    >
                      <Button className="w-full">
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center text-xs text-slate-400">
          Visnora SaaS Intelligence &bull; Secured with Supabase SSR
        </div>
      </div>
    </div>
  );
}
