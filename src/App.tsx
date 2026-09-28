import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc,
  setDoc,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, LeaderboardUser } from './types';
import { Navbar } from './components/Navbar';
import { LandingAuth } from './components/LandingAuth';
import { Dashboard } from './components/Dashboard';
import { Leaderboard } from './components/Leaderboard';
import { generateUserReferralCode, getCurrentISTMonthKey, getCurrentISTMonthName } from './lib/referral';
import { Sparkles, Trophy, HeartHandshake, Shield, Laptop } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [userRank, setUserRank] = useState<number | null>(null);

  const currentISTMonthKey = getCurrentISTMonthKey();
  const currentISTMonthName = getCurrentISTMonthName(currentISTMonthKey);

  // 1. Listen to Firebase Authentication & User Profile in Firestore
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Set up real-time listener for current user's profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
          const fallbackCode = generateUserReferralCode(firebaseUser.uid);
          const activeISTKey = getCurrentISTMonthKey();

          if (docSnap.exists()) {
            const data = docSnap.data();
            const referralCode = data.uniqueCode || data.referralCode || fallbackCode;
            const monthlyPoints = data.monthlyPoints || {};
            const currentMonthPts = typeof monthlyPoints[activeISTKey] === 'number' 
              ? monthlyPoints[activeISTKey] 
              : (data.currentMonthKey === activeISTKey ? (data.currentMonthPoints ?? data.points ?? 0) : 0);

            // Lazily ensure referralCode and uniqueCode are persisted in Firestore if missing
            if (!data.referralCode || !data.uniqueCode) {
              setDoc(userRef, { referralCode: referralCode, uniqueCode: referralCode }, { merge: true }).catch(() => {});
            }

            // Also keep current month leaderboard entry synced
            const monthlyDocRef = doc(db, 'monthly_leaderboard', activeISTKey, 'users', firebaseUser.uid);
            setDoc(monthlyDocRef, {
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || 'Community Member',
              email: data.email || firebaseUser.email || '',
              photoURL: data.photoURL || firebaseUser.photoURL || '',
              referralCode: referralCode,
              uniqueCode: referralCode,
              points: currentMonthPts,
              monthKey: activeISTKey,
            }, { merge: true }).catch(() => {});

            setCurrentUser({
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || 'Community Member',
              email: data.email || firebaseUser.email || '',
              points: typeof data.points === 'number' ? data.points : 0,
              monthlyPoints: monthlyPoints,
              currentMonthPoints: currentMonthPts,
              currentMonthKey: activeISTKey,
              referralCode: referralCode,
              uniqueCode: referralCode,
              referredBy: data.referredBy,
              referredByName: data.referredByName,
              redeemedCode: data.redeemedCode,
              redeemedAt: data.redeemedAt,
              redeemedCodes: Array.isArray(data.redeemedCodes) 
                ? data.redeemedCodes 
                : (data.redeemedCode ? [data.redeemedCode] : []),
              redeemedReferrals: data.redeemedReferrals || {},
              photoURL: data.photoURL || firebaseUser.photoURL || '',
              shareCount: data.shareCount || 0,
              referralCount: data.referralCount || 0,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
          } else {
            // Profile document might be in the middle of being created
            setCurrentUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Community Member',
              email: firebaseUser.email || '',
              points: 0,
              monthlyPoints: {},
              currentMonthPoints: 0,
              currentMonthKey: activeISTKey,
              referralCode: fallbackCode,
              photoURL: firebaseUser.photoURL || '',
              shareCount: 0,
              referralCount: 0,
            });
          }
          setAuthLoading(false);
        }, (error) => {
          console.error('Error listening to user document:', error);
          setAuthLoading(false);
        });
      } else {
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);

  // 2. Real-time public listener for Leaderboard (combines users & monthly_leaderboard)
  useEffect(() => {
    const activeISTKey = getCurrentISTMonthKey();
    let isSubscribed = true;

    // Listen to all community users in real-time
    const usersCol = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCol, (usersSnap) => {
      if (!isSubscribed) return;

      const usersMap = new Map<string, LeaderboardUser>();

      usersSnap.forEach((docSnap) => {
        const d = docSnap.data();
        const mPoints = d.monthlyPoints?.[activeISTKey] ?? 
          (d.currentMonthKey === activeISTKey 
            ? (d.currentMonthPoints ?? d.points ?? 0) 
            : (typeof d.points === 'number' ? d.points : 0));

        usersMap.set(docSnap.id, {
          id: docSnap.id,
          name: d.name || 'Anonymous User',
          email: d.email,
          points: typeof mPoints === 'number' ? mPoints : 0,
          totalPoints: typeof d.points === 'number' ? d.points : 0,
          referralCode: d.uniqueCode || d.referralCode || generateUserReferralCode(docSnap.id),
          uniqueCode: d.uniqueCode || d.referralCode || generateUserReferralCode(docSnap.id),
          photoURL: d.photoURL,
          monthKey: activeISTKey,
          updatedAt: d.updatedAt,
        });
      });

      // Sort strictly by points descending so ranking re-sorts dynamically in real-time
      const sortedUsers = Array.from(usersMap.values()).sort((a, b) => {
        const ptsA = typeof a.points === 'number' ? a.points : 0;
        const ptsB = typeof b.points === 'number' ? b.points : 0;
        if (ptsB !== ptsA) {
          return ptsB - ptsA; // Higher points immediately move up to #1
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      setLeaderboardUsers(sortedUsers.slice(0, 100));
      setTotalUsersCount(sortedUsers.length);
      setLeaderboardLoading(false);
    }, (error) => {
      console.error('Error fetching live public leaderboard from Firestore:', error);
      setLeaderboardLoading(false);
    });

    return () => {
      isSubscribed = false;
      unsubscribeUsers();
    };
  }, [currentISTMonthKey]);

  // 3. Compute Current User's Rank in the current month
  useEffect(() => {
    if (!currentUser || leaderboardUsers.length === 0) {
      setUserRank(null);
      return;
    }

    const index = leaderboardUsers.findIndex((u) => u.id === currentUser.id);
    if (index !== -1) {
      setUserRank(index + 1);
    } else {
      const userMonthlyPts = currentUser.currentMonthPoints || 0;
      if (userMonthlyPts > 0) {
        setUserRank(leaderboardUsers.length + 1);
      } else {
        setUserRank(null);
      }
    }
  }, [currentUser, leaderboardUsers]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-Out Error:', err);
    }
  };

  const scrollToAuth = () => {
    const authElem = document.getElementById('landing-auth-card');
    if (authElem) {
      authElem.focus();
      authElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation Bar */}
      <Navbar 
        user={currentUser} 
        onSignOut={handleSignOut} 
        onOpenAuth={scrollToAuth} 
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Top Hero Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/60 mb-1.5">
              <Sparkles className="h-3 w-3 text-indigo-600" />
              <span>{currentISTMonthName} Leaderboard (IST)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Community Download & Referral Leaderboard
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Support the app on Microsoft Store, invite friends, and climb the {currentISTMonthName} rankings. Resets monthly!
            </p>
          </div>
        </div>

        {/* Dynamic Bento Grid Layout: Auth/Dashboard (4 cols) & Leaderboard (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Bento Stack (4 cols on desktop) */}
          <div className="lg:col-span-4 order-1">
            {currentUser ? (
              <Dashboard 
                user={currentUser} 
                userRank={userRank} 
                totalUsersCount={totalUsersCount} 
              />
            ) : (
              <div className="flex flex-col gap-6">
                <LandingAuth />

                {/* How it Works Bento Card */}
                <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                    How it works
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
                        1
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        <strong className="text-slate-800">Sign in with Google:</strong> Enter your name to get your unique referral code.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
                        2
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        <strong className="text-slate-800">Share with Friends:</strong> Send the Microsoft Store link & your code via WhatsApp or Telegram.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
                        3
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        <strong className="text-slate-800">Earn +1 Point:</strong> When friends redeem your code, +1 point is awarded for the current month!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Monthly Leaderboard (8 cols on desktop) */}
          <div className="lg:col-span-8 order-2">
            <Leaderboard 
              users={leaderboardUsers} 
              currentUserId={currentUser?.id} 
              loading={leaderboardLoading} 
              selectedMonthKey={currentISTMonthKey}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-slate-700">Community App Download Leaderboard</span>
          </div>
          <p className="text-slate-400">
            Strict Monthly Resets based on Indian Standard Time (IST) • Powered by Firebase Firestore
          </p>
        </div>
      </footer>
    </div>
  );
}
