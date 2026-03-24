import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { tacoFoods, type TacoFood } from '../data/tacoFoods';

export interface RecipeIngredient {
  foodId: number;
  name: string;
  weight_g: number;
  kcal: number;
}

export interface NutritionRecipe {
  id?: string;
  name: string;
  ingredients: RecipeIngredient[];
  totalWeight_g: number;
  totalKcal: number;
  servingWeight_g: number;
  kcalPerServing: number;
  createdAt?: any;
}

/**
 * Calcula as calorias de um ingrediente baseado no peso
 */
export function calculateIngredientKcal(weight_g: number, kcalPer100g: number): number {
  return (weight_g / 100) * kcalPer100g;
}

/**
 * Calcula o total de calorias e peso de uma receita
 */
export function calculateRecipe(ingredients: RecipeIngredient[]): { totalKcal: number; totalWeight_g: number } {
  let totalKcal = 0;
  let totalWeight = 0;

  ingredients.forEach(ing => {
    const food = tacoFoods.find(f => f.id === ing.foodId);
    if (food) {
      totalKcal += calculateIngredientKcal(ing.weight_g, food.kcal);
      totalWeight += ing.weight_g;
    }
  });

  return { totalKcal: Math.round(totalKcal), totalWeight_g: Math.round(totalWeight) };
}

/**
 * Calcula as calorias por porção baseado no peso unitário
 */
export function calculateServingKcal(totalKcal: number, totalWeight_g: number, servingWeight_g: number): number {
  if (totalWeight_g === 0) return 0;
  return Math.round((servingWeight_g / totalWeight_g) * totalKcal);
}

/**
 * Calcula calorias para múltiplos tamanhos de porção
 */
export function calculateMultipleServings(
  totalKcal: number,
  totalWeight_g: number,
  servingWeights: number[]
): Record<number, number> {
  const result: Record<number, number> = {};
  servingWeights.forEach(weight => {
    result[weight] = calculateServingKcal(totalKcal, totalWeight_g, weight);
  });
  return result;
}

/**
 * Salva uma receita no Firestore
 */
export async function saveNutritionRecipe(recipe: Omit<NutritionRecipe, 'id'>): Promise<string> {
  try {
    const recipesRef = collection(db, 'nutrition_recipes');
    const docRef = await addDoc(recipesRef, {
      ...recipe,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao salvar receita:', error);
    throw error;
  }
}

/**
 * Busca todas as receitas salvas
 */
export async function getNutritionRecipes(): Promise<NutritionRecipe[]> {
  try {
    const recipesRef = collection(db, 'nutrition_recipes');
    const q = query(recipesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as NutritionRecipe));
  } catch (error) {
    console.error('Erro ao buscar receitas:', error);
    return [];
  }
}

/**
 * Exclui uma receita
 */
export async function deleteNutritionRecipe(recipeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'nutrition_recipes', recipeId));
  } catch (error) {
    console.error('Erro ao excluir receita:', error);
    throw error;
  }
}

/**
 * Atualiza uma receita
 */
export async function updateNutritionRecipe(
  recipeId: string,
  recipe: Partial<NutritionRecipe>
): Promise<void> {
  try {
    const recipeRef = doc(db, 'nutrition_recipes', recipeId);
    await updateDoc(recipeRef, recipe);
  } catch (error) {
    console.error('Erro ao atualizar receita:', error);
    throw error;
  }
}

/**
 * Busca um alimento da tabela TACO por ID
 */
export function getFoodById(foodId: number): TacoFood | undefined {
  return tacoFoods.find(f => f.id === foodId);
}

/**
 * Busca alimentos da tabela TACO por termo de busca
 */
export function searchFoods(searchTerm: string): TacoFood[] {
  if (!searchTerm.trim()) return [];
  const term = searchTerm.toLowerCase();
  return tacoFoods.filter(food => food.name.toLowerCase().includes(term));
}

/**
 * Retorna todas as categorias únicas de alimentos
 */
export function getFoodCategories(): string[] {
  return Array.from(new Set(tacoFoods.map(food => food.category)));
}

/**
 * Retorna alimentos de uma categoria específica
 */
export function getFoodsByCategory(category: string): TacoFood[] {
  return tacoFoods.filter(food => food.category === category);
}
