import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, GitMerge, MapPin, Activity, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import Logo from '../components/ui/Logo';
import ThemeToggle from '../components/ui/ThemeToggle';

const FEATURE_POINTS = [
  { code: 'AI·PERCEPTION', title: 'Multimodal Triage', desc: 'Photos classified in <60 seconds with Gemini computer vision.' },
  { code: 'DEDUP·GRAPH', title: 'Smart Merging', desc: 'Duplicate neighborhood hazards aggregated automatically.' },
  { code: 'TRACE·LIVE', title: 'Transparent Timeline', desc: 'Municipal work orders visible to the community in real time.' },
  { code: 'TRUST·PROOF', title: 'Citizen Verification', desc: 'Consensus voting guarantees authentic resolution before closing.' },
];

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider || !db) {
      setError('Firebase configuration is pending. Sign in will activate once environment variables are set.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const signedInUser = result.user;

      const userRef = doc(db, 'users', signedInUser.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: signedInUser.displayName || '',
          email: signedInUser.email || '',
          photoURL: signedInUser.photoURL || '',
          points: 100,
          trustScore: 85,
          role: 'citizen',
          createdAt: serverTimestamp(),
        });
      }

      navigate('/home', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#0A0A0A] text-white">
      {/* ── Left Editorial Brand Panel (7 cols) ── */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-12 lg:p-16 border-r-2 border-[#222222] bg-[#0E0E0E] overflow-hidden">
        {/* Subtle grid and ambient gradient */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#262626 1px, transparent 1px), linear-gradient(to right, #262626 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        <div
          className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative z-10 flex items-center justify-between">
          <Logo />
          <span className="font-mono text-[0.625rem] text-white/50 tracking-[0.15em] uppercase px-2.5 py-1 bg-[#161616] border border-[#262626] rounded-[2px]">
            SYSTEM·STABLE · NCR/DELHI
          </span>
        </div>

        <div className="relative z-10 my-auto py-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 mb-6 bg-blue-500/10 border border-blue-500/20 rounded-[2px] font-mono text-[0.6875rem] text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 live-dot" />
            LIVE CIVIC GOVERNANCE
          </div>

          <h1 className="font-serif text-5xl xl:text-6xl text-white font-normal leading-[1.08] tracking-[-0.02em]">
            Your voice, <br />
            <span className="italic text-white/90">the city's pulse.</span>
          </h1>

          <p className="mt-6 text-white/60 text-base leading-relaxed font-sans font-light">
            CivicPulse connects verified neighborhood reporting directly to municipal dispatch teams with real-time multi-agent triage and public verification.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            {FEATURE_POINTS.map((f) => (
              <div
                key={f.code}
                className="p-4 bg-[#141414] border border-[#222222] rounded-[4px] hover:border-[#333333] transition-colors"
              >
                <span className="font-mono text-[0.625rem] text-blue-400 tracking-wider uppercase block mb-1">
                  {f.code}
                </span>
                <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
                <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-[#222222] flex items-center justify-between font-mono text-[0.6875rem] text-white/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot" />
            <span>280 WARDS CONNECTED · LATENCY &lt;240MS</span>
          </div>
          <span>EDITION 2026.4</span>
        </div>
      </div>

      {/* ── Right Sign-In Panel (5 cols) ── */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-12 relative bg-[#0A0A0A]">
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <div className="bg-[#111111] border-2 border-[#222222] rounded-[4px] p-8 sm:p-10">
            <div className="pb-6 border-b border-[#222222]">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-mono text-[0.6875rem] text-white/50 uppercase tracking-[0.1em]">
                  AUTHENTICATION GATEWAY
                </span>
              </div>
              <h2 className="font-serif text-3xl text-white font-normal tracking-[-0.01em]">
                Enter Portal
              </h2>
              <p className="mt-2 text-xs text-white/60 font-sans leading-relaxed">
                Sign in using your Google account to report civic issues, vote on verifications, and track repair dispatches.
              </p>
            </div>

            <div className="pt-6 space-y-5">
              {error && (
                <div className="rounded-[2px] bg-red-950/40 border border-red-500/30 text-red-300 p-3.5 text-xs font-mono leading-relaxed">
                  <p className="font-bold text-red-400 mb-1">SIGN IN NOTICE</p>
                  <p>{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 rounded-[2px] bg-white text-black hover:bg-neutral-200 font-mono text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-3 transition-all duration-150 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-800" />
                    AUTHENTICATING…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    CONTINUE WITH GOOGLE
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 font-mono text-[0.625rem] uppercase tracking-widest text-white/40">
                <span className="h-[1px] flex-1 bg-[#222222]" />
                END-TO-END SECURE
                <span className="h-[1px] flex-1 bg-[#222222]" />
              </div>

              <div className="p-3.5 bg-[#161616] border border-[#262626] rounded-[2px] font-mono text-[0.6875rem] text-white/60 space-y-1">
                <div className="flex items-center gap-2 text-white/80">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Verified Citizen Digital Identity</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Direct Escalation to Municipal Wards</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Link
                  to="/home"
                  className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] text-blue-400 hover:text-blue-300 uppercase tracking-wider transition-colors"
                >
                  Explore Dashboard As Guest <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center font-mono text-[0.6875rem] text-white/40">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="text-white/70 hover:text-white underline underline-offset-4">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-white/70 hover:text-white underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

