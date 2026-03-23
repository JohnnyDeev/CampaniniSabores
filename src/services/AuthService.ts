import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import { auth } from '../firebase';

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  return result.user;
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export function formatAuthError(error: string): string {
  if (error.includes('user-not-found') || error.includes('wrong-password') || error.includes('invalid-credential')) {
    return 'Email ou senha incorretos.';
  }
  if (error.includes('email-already-in-use')) {
    return 'Este email já está cadastrado.';
  }
  if (error.includes('weak-password') || error.includes('password')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (error.includes('invalid-email')) {
    return 'Email inválido.';
  }
  if (error.includes('too-many-requests')) {
    return 'Muitas tentativas. Tente novamente mais tarde.';
  }
  return 'Erro ao fazer autenticação. Tente novamente.';
}
