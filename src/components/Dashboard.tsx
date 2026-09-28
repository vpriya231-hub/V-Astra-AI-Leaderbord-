import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageCircle, 
  Send, 
  Award, 
  Edit2, 
  CheckCheck,
  Info,
  Gift,
  ArrowRight,
  Loader2,
  AlertCircle,
  Users,
  Sparkles,
  Calendar,
  Clock,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  doc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  increment, 
  arrayUnion,
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc 
} from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { 
  MICROSOFT_STORE_URL,
  getShareMessage,
  getWhatsAppShareMessage, 
  generateUserReferralCode,
  getCurrentISTMonthKey,
  getCurrentISTMonthName
} from '../lib/referral';
import { DeleteAccountModal } from './DeleteAccountModal';
import { MicrosoftStoreIcon } from './MicrosoftStoreIcon';

interface DashboardProps {
  user: UserProfile;
  userRank: number | null;
  totalUsersCount: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, userRank, totalUsersCount }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);

  // Referral code redemption state
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [shareSuccessAlert, setShareSuccessAlert] = useState<string | null>(null);

  // Danger zone & account deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const currentMonthKey = getCurrentISTMonthKey();
  const currentMonthName = getCurrentISTMonthName(currentMonthKey);
  const referralCode = user.uniqueCode || user.referralCode || generateUserReferralCode(user.id);
  const shareMessageText = getShareMessage(referralCode);

  // Points earned specifically in current IST month vs Lifetime
  const currentMonthPoints = user.monthlyPoints?.[currentMonthKey] ?? (user.currentMonthKey === currentMonthKey ? (user.currentMonthPoints ?? user.points) : 0);
  const totalLifetimePoints = user.points || 0;

  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.65 },
        colors: ['#4F46E5', '#6366F1', '#10B981', '#F59E0B']
      });
    } catch {
      // safe fallback
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const copyFullShareMessage = () => {
    navigator.clipboard.writeText(shareMessageText);
    setCopiedMessage(true);
    setShareSuccessAlert('Share message with links & your code copied to clipboard!');
    setTimeout(() => setCopiedMessage(false), 2500);
    setTimeout(() => setShareSuccessAlert(null), 3500);
  };

  const copyStoreLink = () => {
    navigator.clipboard.writeText(MICROSOFT_STORE_URL);
    setCopiedLink(true);
    setShareSuccessAlert('Microsoft Store link copied!');
    setTimeout(() => setCopiedLink(false), 2500);
    setTimeout(() => setShareSuccessAlert(null), 3500);
  };

  const handleShareWhatsApp = () => {
    fireCelebration();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessageText)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramShare = () => {
    fireCelebration();
    const telegramUrl = `https://t.me/share/url?text=${encodeURIComponent(shareMessageText)}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    fireCelebration();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this amazing app',
          text: shareMessageText,
        });
        setShareSuccessAlert('Thank you for sharing with your community!');
        setTimeout(() => setShareSuccessAlert(null), 4000);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyFullShareMessage();
        }
      }
    } else {
      copyFullShareMessage();
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === user.name) {
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name: newName.trim(),
        updatedAt: serverTimestamp()
      });

      // Also update name in current month archive if present
      const monthlyDocRef = doc(db, 'monthly_leaderboard', currentMonthKey, 'users', user.id);
      await setDoc(monthlyDocRef, {
        name: newName.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => {});

      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update name:', err);
    } finally {
      setSavingName(false);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = friendCodeInput.trim().toUpperCase();

    setRedeemError(null);
    setRedeemSuccess(null);

    if (!cleanCode) {
      setRedeemError("Please enter your friend's referral code.");
      return;
    }

    // 1. Prevent self-redemption
    const myOwnCodes = [
      user.uniqueCode?.toUpperCase().trim(),
      user.referralCode?.toUpperCase().trim(),
      referralCode.toUpperCase().trim(),
      user.id.toUpperCase().trim(),
      `VA-${user.id.slice(0, 6).toUpperCase().trim()}`,
      generateUserReferralCode(user.id).toUpperCase().trim()
    ].filter(Boolean);

    if (myOwnCodes.includes(cleanCode)) {
      setRedeemError('You cannot use your own referral code.');
      return;
    }

    // 2. Prevent duplicate/repeated entry of the EXACT SAME referral code
    const alreadyRedeemedCodes = user.redeemedCodes || (user.redeemedCode ? [user.redeemedCode] : []);
    const isAlreadyRedeemed = alreadyRedeemedCodes.some(
      (c) => c.trim().toUpperCase() === cleanCode
    );

    if (isAlreadyRedeemed) {
      setRedeemError('You have already redeemed this code.');
      return;
    }

    setRedeeming(true);

    try {
      // 3. Find the Referrer in Firestore by uniqueCode or referralCode or doc ID
      const usersRef = collection(db, 'users');
      
      // Step A: Search for uniqueCode == cleanCode
      let querySnap = await getDocs(query(usersRef, where('uniqueCode', '==', cleanCode)));
      
      // Step B: If not found, search for referralCode == cleanCode
      if (querySnap.empty) {
        querySnap = await getDocs(query(usersRef, where('referralCode', '==', cleanCode)));
      }

      let referrerDocId: string | null = null;
      let referrerName = 'Your Friend';
      let referrerPhoto = '';
      let referrerEmail = '';
      let referrerExistingCode = cleanCode;

      if (!querySnap.empty) {
        const foundDoc = querySnap.docs[0];
        referrerDocId = foundDoc.id;
        const d = foundDoc.data();
        referrerName = d.name || 'Your Friend';
        referrerPhoto = d.photoURL || '';
        referrerEmail = d.email || '';
        referrerExistingCode = d.uniqueCode || d.referralCode || cleanCode;
      } else {
        // Step C: Fallback check by document ID directly
        const directDoc = await getDoc(doc(db, 'users', cleanCode));
        if (directDoc.exists()) {
          referrerDocId = directDoc.id;
          const d = directDoc.data();
          referrerName = d.name || 'Your Friend';
          referrerPhoto = d.photoURL || '';
          referrerEmail = d.email || '';
          referrerExistingCode = d.uniqueCode || d.referralCode || cleanCode;
        } else {
          // Step D: Scan all users for case-insensitivity or generated codes
          const allUsersSnap = await getDocs(usersRef);
          allUsersSnap.forEach((uDoc) => {
            if (referrerDocId) return;
            const uData = uDoc.data();
            const uUnique = (uData.uniqueCode || '').toUpperCase().trim();
            const uRef = (uData.referralCode || '').toUpperCase().trim();
            const uGen = generateUserReferralCode(uDoc.id).toUpperCase().trim();
            if (uUnique === cleanCode || uRef === cleanCode || uGen === cleanCode || uDoc.id.toUpperCase() === cleanCode) {
              referrerDocId = uDoc.id;
              referrerName = uData.name || 'Your Friend';
              referrerPhoto = uData.photoURL || '';
              referrerEmail = uData.email || '';
              referrerExistingCode = uData.uniqueCode || uData.referralCode || cleanCode;
            }
          });
        }
      }

      if (!referrerDocId) {
        setRedeemError('Referral code not found. Please double check the code with your friend.');
        setRedeeming(false);
        return;
      }

      if (referrerDocId === user.id) {
        setRedeemError('You cannot use your own referral code.');
        setRedeeming(false);
        return;
      }

      const activeISTMonth = getCurrentISTMonthKey();

      // 4. Update the REFERRER ONLY (+1 point to the referral code owner):
      // (a) Add +1 point & historical IST monthly record in referrer user document
      const referrerRef = doc(db, 'users', referrerDocId);
      await updateDoc(referrerRef, {
        points: increment(1),
        referralCount: increment(1),
        [`monthlyPoints.${activeISTMonth}`]: increment(1),
        currentMonthPoints: increment(1),
        currentMonthKey: activeISTMonth,
        uniqueCode: referrerExistingCode,
        referralCode: referrerExistingCode,
        updatedAt: serverTimestamp()
      });

      // (b) Write / Increment in the dedicated current IST month leaderboard archive
      const monthlyLeaderboardDocRef = doc(db, 'monthly_leaderboard', activeISTMonth, 'users', referrerDocId);
      await setDoc(monthlyLeaderboardDocRef, {
        id: referrerDocId,
        name: referrerName,
        email: referrerEmail,
        photoURL: referrerPhoto,
        referralCode: referrerExistingCode,
        uniqueCode: referrerExistingCode,
        points: increment(1),
        monthKey: activeISTMonth,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 5. Update the CURRENT USER:
      // Record this redeemed code in redeemedCodes and redeemedReferrals.
      // ZERO POINTS ARE ADDED TO THE CURRENT USER (logged-in user's score remains untouched).
      const currentUserRef = doc(db, 'users', user.id);
      await updateDoc(currentUserRef, {
        redeemedCode: cleanCode,
        referredBy: referrerDocId,
        referredByName: referrerName,
        redeemedCodes: arrayUnion(cleanCode),
        [`redeemedReferrals.${cleanCode}`]: {
          referrerId: referrerDocId,
          referrerName: referrerName,
          monthKey: activeISTMonth,
          redeemedAt: new Date().toISOString(),
        },
        redeemedMonthKey: activeISTMonth,
        redeemedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 6. Celebration & confirmation
      fireCelebration();
      setFriendCodeInput('');
      setRedeemSuccess(`🎉 Success! +1 point has been awarded to ${referrerName} for ${currentMonthName}! (Your own points remain unchanged)`);
    } catch (err: any) {
      console.error('Error redeeming code:', err);
      setRedeemError(err.message || 'Failed to redeem referral code. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      const activeISTMonth = getCurrentISTMonthKey();
      
      // 1. Delete user profile document from Firestore
      const userDocRef = doc(db, 'users', user.id);
      await deleteDoc(userDocRef);

      // 2. Delete monthly leaderboard entry if exists
      const monthlyDocRef = doc(db, 'monthly_leaderboard', activeISTMonth, 'users', user.id);
      await deleteDoc(monthlyDocRef).catch(() => {});

      // 3. Delete Firebase Auth user
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await deleteUser(currentUser);
        } catch (authErr: any) {
          console.warn('Firebase Auth user delete warning:', authErr);
          // If auth requires re-authentication, sign out to safely reset session
          await signOut(auth);
        }
      } else {
        await signOut(auth);
      }

      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Bento Card 1: Personal Score & Ranking (Monthly IST Tracking) */}
      <div 
        id="personal-stats-card"
        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-5"
      >
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <h2 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                {currentMonthName} Score
              </h2>
            </div>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={40}
                  className="rounded-lg border border-slate-300 px-2 py-0.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingName}
                  className="rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-indigo-700"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer" onClick={() => setIsEditingName(true)}>
                <span className="text-xs font-semibold text-slate-700">{user.name}</span>
                <Edit2 className="h-3 w-3 text-slate-400 ml-0.5" />
              </div>
            )}
          </div>
          
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p id="user-monthly-points" className="text-4xl sm:text-5xl font-black text-indigo-600 font-mono tracking-tight">
                {currentMonthPoints.toLocaleString()} <span className="text-lg font-medium text-slate-400 font-sans">pts</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-slate-500 font-medium">
                  {currentMonthPoints} {currentMonthPoints === 1 ? 'referral' : 'referrals'} this month
                </p>
                {totalLifetimePoints > currentMonthPoints && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({totalLifetimePoints} lifetime)
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                <Award className="h-3.5 w-3.5 text-indigo-600" />
                <span>{userRank ? `#${userRank} Rank` : 'Active'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span className="flex items-center gap-1 text-[11px]">
            <Clock className="h-3 w-3 text-indigo-500" />
            <span>Monthly leaderboard resets on the 1st of every month (IST).</span>
          </span>
        </div>
      </div>

      {/* Bento Card 2: Unique Referral Code & One-Tap WhatsApp / Telegram Share */}
      <div 
        id="unique-referral-card"
        className="bg-indigo-600 text-white border border-indigo-700 rounded-3xl p-6 shadow-lg shadow-indigo-200/50 flex flex-col justify-between gap-5"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest">
              Your Unique Referral Code
            </span>
            <span className="bg-indigo-500/60 border border-indigo-400/40 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md text-indigo-100">
              Active
            </span>
          </div>

          {/* Referral Code Display Box */}
          <div className="mt-2 bg-indigo-950/40 border border-indigo-400/30 rounded-2xl p-3 flex items-center justify-between gap-2">
            <span id="user-referral-code-display" className="font-mono text-xl sm:text-2xl font-black tracking-wider text-amber-300 select-all">
              {referralCode}
            </span>
            <button
              id="copy-referral-code-btn"
              type="button"
              onClick={copyReferralCode}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span className="text-emerald-200">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-indigo-200" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Share Message Live Preview */}
          <div className="mt-3 bg-indigo-950/30 border border-indigo-400/25 rounded-2xl p-3 text-[11px] text-indigo-100 leading-relaxed space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-300 border-b border-indigo-400/20 pb-1.5 mb-1.5">
              <span>English Share Message Format</span>
              <button
                type="button"
                onClick={copyFullShareMessage}
                className="hover:text-white flex items-center gap-1 text-[10px] lowercase cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? 'copied' : 'copy text'}</span>
              </button>
            </div>
            <p className="whitespace-pre-line font-mono text-[11px] text-slate-100/95 leading-normal">
              {shareMessageText}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Main WhatsApp Share Button with Pre-filled Message */}
          <button
            id="share-whatsapp-btn"
            onClick={handleShareWhatsApp}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 shrink-0" />
            <span>Share on WhatsApp</span>
          </button>

          {/* Secondary Share Actions: Telegram & Share App (Native) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="share-telegram-btn"
              onClick={handleTelegramShare}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-[0.99] py-2.5 px-3 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-white" />
              <span>Share on Telegram</span>
            </button>

            <button
              id="share-native-btn"
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-700/80 border border-indigo-500/50 py-2.5 px-3 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-200" />
              <span>Share App</span>
            </button>
          </div>

          <a
            id="open-microsoft-store-btn"
            href={MICROSOFT_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 active:scale-[0.99] py-2.5 px-3 text-xs font-bold transition-all shadow-sm"
          >
            <MicrosoftStoreIcon className="w-4 h-4" />
            <span>Open in Microsoft Store</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>

          <button
            id="copy-store-link-btn"
            onClick={copyStoreLink}
            className="w-full flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-indigo-200 hover:text-white transition-colors cursor-pointer"
          >
            <MicrosoftStoreIcon className="w-3.5 h-3.5 opacity-80" />
            {copiedLink ? (
              <>
                <CheckCheck className="h-3.5 w-3.5 text-emerald-300" />
                <span className="text-emerald-200">Microsoft Store Link Copied</span>
              </>
            ) : (
              <span>Copy Microsoft Store Link</span>
            )}
          </button>
        </div>

        {shareSuccessAlert && (
          <div className="rounded-xl bg-white/15 p-2.5 text-center text-xs font-medium text-white border border-white/20">
            {shareSuccessAlert}
          </div>
        )}
      </div>

      {/* Bento Card 3: Redeem / Paste Friend's Referral Code */}
      <div 
        id="redeem-code-card"
        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Have a Friend's Referral Code?
            </h3>
            <p className="text-xs text-slate-500">
              Credit <strong>+1 point</strong> to your friend for {currentMonthName}.
            </p>
          </div>
        </div>

        <form onSubmit={handleRedeemCode} className="space-y-3">
          <div>
            <div className="relative flex items-center">
              <input
                id="friend-referral-code-input"
                type="text"
                value={friendCodeInput}
                onChange={(e) => {
                  setFriendCodeInput(e.target.value.toUpperCase());
                  setRedeemError(null);
                  setRedeemSuccess(null);
                }}
                placeholder="e.g. VA-AB12CD"
                maxLength={25}
                disabled={redeeming}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:border-indigo-600 focus:bg-white focus:outline-none transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={redeeming || !friendCodeInput.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {redeeming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Redeem</span>
                    <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-tight">
              *Enter a friend's code to give them +1 point. You can redeem codes from multiple different friends!
            </p>
          </div>

          {redeemError && (
            <div 
              id="redeem-error-alert"
              className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{redeemError}</span>
            </div>
          )}

          {redeemSuccess && (
            <div 
              id="redeem-success-alert"
              className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 font-medium"
            >
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{redeemSuccess}</span>
            </div>
          )}

          {/* List of previously redeemed codes */}
          {((user.redeemedCodes && user.redeemedCodes.length > 0) || user.redeemedCode) && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1.5">
                <span>Codes you've supported ({user.redeemedCodes?.length || (user.redeemedCode ? 1 : 0)}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(user.redeemedCodes || (user.redeemedCode ? [user.redeemedCode] : [])).map((code) => {
                  const refData = user.redeemedReferrals?.[code];
                  return (
                    <span 
                      key={code}
                      className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 rounded-lg px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-900"
                    >
                      <CheckCheck className="h-3 w-3 text-emerald-600" />
                      <span>{code}</span>
                      {refData?.referrerName && (
                        <span className="font-sans font-normal text-emerald-700 text-[10px]">
                          ({refData.referrerName})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Bento Card 4: App Information & Notice */}
      <div 
        id="community-disclaimer-card"
        className="bg-slate-100 rounded-3xl p-5 border border-slate-200 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Community Guidelines
          </span>
          <a
            href={MICROSOFT_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-all"
          >
            <MicrosoftStoreIcon className="w-3.5 h-3.5" />
            <span>Microsoft Store</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>
        </div>

        <div 
          id="disclaimer-bento-note" 
          className="p-3 bg-amber-50/90 rounded-2xl text-[11px] leading-relaxed text-amber-950 border border-amber-200/80 font-medium flex items-start gap-2"
        >
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>This is a fun community leaderboard with no monetary rewards.</span>
        </div>
      </div>

      {/* Bento Card 5: Danger Zone */}
      <div 
        id="danger-zone-card"
        className="bg-rose-50/40 rounded-3xl p-5 border border-rose-200/80 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-widest">
              Danger Zone
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-600 leading-relaxed">
            Permanently delete your profile, ranking, referral code, and account data.
          </p>
          <button
            id="open-delete-account-modal-btn"
            type="button"
            onClick={() => {
              setDeleteError(null);
              setIsDeleteModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-rose-200 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingAccount) {
            setIsDeleteModalOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirmDelete={handleDeleteAccount}
        isDeleting={isDeletingAccount}
        errorMessage={deleteError}
      />
    </div>
  );
};
