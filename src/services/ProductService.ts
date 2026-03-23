import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export async function getProducts() {
  try {
    const ref = collection(db, 'products');
    const q = query(ref, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
}
