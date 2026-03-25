import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Promotion, FirebaseTimestamp } from '../types';

function toDate(date: FirebaseTimestamp | Date | undefined | null): Date | undefined {
  if (!date) return undefined;
  if ('toDate' in date) return date.toDate();
  return date as Date;
}

function mapPromotion(id: string, data: any): Promotion {
  return {
    id,
    name: data.name,
    description: data.description,
    type: data.type,
    items: data.items,
    comboPrice: data.comboPrice,
    discountType: data.discountType,
    discountValue: data.discountValue,
    applicableProducts: data.applicableProducts,
    active: data.active ?? true,
    startsAt: toDate(data.startsAt),
    expiresAt: toDate(data.expiresAt),
    maxOrders: data.maxOrders,
    usedCount: data.usedCount || 0,
    createdAt: toDate(data.createdAt) || new Date(),
  };
}

export async function getPromotions(): Promise<Promotion[]> {
  const ref = collection(db, 'promotions');
  const snapshot = await getDocs(ref);
  return snapshot.docs.map(d => mapPromotion(d.id, d.data()));
}

export async function getActivePromotions(): Promise<Promotion[]> {
  const all = await getPromotions();
  const now = new Date();
  return all.filter(p => {
    if (!p.active) return false;
    if (p.startsAt && p.startsAt > now) return false;
    if (p.expiresAt && p.expiresAt < now) return false;
    if (p.maxOrders !== undefined && p.usedCount >= p.maxOrders) return false;
    return true;
  });
}

export async function getPromotionById(id: string): Promise<Promotion | null> {
  const ref = doc(db, 'promotions', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapPromotion(snap.id, snap.data());
}

export async function createPromotion(data: Omit<Promotion, 'id' | 'createdAt' | 'usedCount' | 'active'>): Promise<string> {
  const ref = collection(db, 'promotions');
  const docRef = await addDoc(ref, {
    ...data,
    usedCount: 0,
    active: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePromotion(
  promoId: string,
  data: Partial<Omit<Promotion, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, 'promotions', promoId);
  await updateDoc(ref, data);
}

export async function deletePromotion(promoId: string): Promise<void> {
  const ref = doc(db, 'promotions', promoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  // Soft delete
  await updateDoc(ref, { active: false });
}

export async function recordPromotionUse(promoId: string): Promise<void> {
  const ref = doc(db, 'promotions', promoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data();
  await updateDoc(ref, {
    usedCount: (current.usedCount || 0) + 1,
  });
}
