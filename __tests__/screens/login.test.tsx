import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import LoginScreen from '@/app/(auth)/login';
import { fakeFirestore } from '../../test/fake-firestore';
import { mockRouter } from '../../test/setup';

const signIn = signInWithEmailAndPassword as jest.Mock;

const fillAndSubmit = async (email: string, password: string) => {
  await fireEvent.changeText(screen.getByPlaceholderText('example@email.com'), email);
  await fireEvent.changeText(screen.getByPlaceholderText('••••••••'), password);
  await fireEvent.press(screen.getByText('Sign In'));
};

it('a returning athlete lands on their plan', async () => {
  fakeFirestore.seed('users', 'u1', { uid: 'u1', wizardCompleted: true });
  signIn.mockResolvedValue({ user: { uid: 'u1' } });
  await render(<LoginScreen />);

  await fillAndSubmit('  rider@example.com ', 'secret');

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
  expect(signIn).toHaveBeenCalledWith(expect.anything(), 'rider@example.com', 'secret');
});

it('a new athlete is sent to onboarding', async () => {
  fakeFirestore.seed('users', 'u2', { uid: 'u2', wizardCompleted: false });
  signIn.mockResolvedValue({ user: { uid: 'u2' } });
  await render(<LoginScreen />);

  await fillAndSubmit('new@example.com', 'secret');

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/wizard'));
});

it('wrong credentials show a generic message and do not navigate', async () => {
  signIn.mockRejectedValue({ code: 'auth/invalid-credential' });
  await render(<LoginScreen />);

  await fillAndSubmit('rider@example.com', 'wrong');

  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Login Error', 'Incorrect username or password'));
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it('network failures ask the athlete to retry', async () => {
  signIn.mockRejectedValue({ code: 'auth/network-request-failed' });
  await render(<LoginScreen />);
  await fillAndSubmit('rider@example.com', 'pw');
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Login Error', 'Please try again later'));
});

it('empty fields are rejected before calling Firebase', async () => {
  await render(<LoginScreen />);
  await fireEvent.press(screen.getByText('Sign In'));
  expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
  expect(signIn).not.toHaveBeenCalled();
});
