import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { generateUserReferralCode, getCurrentISTMonthKey } from '../lib/referral';
import { User, AlertCircle, Loader2, ArrowRight, ShieldCheck, Copy, Check, ExternalLink, Globe } from 'lucide-react';

interface LandingAuthProps {
  onSuccess?: () => void;
}

export const LandingAuth: React.FC<LandingAuthProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseConsoleUrl = 'https://console.firebase.google.com/project/v-astra-leaderboard/authentication/settings';

  const handleCopyDomain = () => {
    if (!currentHostname) return;
    navigator.clipboard.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your name first to appear on the leaderboard.');
      setIsUnauthorizedDomain(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setIsUnauthorizedDomain(false);

    try {
      // Step 1: Sign in with Google Popup
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      if (!firebaseUser) {
        throw new Error('Authentication failed. No user was returned.');
      }

      // Step 2: Check Firestore 'users' collection
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      const userReferralCode = generateUserReferralCode(firebaseUser.uid);
      const activeISTKey = getCurrentISTMonthKey();

      if (userSnap.exists()) {
        const existingData = userSnap.data();
        const finalCode = existingData.referralCode || userReferralCode;
        const currentMonthPts = existingData.monthlyPoints?.[activeISTKey] ?? (existingData.currentMonthKey === activeISTKey ? (existingData.currentMonthPoints ?? 0) : 0);

        // User already exists: update name & timestamp, ensure referralCode exists
        await setDoc(
          userRef,
          {
            name: trimmedName,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            referralCode: finalCode,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Sync into current active IST month leaderboard collection
        const monthlyDocRef = doc(db, 'monthly_leaderboard', activeISTKey, 'users', firebaseUser.uid);
        await setDoc(
          monthlyDocRef,
          {
            id: firebaseUser.uid,
            name: trimmedName,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            referralCode: finalCode,
            points: currentMonthPts,
            monthKey: activeISTKey,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // Brand new user: Save real Name, Google Email, and initial Points (0)
        await setDoc(userRef, {
          id: firebaseUser.uid,
          name: trimmedName,
          email: firebaseUser.email || '',
          points: 0,
          monthlyPoints: { [activeISTKey]: 0 },
          currentMonthPoints: 0,
          currentMonthKey: activeISTKey,
          referralCode: userReferralCode,
          referralCount: 0,
          photoURL: firebaseUser.photoURL || '',
          shareCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Initialize record in monthly_leaderboard
        const monthlyDocRef = doc(db, 'monthly_leaderboard', activeISTKey, 'users', firebaseUser.uid);
        await setDoc(
          monthlyDocRef,
          {
            id: firebaseUser.uid,
            name: trimmedName,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            referralCode: userReferralCode,
            points: 0,
            monthKey: activeISTKey,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomain(true);
        setErrorMessage(
          `This domain (${currentHostname}) is not yet added to your Firebase project's Authorized Domains.`
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in popup was closed before completion. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setErrorMessage(err.message || 'Failed to sign in with Google. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
      <div className="mb-5">
        <h2 className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">
          Join Community
        </h2>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Enter Your Name & Sign In
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Your name and live score will appear on the public monthly leaderboard.
        </p>
      </div>

      {isUnauthorizedDomain ? (
        <div
          id="auth-unauthorized-domain-card"
          className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-950 space-y-3"
        >
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900 block text-sm">
                Authorize Domain in Firebase Console
              </span>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                Google Sign-In requires your app's current domain to be listed in Firebase Auth settings.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-3 border border-amber-200/80 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Domain to authorize:
            </span>
            <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 font-mono text-xs text-slate-800">
              <span className="truncate">{currentHostname}</span>
              <button
                type="button"
                onClick={handleCopyDomain}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0 cursor-pointer"
              >
                {copiedDomain ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1 text-[11px] text-amber-900 leading-relaxed">
            <p className="font-semibold text-slate-800">Quick 2-step setup:</p>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700">
              <li>
                Open{' '}
                <a
                  href={firebaseConsoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Firebase Authorized Domains</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Click <strong>"Add domain"</strong>, paste <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[10px]">{currentHostname}</code>, and save.
              </li>
            </ol>
          </div>
        </div>
      ) : errorMessage ? (
        <div
          id="auth-error-alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      ) : null}

      <form onSubmit={handleGoogleLogin} className="space-y-4">
        <div>
          <label htmlFor="user-name-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            Display Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              id="user-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              required
              maxLength={40}
              disabled={loading}
              className="block w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-500/20 transition-all font-medium"
            />
          </div>
        </div>

        <button
          id="google-login-btn"
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full flex items-center justify-center gap-3 rounded-xl bg-indigo-600 py-3.5 px-4 text-sm font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Authenticating with Google...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#ffffff"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#ffffff"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#ffffff"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#ffffff"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Login with Google</span>
              <ArrowRight className="h-4 w-4 text-indigo-200" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>Secure authentication powered by Firebase</span>
      </div>
    </div>
  );
};

