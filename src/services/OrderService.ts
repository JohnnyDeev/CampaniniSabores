import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Order } from '../types';
import { toDate } from '../types';
import { addLoyaltyPoints } from './CustomerService';
import { createReceivable } from './FinanceService';

export async function getOrders(): Promise<Order[]> {
  const ref = collection(db, 'orders');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      orderNumber: data.orderNumber || 0,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      customerAddressStructured: data.customerAddressStructured,
      customerObs: data.customerObs || '',
      deliveryDate: data.deliveryDate?.toDate ? data.deliveryDate.toDate() : null,
      items: data.items || [],
      total: data.total || 0,
      subtotal: data.subtotal,
      status: data.status || 'novo',
      paid: data.paid ?? false,
      paidAt: data.paidAt,
      paymentMethod: data.paymentMethod,
      createdAt: data.createdAt,
      whatsappSent: data.whatsappSent ?? false,
      couponCode: data.couponCode,
      couponDiscount: data.couponDiscount,
      loyaltyPointsEarned: data.loyaltyPointsEarned,
    } as Order;
  });
}

export async function getOrderById(id: string): Promise<Order | null> {
  const ref = doc(db, 'orders', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    orderNumber: data.orderNumber || 0,
    customerId: data.customerId,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
    customerAddressStructured: data.customerAddressStructured,
    customerObs: data.customerObs || '',
    deliveryDate: data.deliveryDate?.toDate ? data.deliveryDate.toDate() : null,
    items: data.items || [],
    total: data.total || 0,
    subtotal: data.subtotal,
    status: data.status || 'novo',
    paid: data.paid ?? false,
    paidAt: data.paidAt,
    paymentMethod: data.paymentMethod,
    createdAt: data.createdAt,
    whatsappSent: data.whatsappSent ?? false,
    couponCode: data.couponCode,
    couponDiscount: data.couponDiscount,
    loyaltyPointsEarned: data.loyaltyPointsEarned,
  } as Order;
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  const ref = doc(db, 'orders', orderId);
  await updateDoc(ref, { status });
}

export async function getOrdersByCustomer(customerId: string): Promise<Order[]> {
  const ref = collection(db, 'orders');
  const q = query(
    ref,
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      orderNumber: data.orderNumber || 0,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      customerAddressStructured: data.customerAddressStructured,
      customerObs: data.customerObs || '',
      deliveryDate: data.deliveryDate?.toDate ? data.deliveryDate.toDate() : null,
      items: data.items || [],
      total: data.total || 0,
      subtotal: data.subtotal,
      status: data.status || 'novo',
      paid: data.paid ?? false,
      paidAt: data.paidAt,
      paymentMethod: data.paymentMethod,
      createdAt: data.createdAt,
      whatsappSent: data.whatsappSent ?? false,
      couponCode: data.couponCode,
      couponDiscount: data.couponDiscount,
      loyaltyPointsEarned: data.loyaltyPointsEarned,
    } as Order;
  }).slice(0, 20);
}

export async function getOrdersByDateRange(start: Date, end: Date): Promise<Order[]> {
  const ref = collection(db, 'orders');
  const q = query(
    ref,
    where('createdAt', '>=', start),
    where('createdAt', '<=', end),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      customerObs: data.customerObs || '',
      items: data.items || [],
      total: data.total || 0,
      status: data.status || 'novo',
      createdAt: data.createdAt,
      whatsappSent: data.whatsappSent ?? false,
    } as Order;
  });
}

export async function getOrderStats() {
  const orders = await getOrders();
  const paidOrders = orders.filter(o => o.paid);
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const newOrders = orders.filter(o => o.status === 'novo').length;
  const deliveredOrders = orders.filter(o => o.status === 'entregue').length;
  const producaoOrders = orders.filter(o => o.status === 'producao').length;
  const saiuOrders = orders.filter(o => o.status === 'saiu').length;

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    newOrders,
    deliveredOrders,
    producaoOrders,
    saiuOrders,
  };
}

export async function markOrderAsPaid(
  orderId: string,
  customerId: string,
  points: number,
  orderTotal: number,
  paymentMethod?: string
): Promise<void> {
  const ref = doc(db, 'orders', orderId);
  await updateDoc(ref, {
    paid: true,
    paidAt: serverTimestamp(),
    paymentMethod,
    loyaltyPointsEarned: points,
  });

  // Marcar conta a receber como paga
  try {
    const receivablesRef = collection(db, 'receivables');
    const q = query(receivablesRef, where('orderId', '==', orderId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const receivableDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'receivables', receivableDoc.id), {
        status: 'paid',
        paidAt: serverTimestamp(),
        paymentMethod,
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar conta a receber:', error);
    // Não lança erro para não quebrar o fluxo principal
  }

  if (customerId) {
    await addLoyaltyPoints(customerId, points, orderTotal);
  }
}
