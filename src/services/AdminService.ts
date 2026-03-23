import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

export interface Admin {
  id: string;
  email: string;
  addedAt: Date;
  isAdmin: boolean;
}

export async function checkIsAdmin(): Promise<boolean> {
  if (!auth.currentUser) return false;
  const ref = doc(db, 'admins', auth.currentUser.uid);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function getAllAdmins(): Promise<Admin[]> {
  try {
    const ref = collection(db, 'admins');
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || '',
        addedAt: data.addedAt?.toDate ? data.addedAt.toDate() : new Date(),
        isAdmin: data.isAdmin ?? true,
      } as Admin;
    });
  } catch (error) {
    console.error('Erro ao buscar admins:', error);
    return [];
  }
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

export async function getAdminCount(): Promise<number> {
  try {
    const ref = collection(db, 'admins');
    const snapshot = await getDocs(ref);
    return snapshot.docs.filter(doc => doc.data().isAdmin === true).length;
  } catch (error) {
    console.error('Erro ao contar admins:', error);
    return 0;
  }
}

export async function findUserByEmail(email: string): Promise<{ uid: string; email: string } | null> {
  try {
    // Firebase Admin SDK seria ideal, mas vamos usar uma abordagem alternativa
    // O cliente não pode buscar usuários por email diretamente
    // Vamos armazenar um mapeamento em uma coleção separada
    const ref = collection(db, 'admin_users');
    const q = query(ref, where('email', '==', email.toLowerCase().trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      uid: doc.id,
      email: doc.data().email,
    };
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
}

export async function createUserMapping(email: string, uid: string): Promise<void> {
  const ref = doc(db, 'admin_users', uid);
  await setDoc(ref, {
    email: email.toLowerCase().trim(),
    createdAt: new Date(),
  });
}
