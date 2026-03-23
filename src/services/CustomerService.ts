import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Customer, Address } from '../types';

export async function getCustomer(uid: string): Promise<Customer | null> {
  const ref = doc(db, 'customers', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    photo: data.photo || '',
    addresses: data.addresses || [],
    loyaltyPoints: data.loyaltyPoints || 0,
    totalSpent: data.totalSpent || 0,
    orderCount: data.orderCount || 0,
    createdAt: data.createdAt?.toDate() || new Date(),
    lastOrderAt: data.lastOrderAt?.toDate(),
  };
}

export async function createCustomer(
  uid: string,
  name: string,
  email: string,
  phone: string = ''
): Promise<Customer> {
  const ref = doc(db, 'customers', uid);
  const customer: Omit<Customer, 'id'> = {
    name,
    email,
    phone,
    addresses: [],
    loyaltyPoints: 0,
    totalSpent: 0,
    orderCount: 0,
    createdAt: new Date(),
  };
  await setDoc(ref, { ...customer, createdAt: serverTimestamp() });
  return { id: uid, ...customer };
}

export async function updateCustomer(
  uid: string,
  data: Partial<Omit<Customer, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, 'customers', uid);
  await updateDoc(ref, data);
}

export async function addAddress(uid: string, address: Omit<Address, 'id'>): Promise<void> {
  const customer = await getCustomer(uid);
  if (!customer) return;

  const newAddress: Address = {
    ...address,
    id: `addr_${Date.now()}`,
  };

  if (newAddress.isDefault) {
    customer.addresses.forEach(a => (a.isDefault = false));
  }

  const addresses = [...customer.addresses, newAddress];
  await updateDoc(doc(db, 'customers', uid), { addresses });
}

export async function updateAddress(uid: string, addressId: string, data: Partial<Address>): Promise<void> {
  const customer = await getCustomer(uid);
  if (!customer) return;

  const addresses = customer.addresses.map(a => {
    if (a.id === addressId) {
      if (data.isDefault) {
        a.isDefault = true;
      }
      return { ...a, ...data };
    }
    if (data.isDefault) {
      a.isDefault = false;
    }
    return a;
  });

  await updateDoc(doc(db, 'customers', uid), { addresses });
}

export async function removeAddress(uid: string, addressId: string): Promise<void> {
  const customer = await getCustomer(uid);
  if (!customer) return;

  const addresses = customer.addresses.filter(a => a.id !== addressId);
  await updateDoc(doc(db, 'customers', uid), { addresses });
}

export async function addLoyaltyPoints(
  uid: string,
  points: number,
  orderTotal: number
): Promise<void> {
  const ref = doc(db, 'customers', uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      loyaltyPoints: (snap.data().loyaltyPoints || 0) + points,
      totalSpent: (snap.data().totalSpent || 0) + orderTotal,
      orderCount: (snap.data().orderCount || 0) + 1,
      lastOrderAt: serverTimestamp(),
    });
  }
}

export async function deductLoyaltyPoints(uid: string, points: number): Promise<boolean> {
  const ref = doc(db, 'customers', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return false;
  const current = snap.data().loyaltyPoints || 0;
  if (current < points) return false;

  await updateDoc(ref, { loyaltyPoints: current - points });
  return true;
}
