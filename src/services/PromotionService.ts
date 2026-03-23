import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Promotion } from '../types';

export async function getPromotions(): Promise<Promotion[]> {
  const ref = collection(db, 'promotions');
  const snapshot = await getDocs(ref);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      description: data.description,
      type: data.type,
      items: data.items,
      comboPrice: data.comboPrice,
      discountType: data.discountType,
      discountValue: data.discountValue,
      applicableProducts: data.applicableProducts,
      active: data.active ?? true,
      startsAt: data.startsAt?.toDate ? data.startsAt.toDate() : null,
      expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : null,
      maxOrders: data.maxOrders,
      usedCount: data.usedCount || 0,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    } as Promotion;
  });
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
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    description: data.description,
    type: data.type,
    items: data.items,
    comboPrice: data.comboPrice,
    discountType: data.discountType,
    discountValue: data.discountValue,
    applicableProducts: data.applicableProducts,
    active: data.active ?? true,
    startsAt: data.startsAt?.toDate ? data.startsAt.toDate() : null,
    expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : null,
    maxOrders: data.maxOrders,
    usedCount: data.usedCount || 0,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
  } as Promotion;
}

export async function createPromotion(data: {
  name: string;
  description?: string;
  type: 'combo' | 'discount';
  items?: { productId: string; quantity: number }[];
  comboPrice?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  applicableProducts?: string[];
  startsAt?: Date;
  expiresAt?: Date;
  maxOrders?: number | null;
}): Promise<string> {
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
