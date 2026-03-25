import React, { useState, useEffect, useRef } from 'react';
import { NumericFormat } from 'react-number-format';
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
  TrendingUp,
  Flame,
  Link2,
  Link2Off,
  ChevronDown
} from 'lucide-react';
import { findClosestTacoMatches, findExactTacoMatch } from '../data/tacoFoods';
import type { TacoFood } from '../data/tacoFoods';
import { getIngredients, createIngredient, updateIngredient, deleteIngredient } from '../services/IngredientService';
import { getProductRecipes, createProductRecipe, updateProductRecipe, deleteProductRecipe, calculateRecipeCost } from '../services/RecipeService';
import type { Ingredient, ProductRecipe, RecipeIngredient } from '../types';
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
    try {
      const [ingredientsData, recipesData, productsData] = await Promise.all([
        getIngredients(),
        getProductRecipes(),
        getProducts(),
      ]);
      setIngredients(ingredientsData);
      setRecipes(recipesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Removido alerta de estoque baixo conforme simplificação solicitada

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${activeTab === 'ingredients'
            ? 'bg-[#FF5C00] text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          <Package size={18} />
          Ingredientes
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${activeTab === 'recipes'
            ? 'bg-[#FF5C00] text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          <Calculator size={18} />
          Fichas Técnicas
        </button>
      </div>

      {/* Alerta de estoque removido */}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={48} className="animate-spin text-[#FF5C00]" />
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
            try {
              if (editingIngredient) {
                await updateIngredient(editingIngredient.id, data);
              } else {
                await createIngredient(data);
              }
              setShowIngredientModal(false);
              setEditingIngredient(null);
              await loadData();
            } catch (error) {
              alert('Erro ao salvar ingrediente: ' + (error as Error).message);
            }
          }}
          onClose={() => {
            setShowIngredientModal(false);
            setEditingIngredient(null);
          }}
          show={showIngredientModal}
          editingIngredient={editingIngredient}
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
          onSave={async (data) => {
            try {
              if (editingRecipe) {
                await updateProductRecipe(editingRecipe.id, data);
              } else {
                await createProductRecipe(data);
              }
              setShowRecipeModal(false);
              setEditingRecipe(null);
              await loadData();
            } catch (error) {
              alert('Erro ao salvar ficha técnica: ' + (error as Error).message);
            }
          }}
          onClose={() => {
            setShowRecipeModal(false);
            setEditingRecipe(null);
          }}
          show={showRecipeModal}
          editingRecipe={editingRecipe}
        />
      )}
    </motion.div>
  );
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
  onClose,
  show,
  editingIngredient,
}: {
  ingredients: Ingredient[];
  onAdd: () => void;
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
  onSave: (data: any) => void;
  onClose: () => void;
  show: boolean;
  editingIngredient: Ingredient | null;
}) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Ingredientes</h3>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 bg-[#FF5C00] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#E65100]"
          >
            <Plus size={18} /> Novo Ingrediente
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Custo Unitário</th>
                <th className="px-6 py-4 font-medium">Kcal Total</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map(ing => (
                <tr key={ing.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-800 font-medium">{ing.name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatCurrency(ing.purchasePrice / ing.purchaseQuantity)} / {ing.purchaseUnit}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {ing.kcalPer100g ? `${Math.round((ing.kcalPer100g / 100) * (['kg', 'L'].includes(ing.purchaseUnit) ? ing.purchaseQuantity * 1000 : ing.purchaseQuantity))} kcal` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(ing)}
                        className="p-2 text-gray-400 hover:text-[#FF5C00] hover:bg-gray-100 rounded-lg transition-colors"
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

      {/* Modal de Ingrediente */}
      {show && (
        <IngredientModal
          ingredient={editingIngredient}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </>
  );
}

function IngredientModal({
  ingredient,
  onSave,
  onClose,
}: {
  ingredient: Ingredient | null;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(ingredient?.name || '');
  const [purchaseUnit, setPurchaseUnit] = useState<Ingredient['purchaseUnit']>(ingredient?.purchaseUnit || 'kg');
  const [purchasePrice, setPurchasePrice] = useState(ingredient?.purchasePrice?.toString() || '0');
  const [purchaseQuantity, setPurchaseQuantity] = useState(ingredient?.purchaseQuantity?.toString() || '1');
  const [saving, setSaving] = useState(false);

  // TACO link state
  const [tacoFoodId, setTacoFoodId] = useState<number | null>(ingredient?.tacoFoodId || null);
  const [tacoFoodName, setTacoFoodName] = useState<string>('');
  const [kcalPer100g, setKcalPer100g] = useState<string>(ingredient?.kcalPer100g ? String(Math.round((ingredient.kcalPer100g / 100) * (ingredient.purchaseUnit === 'kg' || ingredient.purchaseUnit === 'L' ? ingredient.purchaseQuantity * 1000 : ingredient.purchaseQuantity))) : '');
  const [tacoSuggestions, setTacoSuggestions] = useState<TacoFood[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tacoSearch, setTacoSearch] = useState('');
  const tacoRef = useRef<HTMLDivElement>(null);

  // Atualiza as calorias totais quando o ingrediente inicial mudar (ex: ao abrir edição)
  useEffect(() => {
    if (ingredient) {
      if (ingredient.kcalPer100g) {
        const multiplier = (ingredient.purchaseUnit === 'kg' || ingredient.purchaseUnit === 'L') ? 1000 : 1;
        const totalKcalVal = Math.round((ingredient.kcalPer100g / 100) * (ingredient.purchaseQuantity * multiplier));
        setKcalPer100g(String(totalKcalVal));
      } else {
        setKcalPer100g('');
      }
    }
  }, [ingredient]);

  // Quando edita, mostra o nome do TACO vinculado
  useEffect(() => {
    if (ingredient?.tacoFoodId) {
      const matches = findClosestTacoMatches(ingredient.name, 20);
      const linked = matches.find(f => f.id === ingredient.tacoFoodId);
      if (linked) setTacoFoodName(linked.name);
    }
  }, [ingredient]);

  // Busca automática quando digita no campo de busca TACO
  useEffect(() => {
    if (tacoSearch.trim().length < 2) {
      setTacoSuggestions([]);
      return;
    }
    setTacoSuggestions(findClosestTacoMatches(tacoSearch, 6));
  }, [tacoSearch]);

  // Quando muda o nome do ingrediente, sugere automaticamente ou vincula exato
  useEffect(() => {
    if (!tacoFoodId && name.trim().length >= 3) {
      // Tentar match exato primeiro
      const exactMatch = findExactTacoMatch(name);
      if (exactMatch) {
        selectTacoFood(exactMatch);
      } else {
        setTacoSearch(name);
      }
    }
  }, [name]);

  // Clique fora fecha o dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tacoRef.current && !tacoRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectTacoFood(food: TacoFood) {
    setTacoFoodId(food.id);
    setTacoFoodName(food.name);
    
    // Calcula o Kcal Total baseado no peso atual e no valor per 100g do TACO
    const qty = parseFloat(purchaseQuantity) || 1;
    const multiplier = (purchaseUnit === 'kg' || purchaseUnit === 'L') ? 1000 : 1;
    const totalWeight = qty * multiplier;
    const totalKcal = Math.round((food.kcal / 100) * totalWeight);
    
    setKcalPer100g(String(totalKcal));
    setShowSuggestions(false);
  }

  function unlinkTacoFood() {
    setTacoFoodId(null);
    setTacoFoodName('');
    setTacoSearch('');
    setKcalPer100g('');
    setTacoSuggestions([]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Converte Kcal Total (da embalagem) para Kcal/100g para armazenamento
      const totalKcalVal = kcalPer100g ? parseFloat(kcalPer100g.replace(',', '.')) : null;
      let storedKcalPer100g = null;
      
      if (totalKcalVal !== null) {
        const qty = parseFloat(purchaseQuantity) || 1;
        const multiplier = (purchaseUnit === 'kg' || purchaseUnit === 'L') ? 1000 : 1;
        const totalWeight = qty * multiplier;
        if (totalWeight > 0) {
          storedKcalPer100g = (totalKcalVal / totalWeight) * 100;
        }
      }

      await onSave({
        name,
        purchaseUnit,
        purchasePrice: parseFloat(purchasePrice) || 0,
        purchaseQuantity: parseFloat(purchaseQuantity) || 1,
        tacoFoodId: tacoFoodId ?? null,
        kcalPer100g: storedKcalPer100g,
      });
    } catch (error) {
      alert('Erro ao salvar: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold text-gray-800">
            {ingredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Farinha de Trigo"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
            </div>

            {/* Campos removidos: categoria e fornecedor */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unidade de Compra *</label>
              <select
                value={purchaseUnit}
                onChange={e => setPurchaseUnit(e.target.value as any)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none bg-white"
              >
                <option value="g">Gramas (g)</option>
                <option value="kg">Quilogramas (kg)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="L">Litros (L)</option>
                <option value="unidade">Unidade</option>
                <option value="pacote">Pacote</option>
                <option value="saco">Saco</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preço da Compra (R$) *</label>
              <NumericFormat
                value={purchasePrice}
                onValueChange={(values) => setPurchasePrice(values.value)}
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                placeholder="R$ 0,00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade na Compra *</label>
              <NumericFormat
                value={purchaseQuantity}
                onValueChange={(values) => setPurchaseQuantity(values.value)}
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={2}
                placeholder="1,00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Quantos {purchaseUnit} vem na embalagem comprada</p>
            </div>

            {/* Campos removidos: estoque atual, unidade de estoque, estoque mínimo */}
          </div>

          {/* ---- VÍNCULO TACO ---- */}
          <div className="border border-orange-100 bg-orange-50/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-[#FF5C00]" />
                <span className="text-sm font-semibold text-gray-700">Vínculo Tabela TACO</span>
              </div>
              {tacoFoodId && (
                <button
                  type="button"
                  onClick={unlinkTacoFood}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Link2Off size={13} /> Desvincular
                </button>
              )}
            </div>

            {tacoFoodId ? (
              // Badge de item vinculado
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <Link2 size={14} className="text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-green-700 font-medium truncate">{tacoFoodName}</p>
                  <p className="text-xs text-green-600">ID TACO: {tacoFoodId}</p>
                </div>
                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              </div>
            ) : (
              // Campo de busca
              <div ref={tacoRef} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={tacoSearch}
                    onChange={e => {
                      setTacoSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => tacoSuggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Buscar na tabela TACO..."
                    className="w-full border border-orange-200 rounded-xl px-4 py-2.5 pr-10 bg-white focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none text-sm"
                  />
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {showSuggestions && tacoSuggestions.length > 0 && (
                  <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {tacoSuggestions.map(food => (
                      <li key={food.id}>
                        <button
                          type="button"
                          onClick={() => selectTacoFood(food)}
                          className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-gray-800">{food.name}</span>
                          <span className="text-xs text-orange-600 font-medium shrink-0">{food.kcal} kcal/100g</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {showSuggestions && tacoSearch.trim().length >= 2 && tacoSuggestions.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-500">
                    Nenhum item encontrado na tabela TACO
                  </div>
                )}
              </div>
            )}

            {/* Campo de kcal */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  KCAL
                </label>
                <div className="relative">
                  <NumericFormat
                    value={kcalPer100g}
                    onValueChange={(values) => setKcalPer100g(values.value)}
                    decimalScale={1}
                    allowNegative={false}
                    placeholder="Ex: 364"
                    className={`w-full border rounded-xl px-4 py-2.5 outline-none text-sm ${
                      tacoFoodId
                        ? 'border-green-200 bg-green-50 text-green-800 focus:border-green-400 focus:ring-2 focus:ring-green-100'
                        : 'border-gray-200 bg-white focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00]'
                    }`}
                  />
                  <Flame size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-end pb-0.5">
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
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
  onSave,
  onClose,
  show,
  editingRecipe,
}: {
  recipes: ProductRecipe[];
  products: any[];
  ingredients: Ingredient[];
  onAdd: () => void;
  onEdit: (recipe: ProductRecipe) => void;
  onDelete: (id: string) => void;
  onSave: (data: any) => void;
  onClose: () => void;
  show: boolean;
  editingRecipe: ProductRecipe | null;
}) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Fichas Técnicas</h3>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 bg-[#FF5C00] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#E65100]"
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${recipe.profitMargin >= 50 ? 'bg-green-100 text-green-700' :
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
                        className="p-2 text-gray-400 hover:text-[#FF5C00] hover:bg-gray-100 rounded-lg transition-colors"
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

      {/* Modal de Ficha Técnica */}
      {show && (
        <RecipeModal
          recipe={editingRecipe}
          products={products}
          ingredients={ingredients}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </>
  );
}

function RecipeModal({
  recipe,
  products,
  ingredients,
  onSave,
  onClose,
}: {
  recipe: ProductRecipe | null;
  products: any[];
  ingredients: Ingredient[];
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [productId, setProductId] = useState(recipe?.productId || products[0]?.id || '');
  const [productName, setProductName] = useState(recipe?.productName || products.find(p => p.id === productId)?.name || '');
  const [recipeIngredients, setRecipeIngredients] = useState<{ ingredientId: string; quantity: number | string; unit: string }[]>(
    recipe?.ingredients.map(i => ({ ingredientId: i.ingredientId, quantity: i.quantity.toString(), unit: i.unit })) || []
  );
  const [yieldValue, setYield] = useState(recipe?.yield?.toString() || '40');
  const [salePrice, setSalePrice] = useState(recipe?.salePrice?.toString() || '0');
  const [calculatedCost, setCalculatedCost] = useState<{ totalCost: number; costPerUnit: number; profitMargin: number } | null>(null);
  const [saving, setSaving] = useState(false);

  // Calcular custos automaticamente quando ingredientes mudam
  React.useEffect(() => {
    const calculateCosts = async () => {
      if (recipeIngredients.length === 0) return;

      try {
        const result = await calculateRecipeCost(recipeIngredients.map(i => ({
          ...i,
          quantity: parseFloat(i.quantity.toString()) || 0
        })));
        const yieldNum = parseFloat(yieldValue) || 1;
        const costPerUnit = result.totalCost / yieldNum;
        const salePriceNum = parseFloat(salePrice) || 0;
        const profitMargin = salePriceNum > 0 ? ((salePriceNum - costPerUnit) / salePriceNum) * 100 : 0;

        setCalculatedCost({
          totalCost: result.totalCost,
          costPerUnit,
          profitMargin,
        });
      } catch (error) {
        console.error('Erro ao calcular custos:', error);
      }
    };

    calculateCosts();
  }, [recipeIngredients, yieldValue, salePrice]);

  const addIngredient = () => {
    setRecipeIngredients([...recipeIngredients, { ingredientId: '', quantity: '0', unit: 'g' }]);
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        productId,
        productName,
        ingredients: recipeIngredients.map(i => ({
          ...i,
          quantity: parseFloat(i.quantity.toString()) || 0
        })),
        yield: parseFloat(yieldValue) || 40,
        salePrice: parseFloat(salePrice) || 0,
      });
    } catch (error) {
      alert('Erro ao salvar: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">
            {recipe ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Produto *</label>
              <select
                value={productId}
                onChange={e => {
                  setProductId(e.target.value);
                  const product = products.find(p => p.id === e.target.value);
                  if (product) setProductName(product.name);
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none bg-white"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rendimento (unidades) *</label>
              <NumericFormat
                value={yieldValue}
                onValueChange={(values) => setYield(values.value)}
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={2}
                placeholder="40,00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Quantas esfihas esta receita rende</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preço de Venda (R$) *</label>
              <NumericFormat
                value={salePrice}
                onValueChange={(values) => setSalePrice(values.value)}
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                placeholder="0,00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
            </div>
          </div>

          {/* Ingredientes da Receita */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Ingredientes *</label>
              <button
                type="button"
                onClick={addIngredient}
                className="text-sm text-[#FF5C00] hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar Ingrediente
              </button>
            </div>

            <div className="space-y-2">
              {recipeIngredients.map((ing, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                  <select
                    value={ing.ingredientId}
                    onChange={e => updateIngredient(index, 'ingredientId', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none bg-white"
                  >
                    <option value="">Selecione um ingrediente</option>
                    {ingredients.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  <NumericFormat
                    value={ing.quantity}
                    onValueChange={(values) => updateIngredient(index, 'quantity', values.value)}
                    thousandSeparator="."
                    decimalSeparator=","
                    decimalScale={2}
                    placeholder="0,00"
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                  />
                  <select
                    value={ing.unit}
                    onChange={e => updateIngredient(index, 'unit', e.target.value)}
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none bg-white"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo de Custos */}
          {calculatedCost && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                <Calculator size={16} />
                Custos Calculados
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-green-600">Custo Total</p>
                  <p className="text-lg font-bold text-green-800">{formatCurrency(calculatedCost.totalCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600">Custo por Unidade</p>
                  <p className="text-lg font-bold text-green-800">{formatCurrency(calculatedCost.costPerUnit)}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600">Margem de Lucro</p>
                  <p className={`text-lg font-bold ${calculatedCost.profitMargin >= 50 ? 'text-green-800' :
                    calculatedCost.profitMargin >= 30 ? 'text-amber-800' :
                      'text-red-800'
                    }`}>
                    {calculatedCost.profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || recipeIngredients.length === 0}
              className="flex-1 py-3 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

