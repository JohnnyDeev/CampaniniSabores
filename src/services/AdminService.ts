import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export async function checkIsAdmin(): Promise<boolean> {
  if (!auth.currentUser) return false;
  const ref = doc(db, 'admins', auth.currentUser.uid);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function addAdmin(uid: string, email: string): Promise<void> {
  const ref = doc(db, 'admins', uid);
  await setDoc(ref, {
    email,
    addedAt: new Date(),
    isAdmin: true,
  });
}

export async function removeAdmin(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'admins', uid));
}
