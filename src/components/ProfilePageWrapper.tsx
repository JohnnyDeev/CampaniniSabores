import { useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import ProfilePage from './ProfilePage';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function ProfilePageWrapper() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-[#C75B48]" />
      </div>
    );
  }

  if (!user) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <ProfilePage
      user={user}
      onBack={() => navigate('/', { replace: true })}
      onLogout={() => navigate('/', { replace: true })}
    />
  );
}
