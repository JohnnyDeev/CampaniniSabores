export type FirebaseTimestamp = { toDate: () => Date };

export function toDate(date: FirebaseTimestamp | Date | undefined): Date {
  if (!date) return new Date();
  if ('toDate' in date) return date.toDate();
  return date;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  addresses: Address[];
  loyaltyPoints: number;
  loyaltyPointsEarned?: number;
  totalSpent: number;
  orderCount: number;
  createdAt: Date;
  lastOrderAt?: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  tags: string[];
  category: 'tradicional' | 'fit';
  active: boolean;
  createdAt?: FirebaseTimestamp | Date;
}

export interface Rating {
  id: string;
  productId: string;
  score: number;
  comment: string;
  userName: string;
  userPhoto: string;
  createdAt?: FirebaseTimestamp | Date;
}

export interface BagItem {
  productId: string;
  quantity: number;
  comboId?: string;
  comboItems?: { productId: string; quantity: number }[];
  comboPrice?: number;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress: string;
  customerAddressStructured?: Address;
  customerObs: string;
  items: BagItem[];
  total: number;
  status: 'novo' | 'producao' | 'saiu' | 'entregue';
  paid: boolean;
  paidAt?: FirebaseTimestamp | Date;
  createdAt: FirebaseTimestamp | Date;
  whatsappSent: boolean;
  couponCode?: string;
  couponDiscount?: number;
  loyaltyPointsEarned?: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  expiresAt: Date;
  maxUses: number | null;
  usedCount: number;
  perCustomerLimit: number;
  active: boolean;
  createdAt: Date;
}

export interface CouponUse {
  id: string;
  couponId: string;
  couponCode: string;
  customerId?: string;
  customerEmail?: string;
  orderId: string;
  discountApplied: number;
  usedAt: Date;
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: 'combo' | 'discount';
  items?: { productId: string; quantity: number }[];
  comboPrice?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  applicableProducts?: string[];
  active: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  maxOrders?: number;
  usedCount: number;
  createdAt: Date;
}

export interface ComboItem {
  productId: string;
  quantity: number;
}
