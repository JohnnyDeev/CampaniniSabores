import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Reminder } from '../types';
import { toDate } from '../types';

export async function getReminders(): Promise<Reminder[]> {
  try {
    const ref = collection(db, 'reminders');
    // Tenta buscar com orderBy, se falhar busca sem ordenação
    let snapshot;
    try {
      const q = query(ref, orderBy('reminderDate', 'asc'));
      snapshot = await getDocs(q);
    } catch (indexError) {
      // Se não tiver índice, busca sem orderBy e ordena no cliente
      snapshot = await getDocs(ref);
    }

    const reminders = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || '',
        description: data.description || '',
        reminderDate: data.reminderDate,
        createdAt: data.createdAt,
        isRead: data.isRead ?? false,
        isCompleted: data.isCompleted ?? false,
      } as Reminder;
    });

    // Ordenar no cliente se necessário
    return reminders.sort((a, b) => {
      const dateA = toDate(a.reminderDate).getTime();
      const dateB = toDate(b.reminderDate).getTime();
      return dateA - dateB;
    });
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error);
    return [];
  }
}

export async function createReminder(data: {
  title: string;
  description: string;
  reminderDate: Date;
}): Promise<string> {
  try {
    const ref = collection(db, 'reminders');
    const docRef = await addDoc(ref, {
      title: data.title,
      description: data.description || '',
      reminderDate: data.reminderDate,
      isRead: false,
      isCompleted: false,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Erro ao criar lembrete:', error);
    throw new Error(error.message || 'Erro ao criar lembrete');
  }
}

export async function deleteReminder(reminderId: string): Promise<void> {
  try {
    const ref = doc(db, 'reminders', reminderId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Erro ao excluir lembrete:', error);
    throw new Error('Erro ao excluir lembrete');
  }
}

export async function markReminderAsRead(reminderId: string): Promise<void> {
  try {
    const ref = doc(db, 'reminders', reminderId);
    await updateDoc(ref, { isRead: true });
  } catch (error) {
    console.error('Erro ao marcar como lido:', error);
    throw new Error('Erro ao marcar lembrete como lido');
  }
}

export async function markReminderAsCompleted(reminderId: string): Promise<void> {
  try {
    const ref = doc(db, 'reminders', reminderId);
    await updateDoc(ref, { isCompleted: true });
  } catch (error) {
    console.error('Erro ao concluir lembrete:', error);
    throw new Error('Erro ao concluir lembrete');
  }
}

export async function markAllRemindersAsRead(): Promise<void> {
  try {
    const ref = collection(db, 'reminders');
    const q = query(ref);
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.isRead) {
        batch.update(docSnap.ref, { isRead: true });
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Erro ao marcar todos como lidos:', error);
    throw new Error('Erro ao marcar lembretes como lidos');
  }
}

export async function getPendingReminders(): Promise<Reminder[]> {
  const all = await getReminders();
  return all.filter(r => !r.isCompleted);
}
