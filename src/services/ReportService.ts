import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Order, Product } from '../types';
import { toDate } from '../types';

export interface SalesData {
  date: string;
  total: number;
  orders: number;
}

export interface ProductSales {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  image?: string;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

export interface ReportStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  avgTicket: number;
  highestOrder: number;
  highestOrderDate?: string;
  bestDay: string;
  bestDayRevenue: number;
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export function getDateRange(range: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return { start: today, end: now, label: 'Hoje' };

    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: today,
        label: 'Ontem'
      };

    case 'last7days':
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return {
        start: sevenDaysAgo,
        end: now,
        label: 'Últimos 7 dias'
      };

    case 'last30days':
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        start: thirtyDaysAgo,
        end: now,
        label: 'Últimos 30 dias'
      };

    case 'thisMonth':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: monthStart,
        end: now,
        label: 'Este mês'
      };

    case 'lastMonth':
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: lastMonthStart,
        end: lastMonthEnd,
        label: 'Mês passado'
      };

    case 'thisYear':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return {
        start: yearStart,
        end: now,
        label: 'Este ano'
      };

    default:
      return { start: today, end: now, label: 'Hoje' };
  }
}

export async function getOrdersByDateRange(start: Date, end: Date): Promise<Order[]> {
  try {
    const ref = collection(db, 'orders');
    const q = query(
      ref,
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const orders: Order[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        customerId: data.customerId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        customerAddressStructured: data.customerAddressStructured,
        customerObs: data.customerObs || '',
        items: data.items || [],
        total: data.total || 0,
        subtotal: data.subtotal,
        status: data.status || 'novo',
        paid: data.paid ?? false,
        paidAt: data.paidAt,
        createdAt: data.createdAt,
        whatsappSent: data.whatsappSent ?? false,
        couponCode: data.couponCode,
        couponDiscount: data.couponDiscount,
        loyaltyPointsEarned: data.loyaltyPointsEarned,
      } as Order;
    });

    // Filtrar por data no cliente (já que o Firestore não suporta range em timestamp facilmente)
    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();

    return orders.filter(order => {
      const orderDate = toDate(order.createdAt).getTime();
      return orderDate >= startTimestamp && orderDate <= endTimestamp;
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos por período:', error);
    return [];
  }
}

export async function getSalesByDateRange(start: Date, end: Date): Promise<SalesData[]> {
  const orders = await getOrdersByDateRange(start, end);
  const paidOrders = orders.filter(o => o.paid);

  // Agrupar por data
  const salesMap = new Map<string, SalesData>();

  // Criar array de datas no período
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    salesMap.set(dateKey, {
      date: dateKey,
      total: 0,
      orders: 0
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Preencher com dados reais
  paidOrders.forEach(order => {
    const orderDate = toDate(order.createdAt);
    const dateKey = orderDate.toISOString().split('T')[0];

    const existing = salesMap.get(dateKey);
    if (existing) {
      existing.total += order.total || 0;
      existing.orders += 1;
    }
  });

  return Array.from(salesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTopProducts(start: Date, end: Date, limit: number = 10): Promise<ProductSales[]> {
  const orders = await getOrdersByDateRange(start, end);
  const paidOrders = orders.filter(o => o.paid);

  // Buscar produtos para obter nomes
  const productsRef = collection(db, 'products');
  const productsSnapshot = await getDocs(productsRef);
  const productsMap = new Map<string, { name: string; image?: string }>();

  productsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    productsMap.set(doc.id, {
      name: data.name || 'Produto',
      image: data.image
    });
  });

  // Agrupar vendas por produto
  const productSalesMap = new Map<string, ProductSales>();

  paidOrders.forEach(order => {
    order.items.forEach(item => {
      const productId = item.productId;
      const quantity = item.quantity || 1;

      const productInfo = productsMap.get(productId);
      const productName = productInfo?.name || 'Produto';
      const image = productInfo?.image;

      // Calcular preço do item (proporcional ao total do pedido)
      const totalItems = order.items.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0);
      const productPrice = order.total / totalItems;
      const revenue = productPrice * quantity;

      const existing = productSalesMap.get(productId);
      if (existing) {
        existing.quantity += quantity;
        existing.revenue += revenue;
      } else {
        productSalesMap.set(productId, {
          productId,
          productName,
          quantity,
          revenue,
          image
        });
      }
    });
  });

  // Ordenar por quantidade vendida e retornar top N
  return Array.from(productSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export async function getMonthlyRevenue(year: number): Promise<MonthlyRevenue[]> {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);

  const orders = await getOrdersByDateRange(start, end);
  const paidOrders = orders.filter(o => o.paid);

  // Inicializar todos os meses
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(year, i, 1).toLocaleString('pt-BR', { month: 'short' }),
    revenue: 0,
    orders: 0
  }));

  // Preencher com dados reais
  paidOrders.forEach(order => {
    const orderDate = toDate(order.createdAt);
    const monthIndex = orderDate.getMonth();

    months[monthIndex].revenue += order.total || 0;
    months[monthIndex].orders += 1;
  });

  return months;
}

export async function getReportStats(start: Date, end: Date): Promise<ReportStats> {
  const orders = await getOrdersByDateRange(start, end);
  const paidOrders = orders.filter(o => o.paid);

  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = paidOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Encontrar pedido de maior valor
  let highestOrder = 0;
  let highestOrderDate: string | undefined;

  paidOrders.forEach(order => {
    if (order.total > highestOrder) {
      highestOrder = order.total;
      const orderDate = toDate(order.createdAt);
      highestOrderDate = orderDate.toLocaleDateString('pt-BR');
    }
  });

  // Encontrar dia de maior venda
  const salesByDate = await getSalesByDateRange(start, end);
  let bestDay = '';
  let bestDayRevenue = 0;

  salesByDate.forEach(day => {
    if (day.total > bestDayRevenue) {
      bestDay = new Date(day.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
      });
      bestDayRevenue = day.total;
    }
  });

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    avgTicket: avgOrderValue,
    highestOrder,
    highestOrderDate,
    bestDay,
    bestDayRevenue
  };
}

export async function getOrderStatsDetailed(): Promise<{
  newOrders: number;
  productionOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  pendingPayment: number;
  paidOrders: number;
}> {
  const ref = collection(db, 'orders');
  const snapshot = await getDocs(ref);

  const orders = snapshot.docs.map(doc => doc.data());

  return {
    newOrders: orders.filter(o => o.status === 'novo').length,
    productionOrders: orders.filter(o => o.status === 'producao').length,
    shippedOrders: orders.filter(o => o.status === 'saiu').length,
    deliveredOrders: orders.filter(o => o.status === 'entregue').length,
    pendingPayment: orders.filter(o => !o.paid).length,
    paidOrders: orders.filter(o => o.paid).length
  };
}

export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    alert('Nenhum dado para exportar');
    return;
  }

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escapar valores com vírgulas ou aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}
