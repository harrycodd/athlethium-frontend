import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserProfile, subscribeToUserProfile, createUserProfile, updateUserProfile, DEFAULT_PROFILE } from '@/lib/user-service';
import { deviceTimeZone } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        if (unsubProfile) unsubProfile();

        // Safety fallback timer in case offline / slow network
        const safetyTimer = setTimeout(() => {
          setLoading(false);
        }, 3000);

        unsubProfile = subscribeToUserProfile(currentUser.uid, async (p) => {
          clearTimeout(safetyTimer);
          if (p === null) {
            try {
              const newProfile = await createUserProfile(
                currentUser.uid,
                currentUser.email,
                currentUser.displayName || currentUser.email?.split('@')[0] || 'Athlete'
              );
              setProfile(newProfile);
            } catch (err) {
              console.error("Error creating initial profile:", err);
            }
          } else {
            setProfile(p);
            // Keep the athlete's time zone current so "today" matches their calendar day.
            const tz = deviceTimeZone();
            if (tz && p.timezone !== tz) {
              updateUserProfile(currentUser.uid, { timezone: tz }).catch((err) =>
                console.warn("Could not update time zone:", err)
              );
            }
          }
          setLoading(false);
        });
      } else {
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = undefined;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
