import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

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
      setError("Firebase is not configured yet. Please add your credentials to the environment variables.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const signedInUser = result.user;

      // Check if user document already exists
      const userRef = doc(db, 'users', signedInUser.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userRef, {
          name: signedInUser.displayName || '',
          email: signedInUser.email || '',
          photoURL: signedInUser.photoURL || '',
          points: 0,
          trustScore: 50,
          role: "citizen",
          createdAt: serverTimestamp()
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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--paper)' }}
    >
      <div
        className="max-w-md w-full overflow-hidden"
        style={{
          background: '#fff',
          border: '1px solid var(--paper-dim)',
          borderRadius: '3px',
          boxShadow: '0 4px 24px rgba(22,40,61,0.10)',
        }}
      >
        {/* Card header — blueprint grid dark surface */}
        <div
          className="px-8 py-10 text-center relative overflow-hidden bp-grid"
          style={{ borderBottom: '1px solid var(--grid)' }}
        >
          {/* Hazard glow in corner */}
          <div
            className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at top right, rgba(242,183,5,0.09) 0%, transparent 65%)',
            }}
          />
          
          {/* Survey crosshair decoration */}
          <div
            className="w-12 h-12 mx-auto mb-4 flex items-center justify-center relative z-10"
            style={{
              border: '2px solid rgba(242,183,5,0.4)',
              borderRadius: '50%',
              background: 'rgba(242,183,5,0.08)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="3" fill="var(--hazard)" />
              <line x1="12" y1="2" x2="12" y2="7" stroke="var(--hazard)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12" y2="22" stroke="var(--hazard)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="2" y1="12" x2="7" y2="12" stroke="var(--hazard)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="12" x2="22" y2="12" stroke="var(--hazard)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <h1
            className="relative z-10 uppercase tracking-wider"
            style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 900,
              fontSize: '2rem',
              color: 'white',
              letterSpacing: '0.06em',
            }}
          >
            Civic<span style={{ color: 'var(--hazard)' }}>Pulse</span>
          </h1>
          <p
            className="relative z-10 mt-1.5"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'rgba(238,241,236,0.55)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Municipal Issue Reporting System
          </p>
        </div>
        
        <div className="p-8 flex flex-col gap-5">
          <p
            className="text-center text-sm"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
          >
            Sign in to start reporting issues, voting on community priorities, and tracking neighborhood improvements.
          </p>
          
          {error && (
            <div
              className="p-3 text-sm text-center flex flex-col gap-1.5"
              style={{
                background: 'rgba(214,72,61,0.07)',
                border: '1px solid rgba(214,72,61,0.25)',
                borderRadius: '3px',
                color: 'var(--signal)',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              <p>{error}</p>
              <p
                className="text-xs"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(214,72,61,0.7)' }}
              >
                Domain: {window.location.hostname}
              </p>
            </div>
          )}

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-secondary w-full justify-center"
          >
            {loading ? (
              <div
                className="w-5 h-5 rounded-full border-2"
                style={{
                  borderColor: 'var(--paper-dim)',
                  borderTopColor: 'var(--ink)',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
