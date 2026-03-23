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
  tags?: string[]; // Tags para segmentação (ex: 'handebol', 'imcd', 'vip')
  source?: string; // Origem principal do cliente
  createdAt: Date;
  lastOrderAt?: Date;
}

export interface Product {
  id: string;
  code?: string; // Código numérico do produto (ex: '01', '02')
  name: string;
  description: string;
  price: number;
  image?: string;
  tags: string[];
  category: 'tradicional' | 'fit';
  active: boolean;
  operationalStatus?: 'ativo' | 'pausado' | 'descontinuado'; // Status operacional
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
  orderNumber: number; // Número sequencial do pedido
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress: string;
  customerAddressStructured?: Address;
  customerObs: string;
  deliveryDate?: Date; // Data específica de entrega
  items: BagItem[];
  total: number;
  status: 'novo' | 'producao' | 'saiu' | 'entregue';
  paid: boolean;
  paidAt?: FirebaseTimestamp | Date;
  paymentMethod?: 'pix' | 'dinheiro' | 'cartao' | 'permuta' | 'outro'; // Forma de pagamento
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

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminderDate: FirebaseTimestamp | Date;
  createdAt: FirebaseTimestamp | Date;
  isRead: boolean;
  isCompleted: boolean;
}

// =====================
// FINANCEIRO
// =====================

export interface Receivable {
  id: string;
  orderId: string;
  orderNumber: number;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  dueDate: Date;
  paidAt?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: 'pix' | 'dinheiro' | 'cartao' | 'permuta' | 'outro';
  description?: string;
  createdAt: Date;
}

export interface Payable {
  id: string;
  description: string;
  category: 'ingredientes' | 'embalagem' | 'fixo' | 'variavel' | 'servicos' | 'outros';
  amount: number;
  dueDate: Date;
  paidAt?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  supplier?: string; // Fornecedor
  notes?: string;
  createdAt: Date;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  color?: string; // Cor para visualização
  type: 'fixo' | 'variavel';
}

// =====================
// FICHA TÉCNICA / CUSTOS
// =====================

export type IngredientUnit = 'g' | 'kg' | 'ml' | 'L' | 'unidade' | 'pacote' | 'saco';

export interface Ingredient {
  id: string;
  name: string;
  category: 'farinha' | 'carne' | 'queijo' | 'tempero' | 'bebida' | 'embalagem' | 'outros';
  purchaseUnit: IngredientUnit; // Unidade de compra (kg, L, etc.)
  purchasePrice: number; // Preço pago na compra
  purchaseQuantity: number; // Quantidade na embalagem comprada
  currentStock: number; // Estoque atual
  stockUnit: IngredientUnit; // Unidade do estoque (pode ser diferente da compra)
  minStock: number; // Estoque mínimo para alerta
  supplier?: string; // Fornecedor
  lastPurchaseDate?: Date;
  createdAt: Date;
}

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
  cost: number; // Custo calculado (quantity * custo unitário)
}

export interface ProductRecipe {
  id: string;
  productId: string;
  productName: string;
  ingredients: RecipeIngredient[];
  totalCost: number; // Soma de todos os ingredientes
  yield: number; // Quantas unidades a receita rende (ex: 40 esfihas)
  costPerUnit: number; // Custo por unidade (totalCost / yield)
  salePrice: number; // Preço de venda
  profitMargin: number; // Margem de lucro em porcentagem
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: 'entrada' | 'saida' | 'ajuste' | 'perda';
  quantity: number;
  unit: IngredientUnit;
  reason?: string; // Motivo do movimento
  orderId?: string; // Se for saída por produção
  createdAt: Date;
  createdBy?: string; // UID de quem fez o movimento
}

export interface ShoppingListItem {
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  unit: IngredientUnit;
  inStock: number;
  toBuy: number; // requiredQuantity - inStock
  estimatedCost: number;
  supplier?: string;
}
