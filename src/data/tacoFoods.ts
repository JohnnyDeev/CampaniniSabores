// Tabela TACO - Tabela Brasileira de Composição de Alimentos
// Fonte: UNICAMP/NEPA - 4ª edição
// Valores de energia por 100g de parte comestível

export interface TacoFood {
  id: number;
  name: string;
  kcal: number;
  category: string;
}

export const tacoFoods: TacoFood[] = [
  // 🥖 Cereais e Massas (1-7)
  { id: 1, name: 'Farinha de trigo', kcal: 365, category: 'Cereais e Massas' },
  { id: 2, name: 'Farinha integral', kcal: 340, category: 'Cereais e Massas' },
  { id: 3, name: 'Açúcar', kcal: 387, category: 'Cereais e Massas' },
  { id: 4, name: 'Sal', kcal: 0, category: 'Cereais e Massas' },
  { id: 5, name: 'Fermento biológico', kcal: 90, category: 'Cereais e Massas' },
  { id: 6, name: 'Fermento químico', kcal: 53, category: 'Cereais e Massas' },
  { id: 7, name: 'Gergelim', kcal: 573, category: 'Cereais e Massas' },

  // 🧈 Gorduras e Óleos (8-12)
  { id: 8, name: 'Azeite de oliva', kcal: 884, category: 'Gorduras e Óleos' },
  { id: 9, name: 'Óleo de soja', kcal: 884, category: 'Gorduras e Óleos' },
  { id: 10, name: 'Manteiga', kcal: 717, category: 'Gorduras e Óleos' },
  { id: 11, name: 'Margarina', kcal: 717, category: 'Gorduras e Óleos' },
  { id: 12, name: 'Banha de porco', kcal: 902, category: 'Gorduras e Óleos' },

  // 🥛 Laticínios (13-24)
  { id: 13, name: 'Leite integral', kcal: 61, category: 'Laticínios' },
  { id: 14, name: 'Leite desnatado', kcal: 35, category: 'Laticínios' },
  { id: 15, name: 'Leite semidesnatado', kcal: 46, category: 'Laticínios' },
  { id: 16, name: 'Leite em pó', kcal: 496, category: 'Laticínios' },
  { id: 17, name: 'Queijo mussarela', kcal: 330, category: 'Laticínios' },
  { id: 18, name: 'Queijo prato', kcal: 360, category: 'Laticínios' },
  { id: 19, name: 'Queijo parmesão', kcal: 431, category: 'Laticínios' },
  { id: 20, name: 'Queijo minas frescal', kcal: 264, category: 'Laticínios' },
  { id: 21, name: 'Queijo ricota', kcal: 174, category: 'Laticínios' },
  { id: 22, name: 'Requeijão cremoso', kcal: 257, category: 'Laticínios' },
  { id: 23, name: 'Cream cheese', kcal: 342, category: 'Laticínios' },
  { id: 24, name: 'Queijo provolone', kcal: 351, category: 'Laticínios' },
  { id: 25, name: 'Queijo cottage', kcal: 98, category: 'Laticínios' },
  { id: 26, name: 'Iogurte natural', kcal: 51, category: 'Laticínios' },
  { id: 27, name: 'Queijo coalho', kcal: 288, category: 'Laticínios' },
  { id: 28, name: 'Queijo minas padrão', kcal: 318, category: 'Laticínios' },

  // 🥩 Carnes (29-43)
  { id: 29, name: 'Carne moída (patinho)', kcal: 133, category: 'Carnes' },
  { id: 30, name: 'Carne moída (acém)', kcal: 280, category: 'Carnes' },
  { id: 31, name: 'Carne bovina (alcatra)', kcal: 163, category: 'Carnes' },
  { id: 32, name: 'Carne bovina (picanha)', kcal: 289, category: 'Carnes' },
  { id: 33, name: 'Carne bovina (contrafilé)', kcal: 182, category: 'Carnes' },
  { id: 34, name: 'Carne bovina (maminha)', kcal: 160, category: 'Carnes' },
  { id: 35, name: 'Carne bovina (fraldinha)', kcal: 205, category: 'Carnes' },
  { id: 36, name: 'Carne bovina (costela)', kcal: 320, category: 'Carnes' },
  { id: 37, name: 'Carne bovina (cupim)', kcal: 350, category: 'Carnes' },
  { id: 38, name: 'Frango (peito grelhado)', kcal: 159, category: 'Carnes' },
  { id: 39, name: 'Frango (coxa com pele)', kcal: 215, category: 'Carnes' },
  { id: 40, name: 'Frango (sobrecoxa)', kcal: 200, category: 'Carnes' },
  { id: 41, name: 'Frango desfiado', kcal: 165, category: 'Carnes' },
  { id: 42, name: 'Frango (asa)', kcal: 290, category: 'Carnes' },
  { id: 43, name: 'Calabresa', kcal: 350, category: 'Carnes' },
  { id: 44, name: 'Presunto', kcal: 140, category: 'Carnes' },
  { id: 45, name: 'Peito de peru', kcal: 110, category: 'Carnes' },
  { id: 46, name: 'Bacon', kcal: 540, category: 'Carnes' },
  { id: 47, name: 'Linguiça', kcal: 320, category: 'Carnes' },
  { id: 48, name: 'Carne seca', kcal: 290, category: 'Carnes' },
  { id: 49, name: 'Carne suína (lombo)', kcal: 164, category: 'Carnes' },
  { id: 50, name: 'Carne suína (costela)', kcal: 320, category: 'Carnes' },

  // 🥚 Ovos (51-54)
  { id: 51, name: 'Ovo cru', kcal: 143, category: 'Ovos' },
  { id: 52, name: 'Clara de ovo', kcal: 52, category: 'Ovos' },
  { id: 53, name: 'Gema de ovo', kcal: 322, category: 'Ovos' },

  // 🥔 Legumes e Verduras (55-69)
  { id: 55, name: 'Cenoura crua', kcal: 34, category: 'Legumes e Verduras' },
  { id: 56, name: 'Abobrinha', kcal: 15, category: 'Legumes e Verduras' },
  { id: 57, name: 'Abóbora', kcal: 26, category: 'Legumes e Verduras' },
  { id: 58, name: 'Brócolis cozido', kcal: 25, category: 'Legumes e Verduras' },
  { id: 59, name: 'Espinafre', kcal: 17, category: 'Legumes e Verduras' },
  { id: 60, name: 'Escarola', kcal: 20, category: 'Legumes e Verduras' },
  { id: 61, name: 'Palmito', kcal: 28, category: 'Legumes e Verduras' },
  { id: 62, name: 'Pimentão', kcal: 20, category: 'Legumes e Verduras' },
  { id: 63, name: 'Cogumelo', kcal: 22, category: 'Legumes e Verduras' },

  // 🍅 Temperos e Vegetais Aromáticos (64-76)
  { id: 64, name: 'Tomate', kcal: 15, category: 'Temperos' },
  { id: 65, name: 'Cebola', kcal: 40, category: 'Temperos' },
  { id: 66, name: 'Alho', kcal: 149, category: 'Temperos' },
  { id: 67, name: 'Tomate seco', kcal: 213, category: 'Temperos' },
  { id: 68, name: 'Azeitona', kcal: 115, category: 'Temperos' },
  { id: 69, name: 'Orégano', kcal: 265, category: 'Temperos' },
  { id: 70, name: 'Salsinha', kcal: 36, category: 'Temperos' },
  { id: 71, name: 'Cebolinha', kcal: 32, category: 'Temperos' },
  { id: 72, name: 'Manjericão', kcal: 23, category: 'Temperos' },
  { id: 73, name: 'Gengibre', kcal: 80, category: 'Temperos' },
  { id: 74, name: 'Pimenta-do-reino', kcal: 251, category: 'Temperos' },
  { id: 75, name: 'Cominho', kcal: 375, category: 'Temperos' },
  { id: 76, name: 'Limão', kcal: 32, category: 'Temperos' },

  // 🧂 Outros (77-86)
  { id: 77, name: 'Mel', kcal: 304, category: 'Outros' },
  { id: 78, name: 'Ketchup', kcal: 101, category: 'Outros' },
  { id: 79, name: 'Mostarda', kcal: 66, category: 'Outros' },
  { id: 80, name: 'Maionese', kcal: 680, category: 'Outros' },
  { id: 81, name: 'Molho inglês', kcal: 77, category: 'Outros' },
  { id: 82, name: 'Castanha de caju', kcal: 553, category: 'Outros' },
  { id: 83, name: 'Nozes', kcal: 654, category: 'Outros' },
  { id: 84, name: 'Amendoim', kcal: 567, category: 'Outros' },
  { id: 85, name: 'Passas', kcal: 299, category: 'Outros' },
  { id: 100, name: 'Água', kcal: 0, category: 'Líquidos' },
];

