import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Receivable, Payable } from '../types';

// =====================
// CONTAS A RECEBER
// =====================

export async function getReceivables(): Promise<Receivable[]> {
  try {
    const ref = collection(db, 'receivables');
    const q = query(ref, orderBy('dueDate', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        amount: data.amount,
        dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(),
        paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : null,
        status: data.status,
        paymentMethod: data.paymentMethod,
        description: data.description,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      } as Receivable;
    });
  } catch (error) {
    console.error('Erro ao buscar contas a receber:', error);
    return [];
  }
}

export async function getReceivablesByCustomer(customerId: string): Promise<Receivable[]> {
  try {
    const ref = collection(db, 'receivables');
    const q = query(
      ref,
      where('customerId', '==', customerId),
      orderBy('dueDate', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        amount: data.amount,
        dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(),
        paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : null,
        status: data.status,
        paymentMethod: data.paymentMethod,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      } as Receivable;
    });
  } catch (error) {
    console.error('Erro ao buscar contas a receber do cliente:', error);
    return [];
  }
}

export async function createReceivable(data: {
  orderId: string;
  orderNumber: number;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  dueDate: Date;
  paymentMethod?: 'pix' | 'dinheiro' | 'cartao' | 'permuta' | 'outro';
  description?: string;
}): Promise<string> {
  try {
    const ref = collection(db, 'receivables');
    const docRef = await addDoc(ref, {
      ...data,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar conta a receber:', error);
    throw new Error('Erro ao criar conta a receber');
  }
}

export async function updateReceivableStatus(
  receivableId: string,
  status: Receivable['status'],
  paidAt?: Date
): Promise<void> {
  try {
    const ref = doc(db, 'receivables', receivableId);
    await updateDoc(ref, {
      status,
      paidAt: paidAt ? Timestamp.fromDate(paidAt) : null,
    });
  } catch (error) {
    console.error('Erro ao atualizar conta a receber:', error);
    throw new Error('Erro ao atualizar conta a receber');
  }
}

export async function markReceivableAsPaid(
  receivableId: string,
  paymentMethod?: string
): Promise<void> {
  try {
    const ref = doc(db, 'receivables', receivableId);
    await updateDoc(ref, {
      status: 'paid',
      paidAt: serverTimestamp(),
      paymentMethod,
    });
  } catch (error) {
    console.error('Erro ao marcar como pago:', error);
    throw new Error('Erro ao marcar conta como paga');
  }
}

// =====================
// CONTAS A PAGAR
// =====================

export async function getPayables(): Promise<Payable[]> {
  try {
    const ref = collection(db, 'payables');
    const q = query(ref, orderBy('dueDate', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        description: data.description,
        category: data.category,
        amount: data.amount,
        dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(),
        paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : null,
        status: data.status,
        supplier: data.supplier,
        notes: data.notes,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      } as Payable;
    });
  } catch (error) {
    console.error('Erro ao buscar contas a pagar:', error);
    return [];
  }
}

export async function createPayable(data: {
  description: string;
  category: 'ingredientes' | 'embalagem' | 'fixo' | 'variavel' | 'servicos' | 'outros';
  amount: number;
  dueDate: Date;
  supplier?: string;
  notes?: string;
}): Promise<string> {
  try {
    const ref = collection(db, 'payables');
    const docRef = await addDoc(ref, {
      ...data,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar conta a pagar:', error);
    throw new Error('Erro ao criar conta a pagar');
  }
}

export async function updatePayableStatus(
  payableId: string,
  status: Payable['status'],
  paidAt?: Date
): Promise<void> {
  try {
    const ref = doc(db, 'payables', payableId);
    await updateDoc(ref, {
      status,
      paidAt: paidAt ? Timestamp.fromDate(paidAt) : null,
    });
  } catch (error) {
    console.error('Erro ao atualizar conta a pagar:', error);
    throw new Error('Erro ao atualizar conta a pagar');
  }
}

export async function markPayableAsPaid(payableId: string): Promise<void> {
  try {
    const ref = doc(db, 'payables', payableId);
    await updateDoc(ref, {
      status: 'paid',
      paidAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Erro ao marcar como pago:', error);
    throw new Error('Erro ao marcar conta como paga');
  }
}

// =====================
// RELATÓRIOS FINANCEIROS
// =====================

export interface FinancialSummary {
  totalReceivable: number;
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  totalPayable: number;
  totalPaid: number;
  balance: number; // Recebido - Pago
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  try {
    const [receivables, payables] = await Promise.all([
      getReceivables(),
      getPayables()
    ]);
    
    const totalReceivable = receivables.reduce((sum, r) => sum + r.amount, 0);
    const totalReceived = receivables
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + r.amount, 0);
    const totalPending = receivables
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);
    const totalOverdue = receivables
      .filter(r => r.status === 'overdue')
      .reduce((sum, r) => sum + r.amount, 0);
    
    const totalPayable = payables.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = payables
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const balance = totalReceived - totalPaid;
    
    return {
      totalReceivable,
      totalReceived,
      totalPending,
      totalOverdue,
      totalPayable,
      totalPaid,
      balance,
    };
  } catch (error) {
    console.error('Erro ao buscar resumo financeiro:', error);
    return {
      totalReceivable: 0,
      totalReceived: 0,
      totalPending: 0,
      totalOverdue: 0,
      totalPayable: 0,
      totalPaid: 0,
      balance: 0,
    };
  }
}

export async function getReceivablesByPeriod(start: Date, end: Date): Promise<Receivable[]> {
  try {
    const all = await getReceivables();
    return all.filter(r => {
      const dueDate = r.dueDate;
      return dueDate >= start && dueDate <= end;
    });
  } catch (error) {
    console.error('Erro ao buscar contas a receber por período:', error);
    return [];
  }
}
