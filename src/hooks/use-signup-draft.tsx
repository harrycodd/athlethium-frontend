import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * What the athlete has typed while signing up. Each signup step is its own screen (so the back
 * swipe returns to the previous step), so the answers live here, above the screens.
 */
interface SignupDraft {
  email: string;
  password: string;
  confirmPassword: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  reset: () => void;
}

const SignupDraftContext = createContext<SignupDraft | null>(null);

export function SignupDraftProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }, []);

  const value = useMemo(
    () => ({ email, password, confirmPassword, setEmail, setPassword, setConfirmPassword, reset }),
    [email, password, confirmPassword, reset]
  );

  return <SignupDraftContext.Provider value={value}>{children}</SignupDraftContext.Provider>;
}

export function useSignupDraft(): SignupDraft {
  const draft = useContext(SignupDraftContext);
  if (!draft) throw new Error('useSignupDraft must be used inside SignupDraftProvider');
  return draft;
}
