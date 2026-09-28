import React from 'react';
import { Trophy, LogOut, Sparkles, Flame, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  onSignOut: () => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onSignOut, onOpenAuth }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title - Bento Header Theme */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-200 text-white font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Community App <span className="text-slate-400 font-normal">Leaderboard</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Live Google Play downloads & community activity
            </p>
          </div>
        </div>

        {/* User Status / Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-white p-1.5 sm:pr-4 rounded-full border border-slate-200 shadow-xs">
              {/* Avatar */}
              {user.photoURL ? (
                <img
                  id="user-nav-avatar"
                  src={user.photoURL}
                  alt={user.name}
                  className="h-8 w-8 rounded-full ring-1 ring-slate-200 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Name & Points */}
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-sm font-semibold text-slate-900 max-w-[120px] truncate">
                  {user.name}
                </span>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">
                  {user.points.toLocaleString()} pts
                </span>
              </div>

              {/* Points Pill for Mobile */}
              <span className="sm:hidden text-xs font-bold text-indigo-600 px-1">
                {user.points.toLocaleString()} pts
              </span>

              {/* Logout Button */}
              <button
                id="sign-out-btn"
                onClick={onSignOut}
                title="Sign Out"
                className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="nav-join-btn"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
              <span>Join Leaderboard</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
