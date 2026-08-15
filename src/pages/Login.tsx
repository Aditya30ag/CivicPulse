import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, GitMerge, MapPin, Activity, ArrowRight, Loader2 } from 'lucide-react';
import Logo from '../components/ui/Logo';
import ThemeToggle from '../components/ui/ThemeToggle';

const FEATURE_POINTS = [
  { icon: MapPin, text: 'Report issues in under 60 seconds with AI assistance' },
  { icon: GitMerge, text: 'No more duplicate complaints — smart merging keeps it clean' },
  { icon: Activity, text: 'Follow every fix on a transparent, live progress timeline' },
  { icon: ShieldCheck, text: 'Community verification builds trust, one report at a time' },
];

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider || !db) {
      setError('Firebase is not configured yet. Please add your credentials to the environment variables.');
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
          points: 0,
          trustScore: 50,
          role: 'citizen',
          createdAt: serverTimestamp(),
        });
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Brand panel ── */}
      <div className="hidden lg:flex relative overflow-hidden bg-night text-white flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(60% 60% at 15% 10%, rgba(59,130,246,0.45) 0%, transparent 55%), radial-gradient(50% 50% at 90% 90%, rgba(45,212,191,0.35) 0%, transparent 55%)',
          }}
          aria-hidden="true"
        />
        <div className="relative z-10">
          <Logo dark />
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight">
            Your voice,
            <br />
            <span className="text-gradient">your city.</span>
          </h1>
          <p className="mt-4 text-white/60 max-w-md text-base leading-relaxed">
            Sign in to report civic issues, verify your neighbours' reports, and watch your neighbourhood improve.
          </p>

          <div className="mt-10 space-y-4 max-w-md">
            {FEATURE_POINTS.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-primary shrink-0">
                  <f.icon className="w-4 h-4" />
                </span>
                <p className="text-sm text-white/70">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/40">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Live · 38 wards connected
        </div>
      </div>

      {/* ── Sign-in panel ── */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8 bg-page relative">
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <div className="bg-card border border-line rounded-3xl shadow-pop overflow-hidden">
            <div className="px-8 pt-9 pb-6 border-b border-line">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">Welcome back</h2>
              <p className="mt-1.5 text-sm text-muted">
                Sign in to start reporting issues, verifying community reports, and tracking neighbourhood improvements.
              </p>
            </div>

            <div className="p-8 flex flex-col gap-5">
              {error && (
                <div className="rounded-xl bg-danger-soft border border-danger/25 text-danger p-3.5 text-sm leading-relaxed">
                  <p>{error}</p>
                  <p className="mt-1 text-xs opacity-70 font-mono">Domain: {window.location.hostname}</p>
                </div>
              )}

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="group relative w-full h-12 rounded-xl border border-line-strong bg-card flex items-center justify-center gap-3 text-sm font-semibold text-ink hover:border-primary hover:shadow-[0_8px_20px_-10px_rgba(37,99,235,0.4)] transition-all duration-150 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 text-[0.6875rem] uppercase tracking-widest text-faint font-semibold">
                <span className="h-px flex-1 bg-line" />
                Secure & free
                <span className="h-px flex-1 bg-line" />
              </div>

              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Back to home
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-faint">
            By continuing you agree to our{' '}
            <Link to="/terms" className="text-muted hover:text-primary underline underline-offset-2">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-muted hover:text-primary underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
