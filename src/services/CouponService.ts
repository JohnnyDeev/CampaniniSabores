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
import type { Coupon, CouponUse } from '../types';

export async function getCoupons(): Promise<Coupon[]> {
  const ref = collection(db, 'coupons');
  const snapshot = await getDocs(ref);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      code: data.code,
      type: data.type,
      value: data.value,
      minOrderValue: data.minOrderValue,
      maxDiscount: data.maxDiscount,
      expiresAt: data.expiresAt?.toDate() || new Date(),
      maxUses: data.maxUses,
      usedCount: data.usedCount || 0,
      perCustomerLimit: data.perCustomerLimit || 1,
      active: data.active ?? true,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as Coupon;
  });
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const ref = collection(db, 'coupons');
  const q = query(ref, where('code', '==', code.toUpperCase().trim()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  const data = d.data();
  return {
    id: d.id,
    code: data.code,
    type: data.type,
    value: data.value,
    minOrderValue: data.minOrderValue,
    maxDiscount: data.maxDiscount,
    expiresAt: data.expiresAt?.toDate() || new Date(),
    maxUses: data.maxUses,
    usedCount: data.usedCount || 0,
    perCustomerLimit: data.perCustomerLimit || 1,
    active: data.active ?? true,
    createdAt: data.createdAt?.toDate() || new Date(),
  } as Coupon;
}

export async function getCouponUses(couponId?: string): Promise<CouponUse[]> {
  const ref = collection(db, 'couponUses');
  const snapshot = couponId
    ? await getDocs(query(ref, where('couponId', '==', couponId)))
    : await getDocs(ref);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      couponId: data.couponId,
      couponCode: data.couponCode,
      customerId: data.customerId,
      customerEmail: data.customerEmail,
      orderId: data.orderId,
      discountApplied: data.discountApplied,
      usedAt: data.usedAt?.toDate() || new Date(),
    } as CouponUse;
  });
}

export interface CouponValidation {
  valid: boolean;
  error?: string;
  discount?: number;
  coupon?: Coupon;
}

export async function validateCoupon(
  code: string,
  orderTotal: number,
  customerId?: string,
  customerEmail?: string
): Promise<CouponValidation> {
  if (!code.trim()) {
    return { valid: false, error: 'Digite um código de cupom.' };
  }

  const coupon = await getCouponByCode(code);

  if (!coupon) {
    return { valid: false, error: 'Cupom não encontrado.' };
  }

  if (!coupon.active) {
    return { valid: false, error: 'Este cupom está desativado.' };
  }

  const now = new Date();
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { valid: false, error: 'Este cupom expirou.' };
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: 'Limite de usos deste cupom foi atingido.' };
  }

  if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
    return {
      valid: false,
      error: `Pedido mínimo de R$ ${coupon.minOrderValue.toFixed(2)} para usar este cupom.`
    };
  }

  if (customerId || customerEmail) {
    const uses = await getCouponUses(coupon.id);
    const customerUses = uses.filter(u =>
      (customerId && u.customerId === customerId) ||
      (customerEmail && u.customerEmail === customerEmail)
    );
    if (coupon.perCustomerLimit && customerUses.length >= coupon.perCustomerLimit) {
      return { valid: false, error: 'Você já usou este cupom o número máximo de vezes.' };
    }
  }

  let discount: number;
  if (coupon.type === 'percentage') {
    discount = (orderTotal * coupon.value) / 100;
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = coupon.value;
  }

  discount = Math.min(discount, orderTotal);

  return { valid: true, discount, coupon };
}

export async function createCoupon(data: {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  expiresAt: Date;
  maxUses: number | null;
  perCustomerLimit: number;
}): Promise<string> {
  const ref = collection(db, 'coupons');
  const docRef = await addDoc(ref, {
    ...data,
    code: data.code.toUpperCase().trim(),
    usedCount: 0,
    active: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCoupon(
  couponId: string,
  data: Partial<Omit<Coupon, 'id' | 'code' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, 'coupons', couponId);
  await updateDoc(ref, data);
}

export async function recordCouponUse(
  couponId: string,
  couponCode: string,
  orderId: string,
  discountApplied: number,
  customerId?: string,
  customerEmail?: string
): Promise<void> {
  await addDoc(collection(db, 'couponUses'), {
    couponId,
    couponCode,
    orderId,
    discountApplied,
    customerId: customerId || null,
    customerEmail: customerEmail || null,
    usedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'coupons', couponId), {
    usedCount: (await (await getDoc(doc(db, 'coupons', couponId))).data())!.usedCount + 1,
  });
}
