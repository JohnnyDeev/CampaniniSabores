import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
  Tag,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { getIngredients, createIngredient, updateIngredient, deleteIngredient, createStockMovement, getLowStockIngredients } from '../services/IngredientService';
import { getProductRecipes, createProductRecipe, updateProductRecipe, deleteProductRecipe } from '../services/RecipeService';
import type { Ingredient, ProductRecipe } from '../types';
import { getProducts } from '../services/ProductService';

type Tab = 'ingredients' | 'recipes';

export default function ProductionManager() {
  const [activeTab, setActiveTab] = useState<Tab>('ingredients');
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<ProductRecipe | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [ingredientsData, recipesData, productsData] = await Promise.all([
      getIngredients(),
      getProductRecipes(),
      getProducts(),
    ]);
    setIngredients(ingredientsData);
    setRecipes(recipesData);
    setProducts(productsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const lowStockIngredients = getLowStockIngredientsSync(ingredients);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'ingredients'
              ? 'bg-[#C75B48] text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Package size={18} />
          Ingredientes
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'recipes'
              ? 'bg-[#C75B48] text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Calculator size={18} />
          Fichas Técnicas
        </button>
      </div>

      {/* Alerta de estoque baixo */}
      {activeTab === 'ingredients' && lowStockIngredients.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Estoque Baixo</p>
            <p className="text-xs text-amber-700 mt-1">
              {lowStockIngredients.length} ingrediente(s) abaixo do estoque mínimo: {lowStockIngredients.map(i => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={48} className="animate-spin text-[#C75B48]" />
        </div>
      ) : activeTab === 'ingredients' ? (
        <IngredientsContent
          ingredients={ingredients}
          onAdd={() => {
            setEditingIngredient(null);
            setShowIngredientModal(true);
          }}
          onEdit={(ingredient) => {
            setEditingIngredient(ingredient);
            setShowIngredientModal(true);
          }}
          onDelete={async (id) => {
            if (confirm('Tem certeza que deseja excluir este ingrediente?')) {
              await deleteIngredient(id);
              await loadData();
            }
          }}
          onSave={async (data) => {
            if (editingIngredient) {
              await updateIngredient(editingIngredient.id, data);
            } else {
              await createIngredient(data);
            }
            setShowIngredientModal(false);
            await loadData();
          }}
        />
      ) : (
        <RecipesContent
          recipes={recipes}
          products={products}
          ingredients={ingredients}
          onAdd={() => {
            setEditingRecipe(null);
            setShowRecipeModal(true);
          }}
          onEdit={(recipe) => {
            setEditingRecipe(recipe);
            setShowRecipeModal(true);
          }}
          onDelete={async (id) => {
            if (confirm('Tem certeza que deseja excluir esta ficha técnica?')) {
              await deleteProductRecipe(id);
              await loadData();
            }
          }}
        />
      )}
    </motion.div>
  );
}

function getLowStockIngredientsSync(ingredients: Ingredient[]): Ingredient[] {
  return ingredients.filter(i => i.currentStock <= i.minStock);
}

// =====================
// INGREDIENTES
// =====================

function IngredientsContent({
  ingredients,
  onAdd,
  onEdit,
  onDelete,
  onSave,
}: {
  ingredients: Ingredient[];
  onAdd: () => void;
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
  onSave: (data: any) => void;
}) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Ingredientes</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-[#C75B48] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#A84838]"
        >
          <Plus size={18} /> Novo Ingrediente
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-4 font-medium">Nome</th>
              <th className="px-6 py-4 font-medium">Categoria</th>
              <th className="px-6 py-4 font-medium">Estoque</th>
              <th className="px-6 py-4 font-medium">Custo Unitário</th>
              <th className="px-6 py-4 font-medium">Fornecedor</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map(ing => (
              <tr key={ing.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 font-medium">{ing.name}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                    {ing.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${ing.currentStock <= ing.minStock ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                      {ing.currentStock} {ing.stockUnit}
                    </span>
                    {ing.currentStock <= ing.minStock && (
                      <AlertCircle size={14} className="text-red-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {formatCurrency(ing.purchasePrice / ing.purchaseQuantity)} / {ing.purchaseUnit}
                </td>
                <td className="px-6 py-4 text-gray-600">{ing.supplier || '—'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(ing)}
                      className="p-2 text-gray-400 hover:text-[#C75B48] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(ing.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================
// FICHAS TÉCNICAS
// =====================

function RecipesContent({
  recipes,
  products,
  ingredients,
  onAdd,
  onEdit,
  onDelete,
}: {
  recipes: ProductRecipe[];
  products: any[];
  ingredients: Ingredient[];
  onAdd: () => void;
  onEdit: (recipe: ProductRecipe) => void;
  onDelete: (id: string) => void;
}) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Fichas Técnicas</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-[#C75B48] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#A84838]"
        >
          <Plus size={18} /> Nova Ficha
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-4 font-medium">Produto</th>
              <th className="px-6 py-4 font-medium">Ingredientes</th>
              <th className="px-6 py-4 font-medium">Rendimento</th>
              <th className="px-6 py-4 font-medium">Custo Total</th>
              <th className="px-6 py-4 font-medium">Custo Unitário</th>
              <th className="px-6 py-4 font-medium">Preço Venda</th>
              <th className="px-6 py-4 font-medium">Margem</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map(recipe => (
              <tr key={recipe.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 font-medium">{recipe.productName}</td>
                <td className="px-6 py-4 text-gray-600">
                  {recipe.ingredients.length} ingredientes
                </td>
                <td className="px-6 py-4 text-gray-600">{recipe.yield} unidades</td>
                <td className="px-6 py-4 text-gray-600">{formatCurrency(recipe.totalCost)}</td>
                <td className="px-6 py-4 text-gray-600">{formatCurrency(recipe.costPerUnit)}</td>
                <td className="px-6 py-4 text-gray-800 font-medium">{formatCurrency(recipe.salePrice)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    recipe.profitMargin >= 50 ? 'bg-green-100 text-green-700' :
                    recipe.profitMargin >= 30 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {recipe.profitMargin.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(recipe)}
                      className="p-2 text-gray-400 hover:text-[#C75B48] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(recipe.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
