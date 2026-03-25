import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Ingredient, StockMovement, ShoppingListItem } from '../types';

// =====================
// INGREDIENTES
// =====================

export async function getIngredients(): Promise<Ingredient[]> {
  try {
    const ref = collection(db, 'ingredients');
    const q = query(ref, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        purchaseUnit: data.purchaseUnit,
        purchasePrice: data.purchasePrice,
        purchaseQuantity: data.purchaseQuantity,
        tacoFoodId: data.tacoFoodId,
        kcalPer100g: data.kcalPer100g,
        lastPurchaseDate: data.lastPurchaseDate?.toDate ? data.lastPurchaseDate.toDate() : null,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      } as Ingredient;
    });
  } catch (error) {
    console.error('Erro ao buscar ingredientes:', error);
    return [];
  }
}

export async function getIngredientById(id: string): Promise<Ingredient | null> {
  try {
    const ref = doc(db, 'ingredients', id);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) return null;
    
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      purchaseUnit: data.purchaseUnit,
      purchasePrice: data.purchasePrice,
      purchaseQuantity: data.purchaseQuantity,
      tacoFoodId: data.tacoFoodId,
      kcalPer100g: data.kcalPer100g,
      lastPurchaseDate: data.lastPurchaseDate?.toDate ? data.lastPurchaseDate.toDate() : null,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    } as Ingredient;
  } catch (error) {
    console.error('Erro ao buscar ingrediente:', error);
    return null;
  }
}

export async function createIngredient(data: {
  name: string;
  purchaseUnit: Ingredient['purchaseUnit'];
  purchasePrice: number;
  purchaseQuantity: number;
  tacoFoodId?: number;
  kcalPer100g?: number;
}): Promise<string> {
  try {
    const ref = collection(db, 'ingredients');

    // Sanitiza campos opcionais e garante tipos numéricos
    const sanitized: Record<string, any> = {
      name: data.name,
      purchaseUnit: data.purchaseUnit,
      purchasePrice: Number(data.purchasePrice),
      purchaseQuantity: Number(data.purchaseQuantity),
      createdAt: serverTimestamp(),
    };
    if (data.tacoFoodId != null) sanitized.tacoFoodId = Number(data.tacoFoodId);
    if (data.kcalPer100g != null) sanitized.kcalPer100g = Number(data.kcalPer100g);

    const docRef = await addDoc(ref, sanitized);
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar ingrediente:', error);
    throw new Error('Erro ao criar ingrediente');
  }
}

export async function updateIngredient(
  id: string,
  data: Partial<Ingredient>
): Promise<void> {
  try {
    const ref = doc(db, 'ingredients', id);
    await updateDoc(ref, data);
  } catch (error) {
    console.error('Erro ao atualizar ingrediente:', error);
    throw new Error('Erro ao atualizar ingrediente');
  }
}

export async function deleteIngredient(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'ingredients', id));
  } catch (error) {
    console.error('Erro ao excluir ingrediente:', error);
    throw new Error('Erro ao excluir ingrediente');
  }
}

// Removidos: createStockMovement, getStockMovements, generateShoppingList, getLowStockIngredients

// =====================
// UTILITÁRIOS
// =====================

export function calculateUnitCost(ingredient: Ingredient): number {
  // Custo por unidade de medida
  return ingredient.purchasePrice / ingredient.purchaseQuantity;
}

export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  const conversions: Record<string, number> = {
    'kg_to_g': 1000,
    'g_to_kg': 0.001,
    'L_to_ml': 1000,
    'ml_to_L': 0.001,
  };
  
  const key = `${fromUnit}_to_${toUnit}`;
  if (conversions[key]) {
    return value * conversions[key];
  }
  
  // Se as unidades forem iguais ou não houver conversão
  return value;
}

// Removidos utilitários de estoque e lista de compras que dependiam de campos excluídos

// Busca um ingrediente de produção vinculado a um ID TACO
export async function findIngredientByTacoId(tacoFoodId: number): Promise<Ingredient | null> {
  const ingredients = await getIngredients();
  return ingredients.find(i => i.tacoFoodId === tacoFoodId) ?? null;
}
