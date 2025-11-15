'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService, User } from '@/lib/api';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-white hover:text-blue-200 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center font-semibold">
          {user.firstName[0]}{user.lastName[0]}
        </div>
        <span className="hidden md:inline">
          {user.firstName} {user.lastName}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900">{user.email}</p>
            {user.role === 'admin' && (
              <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                Admin
              </span>
            )}
          </div>

          <Link
            href="/orders"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={() => setShowDropdown(false)}
          >
            My Orders
          </Link>

          {user.role === 'admin' && (
            <Link
              href="/admin"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => setShowDropdown(false)}
            >
              Admin Dashboard
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      )}

      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
