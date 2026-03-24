import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Rating } from '../types';

export async function getRatings(): Promise<Rating[]> {
  const ref = collection(db, 'ratings');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      productId: data.productId,
      score: data.score,
      comment: data.comment || '',
      userName: data.userName || 'Anônimo',
      userPhoto: data.userPhoto || '',
      createdAt: data.createdAt,
    } as Rating;
  });
}

export async function deleteRating(ratingId: string): Promise<void> {
  await deleteDoc(doc(db, 'ratings', ratingId));
}

export async function saveRating(rating: Omit<Rating, 'id'>): Promise<string> {
  const ref = collection(db, 'ratings');
  const docRef = await addDoc(ref, {
    ...rating,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
