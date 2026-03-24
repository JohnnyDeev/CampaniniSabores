import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Save,
  Flame,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Utensils,
  Scale,
  RefreshCw,
} from 'lucide-react';
import {
  tacoFoods,
  getUniqueCategories,
  getFoodsByCategory,
  findFoodByName,
  type TacoFood,
} from '../data/tacoFoods';
import {
  calculateRecipe,
  calculateServingKcal,
  calculateMultipleServings,
  saveNutritionRecipe,
  getNutritionRecipes,
  deleteNutritionRecipe,
  type RecipeIngredient,
  type NutritionRecipe,
} from '../services/NutritionService';

export default function NutritionCalculator() {
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [servingWeight, setServingWeight] = useState(25);
  const [result, setResult] = useState<{
    totalKcal: number;
    totalWeight_g: number;
    kcalPerServing: number;
    multipleServings: Record<number, number>;
  } | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<NutritionRecipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const categories = ['Todos', ...getUniqueCategories()];

  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const loadSavedRecipes = async () => {
    setLoadingRecipes(true);
    const recipes = await getNutritionRecipes();
    setSavedRecipes(recipes);
    setLoadingRecipes(false);
  };

  const handleAddIngredient = (food: TacoFood) => {
    const existingIndex = ingredients.findIndex(ing => ing.foodId === food.id);
    if (existingIndex >= 0) {
      const newIngredients = [...ingredients];
      newIngredients[existingIndex].weight_g += 100;
      newIngredients[existingIndex].kcal = calculateRecipe([newIngredients[existingIndex]]).totalKcal;
      setIngredients(newIngredients);
    } else {
      const kcal = calculateRecipe([{ foodId: food.id, name: food.name, weight_g: 100, kcal: 0 }]).totalKcal;
      setIngredients([
        ...ingredients,
        { foodId: food.id, name: food.name, weight_g: 100, kcal },
      ]);
    }
    setShowSearch(false);
    setSearchTerm('');
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleWeightChange = (index: number, newWeight: number) => {
    const newIngredients = [...ingredients];
    newIngredients[index].weight_g = newWeight;
    const food = tacoFoods.find(f => f.id === newIngredients[index].foodId);
    if (food) {
      newIngredients[index].kcal = Math.round((newWeight / 100) * food.kcal);
    }
    setIngredients(newIngredients);
  };

  const handleCalculate = async () => {
    if (ingredients.length === 0) {
      alert('Adicione pelo menos um ingrediente!');
      return;
    }

    const { totalKcal, totalWeight_g } = calculateRecipe(ingredients);
    const kcalPerServing = calculateServingKcal(totalKcal, totalWeight_g, servingWeight);

    setResult({
      totalKcal,
      totalWeight_g,
      kcalPerServing,
      multipleServings: {},
    });

    // Salvar receita automaticamente
    if (recipeName.trim()) {
      setSaving(true);
      try {
        await saveNutritionRecipe({
          name: recipeName,
          ingredients,
          totalWeight_g,
          totalKcal,
          servingWeight_g: servingWeight,
          kcalPerServing,
        });
        await loadSavedRecipes();
        alert('Receita salva com sucesso!');
      } catch (error) {
        console.error('Erro ao salvar receita:', error);
        alert('Erro ao salvar receita. Verifique o console.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleLoadRecipe = (recipe: NutritionRecipe) => {
    setRecipeName(recipe.name);
    setIngredients(recipe.ingredients);
    setServingWeight(recipe.servingWeight_g);
    setResult({
      totalKcal: recipe.totalKcal,
      totalWeight_g: recipe.totalWeight_g,
      kcalPerServing: recipe.kcalPerServing,
      multipleServings: calculateMultipleServings(
        recipe.totalKcal,
        recipe.totalWeight_g,
        [25, 50, 100, 200]
      ),
    });
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    await deleteNutritionRecipe(recipeId);
    await loadSavedRecipes();
  };

  const handleNewRecipe = () => {
    setRecipeName('');
    setIngredients([]);
    setServingWeight(25);
    setResult(null);
  };

  const filteredFoods = selectedCategory === 'Todos'
    ? searchTerm.trim()
      ? tacoFoods.filter(food => food.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : tacoFoods
    : getFoodsByCategory(selectedCategory).filter(food =>
      food.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const yieldCount = result && result.totalWeight_g > 0 && servingWeight > 0
    ? Math.round(result.totalWeight_g / servingWeight)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center">
            <Flame size={24} className="text-[#FF5C00]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Calculadora de Calorias</h2>
            <p className="text-sm text-gray-500">Calcule as calorias das suas receitas</p>
          </div>
        </div>

        {/* Nome da Receita */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Receita
          </label>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Ex: Esfiha de carne"
            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
          />
        </div>

        {/* Adicionar Ingrediente */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ingredientes
          </label>
          <button
            onClick={() => setShowSearch(true)}
            className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-[#FF5C00] hover:text-[#FF5C00] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Adicionar Ingrediente
          </button>
        </div>

        {/* Lista de Ingredientes */}
        {ingredients.length > 0 && (
          <div className="space-y-2 mb-4">
            {ingredients.map((ing, index) => (
              <div
                key={ing.foodId + index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{ing.name}</p>
                  <p className="text-xs text-gray-500">{ing.kcal} kcal</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={ing.weight_g}
                    onChange={(e) => handleWeightChange(index, parseInt(e.target.value) || 0)}
                    className="w-20 border border-gray-200 rounded-lg p-2 text-center text-sm focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
                    placeholder="g"
                  />
                  <span className="text-sm text-gray-500">g</span>
                  <button
                    onClick={() => handleRemoveIngredient(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botão Calcular */}
        <button
          onClick={handleCalculate}
          disabled={ingredients.length === 0 || saving}
          className="w-full py-4 bg-[#FF5C00] text-white rounded-xl font-bold hover:bg-[#E65100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {saving ? 'Salvando...' : 'Salvar e Calcular'}
        </button>
      </div>

      {/* Resultado */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl p-6 shadow-sm mb-6"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Flame size={20} className="text-[#FF5C00]" />
              Resultado
            </h3>

            {/* Total da Receita */}
            <div className="bg-gradient-to-r from-[#FF5C00]/10 to-[#FF5C00]/5 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Receita completa</p>
                  <p className="text-3xl font-bold text-[#FF5C00]">{result.totalKcal} kcal</p>
                  <p className="text-xs text-gray-500 mt-1">Peso total: {result.totalWeight_g}g</p>
                </div>
                <Flame size={48} className="text-[#FF5C00]/30" />
              </div>
            </div>

            {/* Peso da Porção */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso de cada unidade (g)
              </label>
              <div className="flex items-center gap-3">
                <Scale size={20} className="text-gray-400" />
                <input
                  type="number"
                  value={servingWeight}
                  onChange={(e) => {
                    const newWeight = parseInt(e.target.value) || 0;
                    setServingWeight(newWeight);
                    if (result) {
                      const kcalPerServing = calculateServingKcal(
                        result.totalKcal,
                        result.totalWeight_g,
                        newWeight
                      );
                      setResult({
                        ...result,
                        kcalPerServing,
                      });
                    }
                  }}
                  className="w-32 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none text-lg font-semibold"
                />
                <span className="text-gray-500">g</span>
              </div>
              {yieldCount > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Rendimento: ~{yieldCount} unidades
                </p>
              )}
            </div>

            {/* Resultado da Porção */}
            <div className="bg-gradient-to-r from-[#FF5C00]/10 to-[#FF5C00]/5 rounded-2xl p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Cada porção de {servingWeight}g tem:</p>
                <p className="text-5xl font-bold text-[#FF5C00]">{result.kcalPerServing} kcal</p>
              </div>
            </div>

            {/* Botão Nova Receita */}
            <button
              onClick={handleNewRecipe}
              className="w-full mt-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Nova Receita
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receitas Salvas */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Utensils size={20} className="text-[#FF5C00]" />
          Receitas Salvas
        </h3>

        {loadingRecipes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[#FF5C00]" />
          </div>
        ) : savedRecipes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Utensils size={48} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma receita salva ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedRecipes.map(recipe => (
              <div
                key={recipe.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{recipe.name}</p>
                  <p className="text-xs text-gray-500">
                    {recipe.kcalPerServing} kcal/un ({recipe.servingWeight_g}g) • {recipe.totalWeight_g}g total
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadRecipe(recipe)}
                    className="p-2 text-[#FF5C00] hover:bg-[#FF5C00]/10 rounded-lg transition-colors"
                    title="Carregar receita"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteRecipe(recipe.id!)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir receita"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Busca de Ingredientes */}
      <AnimatePresence>
        {showSearch && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSearch(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">Adicionar Ingrediente</h3>
                  <button
                    onClick={() => setShowSearch(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Busca */}
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar ingrediente..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Filtro por Categoria */}
                  <div className="mt-3 relative">
                    <button
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="w-full flex items-center justify-between px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-600">
                        {selectedCategory === 'Todos' ? 'Todas categorias' : selectedCategory}
                      </span>
                      {showCategoryDropdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showCategoryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                        {categories.map(category => (
                          <button
                            key={category}
                            onClick={() => {
                              setSelectedCategory(category);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm ${selectedCategory === category
                              ? 'text-[#FF5C00] font-medium bg-[#FF5C00]/5'
                              : 'text-gray-700'
                              }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista de Alimentos */}
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredFoods.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Search size={48} className="mx-auto mb-2 opacity-30" />
                      <p>Nenhum ingrediente encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredFoods.map(food => (
                        <button
                          key={food.id}
                          onClick={() => handleAddIngredient(food)}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{food.name}</p>
                            <p className="text-xs text-gray-500">{food.category}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-[#FF5C00]">
                              {food.kcal} kcal/100g
                            </span>
                            <Plus size={18} className="text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
