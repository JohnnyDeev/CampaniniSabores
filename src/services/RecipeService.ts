import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ProductRecipe, RecipeIngredient, Ingredient } from '../types';
import { getIngredients, calculateUnitCost, convertUnit } from './IngredientService';

// =====================
// FICHA TÉCNICA (RECEITAS)
// =====================

export async function getProductRecipes(): Promise<ProductRecipe[]> {
  try {
    const ref = collection(db, 'productRecipes');
    const q = query(ref, orderBy('productName', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        productId: data.productId,
        productName: data.productName,
        ingredients: data.ingredients || [],
        totalCost: data.totalCost,
        yield: data.yield,
        costPerUnit: data.costPerUnit,
        salePrice: data.salePrice,
        profitMargin: data.profitMargin,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
      } as ProductRecipe;
    });
  } catch (error) {
    console.error('Erro ao buscar fichas técnicas:', error);
    return [];
  }
}

export async function getProductRecipeByProductId(productId: string): Promise<ProductRecipe | null> {
  try {
    const ref = collection(db, 'productRecipes');
    const q = query(ref, where('productId', '==', productId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const d = snapshot.docs[0];
    const data = d.data();
    return {
      id: d.id,
      productId: data.productId,
      productName: data.productName,
      ingredients: data.ingredients || [],
      totalCost: data.totalCost,
      yield: data.yield,
      costPerUnit: data.costPerUnit,
      salePrice: data.salePrice,
      profitMargin: data.profitMargin,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
    } as ProductRecipe;
  } catch (error) {
    console.error('Erro ao buscar ficha técnica:', error);
    return null;
  }
}

export async function calculateRecipeCost(
  ingredients: { ingredientId: string; quantity: number; unit: string }[]
): Promise<{ totalCost: number; ingredients: RecipeIngredient[] }> {
  const allIngredients = await getIngredients();

  const recipeIngredients: RecipeIngredient[] = ingredients.map(ing => {
    const ingredient = allIngredients.find(i => i.id === ing.ingredientId);

    if (!ingredient) {
      return {
        ingredientId: ing.ingredientId,
        ingredientName: 'Desconhecido',
        quantity: ing.quantity,
        unit: ing.unit as any,
        cost: 0,
      };
    }

    // Calcular custo baseado na quantidade e unidade
    const unitCost = calculateUnitCost(ingredient);

    // Converter quantidade para a unidade de compra se necessário
    let quantityInPurchaseUnit = ing.quantity;
    if (ing.unit !== ingredient.purchaseUnit) {
      quantityInPurchaseUnit = convertUnit(ing.quantity, ing.unit, ingredient.purchaseUnit);
    }

    const cost = quantityInPurchaseUnit * unitCost;

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity: ing.quantity,
      unit: ing.unit as any,
      cost,
    };
  });

  const totalCost = recipeIngredients.reduce((sum, ing) => sum + ing.cost, 0);

  return { totalCost, ingredients: recipeIngredients };
}

export async function createProductRecipe(data: {
  productId: string;
  productName: string;
  ingredients: { ingredientId: string; quantity: number; unit: string }[];
  yield: number;
  salePrice: number;
}): Promise<string> {
  try {
    // Calcular custos automaticamente
    const { totalCost, ingredients } = await calculateRecipeCost(data.ingredients);
    const costPerUnit = totalCost / data.yield;
    const profitMargin = ((data.salePrice - costPerUnit) / data.salePrice) * 100;

    const ref = collection(db, 'productRecipes');
    const docRef = await addDoc(ref, {
      productId: data.productId,
      productName: data.productName,
      ingredients,
      totalCost,
      yield: data.yield,
      costPerUnit,
      salePrice: data.salePrice,
      profitMargin,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar ficha técnica:', error);
    throw new Error('Erro ao criar ficha técnica');
  }
}

export async function updateProductRecipe(
  id: string,
  data: {
    ingredients?: { ingredientId: string; quantity: number; unit: string }[];
    yield?: number;
    salePrice?: number;
  }
): Promise<void> {
  try {
    const recipe = await getDoc(doc(db, 'productRecipes', id));
    if (!recipe.exists()) {
      throw new Error('Ficha técnica não encontrada');
    }

    const currentData = recipe.data();

    // Recalcular custos se ingredientes mudaram
    let ingredients = currentData.ingredients;
    let totalCost = currentData.totalCost;
    let costPerUnit = currentData.costPerUnit;
    let profitMargin = currentData.profitMargin;

    if (data.ingredients) {
      const calculated = await calculateRecipeCost(data.ingredients);
      ingredients = calculated.ingredients;
      totalCost = calculated.totalCost;
    }

    const yieldValue = data.yield || currentData.yield;
    const salePrice = data.salePrice || currentData.salePrice;

    costPerUnit = totalCost / yieldValue;
    profitMargin = ((salePrice - costPerUnit) / salePrice) * 100;

    const ref = doc(db, 'productRecipes', id);
    await updateDoc(ref, {
      ingredients,
      totalCost,
      yield: yieldValue,
      costPerUnit,
      salePrice,
      profitMargin,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Erro ao atualizar ficha técnica:', error);
    throw new Error('Erro ao atualizar ficha técnica');
  }
}

export async function deleteProductRecipe(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'productRecipes', id));
  } catch (error) {
    console.error('Erro ao excluir ficha técnica:', error);
    throw new Error('Erro ao excluir ficha técnica');
  }
}

// =====================
// LISTA DE COMPRAS
// =====================

export async function generateShoppingListFromOrders(
  orders: { items: { productId: string; quantity: number }[] }[]
): Promise<import('../types').ShoppingListItem[]> {
  // Agrupar produtos e quantidades
  const productQuantities: Record<string, number> = {};

  orders.forEach(order => {
    order.items.forEach(item => {
      if (!productQuantities[item.productId]) {
        productQuantities[item.productId] = 0;
      }
      productQuantities[item.productId] += item.quantity;
    });
  });

  // Para cada produto, buscar sua ficha técnica e somar ingredientes
  const ingredientRequirements: Record<string, { quantity: number; unit: string }> = {};

  const recipes = await getProductRecipes();

  for (const [productId, quantity] of Object.entries(productQuantities)) {
    const recipe = recipes.find(r => r.productId === productId);

    if (recipe) {
      recipe.ingredients.forEach(ing => {
        const requiredQuantity = ing.quantity * quantity;

        if (!ingredientRequirements[ing.ingredientId]) {
          ingredientRequirements[ing.ingredientId] = {
            quantity: 0,
            unit: ing.unit,
          };
        }

        ingredientRequirements[ing.ingredientId].quantity += requiredQuantity;
      });
    }
  }

  // Converter para formato de lista de compras
  const requiredIngredients = Object.entries(ingredientRequirements).map(
    ([ingredientId, data]) => ({
      ingredientId,
      quantity: data.quantity,
      unit: data.unit,
    })
  );

  const { generateShoppingList } = await import('./IngredientService');
  return generateShoppingList(requiredIngredients);
}
