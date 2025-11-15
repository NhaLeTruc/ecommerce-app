'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function UnauthorizedPage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Access Denied
          </h1>

          {/* Message */}
          <div className="mt-4 text-gray-600">
            {!isAuthenticated ? (
              <p>You need to be logged in to access this page.</p>
            ) : user?.role !== 'admin' ? (
              <p>This page requires administrator privileges.</p>
            ) : (
              <p>You don't have permission to access this page.</p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            {!isAuthenticated ? (
              <Link
                href="/login"
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            ) : (
              <>
                <Link
                  href="/"
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Go to Home
                </Link>
                {user?.role !== 'admin' && (
                  <p className="text-sm text-gray-500">
                    Logged in as: <span className="font-medium">{user?.email}</span> ({user?.role})
                  </p>
                )}
              </>
            )}
          </div>

          {/* Help Text */}
          <p className="mt-6 text-sm text-gray-500">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
