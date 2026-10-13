/** Signup: each step is its own screen, so the back swipe returns to the previous step. */
/* eslint-disable @typescript-eslint/no-require-imports -- spying on the mocked expo-router module */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import SignupScreen from '@/app/(auth)/signup';
import { SignupDraftProvider, useSignupDraft } from '@/hooks/use-signup-draft';
import { mockRouter } from '../../test/setup';

const createUser = createUserWithEmailAndPassword as jest.Mock;
// Spy on the module object itself; an `import * as` copy would not reach the screen.
const atStep = (step?: string) =>
  jest.spyOn(require('expo-router'), 'useLocalSearchParams').mockReturnValue(step === undefined ? {} : { step });

// Lets a test see the shared draft after the screen changes it.
const onDraft = jest.fn();
const DraftProbe = () => {
  onDraft(useSignupDraft());
  return null;
};
const draft = (): ReturnType<typeof useSignupDraft> => onDraft.mock.lastCall[0];

const renderSignup = () =>
  render(
    <SignupDraftProvider>
      <DraftProbe />
      <SignupScreen />
    </SignupDraftProvider>
  );

afterEach(() => jest.restoreAllMocks());

it('moves to the next step as a new screen, keeping the email', async () => {
  atStep();
  await renderSignup();

  await fireEvent.changeText(screen.getByPlaceholderText('example@email.com'), 'rider@example.com');
  await fireEvent.press(screen.getByText('Next'));

  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(auth)/signup', params: { step: '1' } });
  expect(draft().email).toBe('rider@example.com');
});

it('Back on a later step goes back one screen, not to login', async () => {
  atStep('2');
  await renderSignup();

  await fireEvent.press(screen.getByText('Back'));

  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it('signs up on the last step with the answers from earlier steps', async () => {
  createUser.mockResolvedValue({ user: { uid: 'new-user' } });
  atStep('2');
  await renderSignup();
  await waitFor(() => expect(onDraft).toHaveBeenCalled());
  await act(() => {
    draft().setEmail(' rider@example.com ');
    draft().setPassword('secret123');
  });

  await fireEvent.changeText(screen.getByPlaceholderText('Confirm your password'), 'secret123');
  await fireEvent.press(screen.getByText('Sign Up'));

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/wizard'));
  expect(createUser).toHaveBeenCalledWith(expect.anything(), 'rider@example.com', 'secret123');
  expect(draft().password).toBe('');
});

it('forgets what was typed when leaving signup from the first step', async () => {
  atStep();
  const view = await renderSignup();
  await fireEvent.changeText(screen.getByPlaceholderText('example@email.com'), 'rider@example.com');

  view.rerender(
    <SignupDraftProvider>
      <DraftProbe />
    </SignupDraftProvider>
  );

  await waitFor(() => expect(draft().email).toBe(''));
});
