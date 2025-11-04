'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">BizTrack</h1>
            <p className="text-lg text-gray-600 mb-8">
              Manage your business efficiently with our comprehensive business management platform.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/auth/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign In
            </Link>

            <Link
              href="/auth/register"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Account
            </Link>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
            <div className="grid grid-cols-1 gap-4 text-sm text-gray-600">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-900">User Management</h3>
                <p>Secure authentication and user profiles</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-900">Dashboard</h3>
                <p>Comprehensive business overview and analytics</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-900">Secure</h3>
                <p>Built with Supabase for enterprise-grade security</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