// Função para buscar alimento por nome (match exato)
export function findFoodByName(name: string): TacoFood | undefined {
  return tacoFoods.find(food =>
    food.name.toLowerCase().includes(name.toLowerCase())
  );
}

// Busca fuzzy: retorna sugestões ordenadas por relevância para vincular com ingrediente
export function findClosestTacoMatches(name: string, limit = 5): TacoFood[] {
  if (!name.trim()) return [];
  const term = name.toLowerCase().trim();
  const words = term.split(/\s+/);

  const scored = tacoFoods.map(food => {
    const foodName = food.name.toLowerCase();
    let score = 0;
    // Match exato de substring
    if (foodName.includes(term)) score += 10;
    // Começa com o termo
    if (foodName.startsWith(term)) score += 5;
    // Cada palavra do nome aparece no alimento
    words.forEach(word => {
      if (word.length > 2 && foodName.includes(word)) score += 3;
    });
    // Primeira palavra do alimento bate com a busca
    const firstWord = foodName.split(' ')[0];
    if (words[0] && firstWord.includes(words[0])) score += 2;
    return { food, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.food);
}

// Busca correspondência exata (ignorando acentos e case) para auto-seleção
export function findExactTacoMatch(name: string): TacoFood | undefined {
  if (!name.trim()) return undefined;
  
  const normalize = (str: string) => 
    str.toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .trim();

  const normalizedInput = normalize(name);
  
  return tacoFoods.find(food => normalize(food.name) === normalizedInput);
}

// Função para buscar alimentos por categoria
export function getFoodsByCategory(category: string): TacoFood[] {
  return tacoFoods.filter(food => food.category === category);
}

// Função para buscar todas as categorias únicas
export function getUniqueCategories(): string[] {
  return Array.from(new Set(tacoFoods.map(food => food.category)));
}
