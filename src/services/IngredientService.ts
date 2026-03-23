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
        category: data.category,
        purchaseUnit: data.purchaseUnit,
        purchasePrice: data.purchasePrice,
        purchaseQuantity: data.purchaseQuantity,
        currentStock: data.currentStock,
        stockUnit: data.stockUnit,
        minStock: data.minStock,
        supplier: data.supplier,
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
      category: data.category,
      purchaseUnit: data.purchaseUnit,
      purchasePrice: data.purchasePrice,
      purchaseQuantity: data.purchaseQuantity,
      currentStock: data.currentStock,
      stockUnit: data.stockUnit,
      minStock: data.minStock,
      supplier: data.supplier,
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
  category: Ingredient['category'];
  purchaseUnit: Ingredient['purchaseUnit'];
  purchasePrice: number;
  purchaseQuantity: number;
  currentStock: number;
  stockUnit: Ingredient['stockUnit'];
  minStock: number;
  supplier?: string;
}): Promise<string> {
  try {
    const ref = collection(db, 'ingredients');
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
    });
    
    // Criar movimentação de estoque inicial
    await createStockMovement({
      ingredientId: docRef.id,
      ingredientName: data.name,
      type: 'entrada',
      quantity: data.currentStock,
      unit: data.stockUnit,
      reason: 'Cadastro inicial',
    });
    
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

// =====================
// MOVIMENTAÇÕES DE ESTOQUE
// =====================

export async function createStockMovement(data: {
  ingredientId: string;
  ingredientName: string;
  type: 'entrada' | 'saida' | 'ajuste' | 'perda';
  quantity: number;
  unit: string;
  reason?: string;
  orderId?: string;
}): Promise<string> {
  try {
    const ref = collection(db, 'stockMovements');
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
    });
    
    // Atualizar estoque atual
    const ingredient = await getIngredientById(data.ingredientId);
    if (ingredient) {
      let newStock = ingredient.currentStock;
      
      if (data.type === 'entrada') {
        newStock += data.quantity;
      } else if (data.type === 'saida' || data.type === 'perda') {
        newStock -= data.quantity;
      } else if (data.type === 'ajuste') {
        newStock = data.quantity; // Ajuste direto
      }
      
      await updateIngredient(data.ingredientId, {
        currentStock: newStock,
      });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar movimentação de estoque:', error);
    throw new Error('Erro ao criar movimentação de estoque');
  }
}

export async function getStockMovements(ingredientId?: string): Promise<StockMovement[]> {
  try {
    const ref = collection(db, 'stockMovements');
    const q = ingredientId
      ? query(ref, orderBy('createdAt', 'desc'))
      : query(ref, orderBy('createdAt', 'desc'));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ingredientId: data.ingredientId,
        ingredientName: data.ingredientName,
        type: data.type,
        quantity: data.quantity,
        unit: data.unit,
        reason: data.reason,
        orderId: data.orderId,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      } as StockMovement;
    });
  } catch (error) {
    console.error('Erro ao buscar movimentações de estoque:', error);
    return [];
  }
}

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

export async function generateShoppingList(
  requiredIngredients: { ingredientId: string; quantity: number; unit: string }[]
): Promise<ShoppingListItem[]> {
  const ingredients = await getIngredients();
  
  return requiredIngredients.map(req => {
    const ingredient = ingredients.find(i => i.id === req.ingredientId);
    
    if (!ingredient) {
      return {
        ingredientId: req.ingredientId,
        ingredientName: 'Desconhecido',
        requiredQuantity: req.quantity,
        unit: req.unit as any,
        inStock: 0,
        toBuy: req.quantity,
        estimatedCost: 0,
      };
    }
    
    // Converter unidades se necessário
    let requiredInStockUnit = req.quantity;
    if (req.unit !== ingredient.stockUnit) {
      requiredInStockUnit = convertUnit(req.quantity, req.unit, ingredient.stockUnit);
    }
    
    const toBuy = Math.max(0, requiredInStockUnit - ingredient.currentStock);
    const unitCost = calculateUnitCost(ingredient);
    const estimatedCost = toBuy * unitCost;
    
    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      requiredQuantity: req.quantity,
      unit: req.unit as any,
      inStock: ingredient.currentStock,
      toBuy,
      estimatedCost,
      supplier: ingredient.supplier,
    };
  });
}

export async function getLowStockIngredients(): Promise<Ingredient[]> {
  const ingredients = await getIngredients();
  return ingredients.filter(i => i.currentStock <= i.minStock);
}
