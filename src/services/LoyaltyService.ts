import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Customer } from '../types';

export interface LoyaltyCustomer extends Customer {
  tier: string;
  tierColor: string;
  pointsToNextTier: number;
}

const LOYALTY_TIERS = [
  { min: 500, label: 'Ouro', color: 'text-yellow-600', bg: 'bg-yellow-100', discount: 25, nextMin: null },
  { min: 200, label: 'Prata', color: 'text-gray-500', bg: 'bg-gray-100', discount: 10, nextMin: 500 },
  { min: 100, label: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-100', discount: 5, nextMin: 200 },
];

function getTier(points: number) {
  return LOYALTY_TIERS.find(t => points >= t.min) || LOYALTY_TIERS[LOYALTY_TIERS.length - 1];
}

function getPointsToNextTier(points: number) {
  const current = LOYALTY_TIERS.find(t => points >= t.min);
  if (!current || !current.nextMin) return 0;
  return current.nextMin - points;
}

export async function getAllCustomers(): Promise<Customer[]> {
  const ref = collection(db, 'customers');
  const q = query(ref, orderBy('loyaltyPoints', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      photo: data.photo || '',
      addresses: data.addresses || [],
      loyaltyPoints: data.loyaltyPoints || 0,
      loyaltyPointsEarned: data.loyaltyPointsEarned || 0,
      totalSpent: data.totalSpent || 0,
      orderCount: data.orderCount || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastOrderAt: data.lastOrderAt?.toDate(),
    } as Customer;
  });
}

export function enrichCustomerWithLoyalty(customer: Customer): LoyaltyCustomer {
  const tier = getTier(customer.loyaltyPoints);
  return {
    ...customer,
    tier: tier.label,
    tierColor: tier.color,
    pointsToNextTier: getPointsToNextTier(customer.loyaltyPoints),
  };
}

export function getLoyaltyStats(customers: Customer[]) {
  const totalPointsIssued = customers.reduce((acc, c) => acc + (c.loyaltyPointsEarned || 0), 0);
  const totalPointsActive = customers.reduce((acc, c) => acc + c.loyaltyPoints, 0);
  const totalCustomers = customers.length;
  const customersWithPoints = customers.filter(c => c.loyaltyPoints > 0).length;
  const totalOrders = customers.reduce((acc, c) => acc + c.orderCount, 0);

  const tierCounts = {
    ouro: customers.filter(c => c.loyaltyPoints >= 500).length,
    prata: customers.filter(c => c.loyaltyPoints >= 200 && c.loyaltyPoints < 500).length,
    bronze: customers.filter(c => c.loyaltyPoints >= 100 && c.loyaltyPoints < 200).length,
  };

  const pointsNearReward = {
    toBronze: customers.filter(c => c.loyaltyPoints >= 50 && c.loyaltyPoints < 100).length,
    toPrata: customers.filter(c => c.loyaltyPoints >= 150 && c.loyaltyPoints < 200).length,
    toOuro: customers.filter(c => c.loyaltyPoints >= 400 && c.loyaltyPoints < 500).length,
  };

  return {
    totalPointsIssued,
    totalPointsActive,
    totalCustomers,
    customersWithPoints,
    totalOrders,
    tierCounts,
    pointsNearReward,
    avgPointsPerCustomer: totalCustomers > 0 ? Math.round(totalPointsActive / totalCustomers) : 0,
    avgOrdersPerCustomer: totalCustomers > 0 ? Math.round(totalOrders / totalCustomers) : 0,
  };
}

export function getRescueThresholds() {
  return LOYALTY_TIERS;
}
