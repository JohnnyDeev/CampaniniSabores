import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

export interface Admin {
  id: string;
  email: string;
  addedAt: Date;
  isAdmin: boolean;
}

// Emails cadastrados como fallback inicial - serão removidos após migração
const LEGACY_ADMIN_EMAILS = ['jmszveeh@gmail.com', 'natcp93@gmail.com'];

export async function checkIsAdmin(): Promise<boolean> {
  if (!auth.currentUser) return false;

  // Verificação primária: coleção 'admins' no Firestore
  const ref = doc(db, 'admins', auth.currentUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return true;
  }

  // Fallback temporário: verificação por e-mail (legado)
  // Remove após confirmar que todos admins estão no Firestore
  if (auth.currentUser.email && LEGACY_ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase())) {
    // Migração automática: registra admin no Firestore
    await setDoc(ref, {
      email: auth.currentUser.email.toLowerCase(),
      addedAt: new Date(),
      isAdmin: true,
    });
    return true;
  }

  return false;
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

// Mapeamento email -> UID (opcional, para admin management)
export async function createUserMapping(email: string, uid: string): Promise<void> {
  const ref = doc(db, 'admin_users', uid);
  await setDoc(ref, {
    email: email.toLowerCase().trim(),
    createdAt: new Date(),
  });
}
