import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';

export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !db) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    getDoc(userRef)
      .then((snap) => {
        setIsAdmin(snap.exists() && snap.data().role === 'admin');
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  return { isAdmin, loading };
}
