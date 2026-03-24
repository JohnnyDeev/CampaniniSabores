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
  // 🥖 Cereais e Massas (1-10)
  { id: 1, name: 'Farinha de trigo', kcal: 365, category: 'Cereais e Massas' },
  { id: 2, name: 'Farinha integral', kcal: 340, category: 'Cereais e Massas' },
  { id: 3, name: 'Arroz branco cozido', kcal: 128, category: 'Cereais e Massas' },
  { id: 4, name: 'Pão francês', kcal: 300, category: 'Cereais e Massas' },
  { id: 5, name: 'Tapioca (goma)', kcal: 342, category: 'Cereais e Massas' },
  { id: 6, name: 'Aveia em flocos', kcal: 394, category: 'Cereais e Massas' },
  { id: 7, name: 'Macarrão cozido', kcal: 102, category: 'Cereais e Massas' },
  { id: 8, name: 'Macarrão integral', kcal: 124, category: 'Cereais e Massas' },
  { id: 9, name: 'Pão de forma', kcal: 253, category: 'Cereais e Massas' },
  { id: 10, name: 'Pão integral', kcal: 246, category: 'Cereais e Massas' },

  // 🧈 Gorduras e Óleos (11-15)
  { id: 11, name: 'Azeite de oliva', kcal: 884, category: 'Gorduras e Óleos' },
  { id: 12, name: 'Óleo de soja', kcal: 884, category: 'Gorduras e Óleos' },
  { id: 13, name: 'Manteiga', kcal: 717, category: 'Gorduras e Óleos' },
  { id: 14, name: 'Margarina', kcal: 717, category: 'Gorduras e Óleos' },
  { id: 15, name: 'Banha de porco', kcal: 902, category: 'Gorduras e Óleos' },

  // 🥛 Laticínios (16-28)
  { id: 16, name: 'Leite integral', kcal: 61, category: 'Laticínios' },
  { id: 17, name: 'Leite desnatado', kcal: 35, category: 'Laticínios' },
  { id: 18, name: 'Leite semidesnatado', kcal: 46, category: 'Laticínios' },
  { id: 19, name: 'Queijo mussarela', kcal: 330, category: 'Laticínios' },
  { id: 20, name: 'Queijo prato', kcal: 360, category: 'Laticínios' },
  { id: 21, name: 'Queijo parmesão', kcal: 431, category: 'Laticínios' },
  { id: 22, name: 'Queijo minas frescal', kcal: 264, category: 'Laticínios' },
  { id: 23, name: 'Queijo ricota', kcal: 174, category: 'Laticínios' },
  { id: 24, name: 'Requeijão cremoso', kcal: 257, category: 'Laticínios' },
  { id: 25, name: 'Cream cheese', kcal: 342, category: 'Laticínios' },
  { id: 26, name: 'Queijo provolone', kcal: 351, category: 'Laticínios' },
  { id: 27, name: 'Queijo cottage', kcal: 98, category: 'Laticínios' },
  { id: 28, name: 'Iogurte natural', kcal: 51, category: 'Laticínios' },
  { id: 29, name: 'Iogurte grego', kcal: 90, category: 'Laticínios' },
  { id: 30, name: 'Queijo coalho', kcal: 288, category: 'Laticínios' },
  { id: 31, name: 'Queijo minas padrão', kcal: 318, category: 'Laticínios' },

  // 🥩 Carnes (32-50)
  { id: 32, name: 'Carne moída (patinho)', kcal: 133, category: 'Carnes' },
  { id: 33, name: 'Carne moída (acém)', kcal: 280, category: 'Carnes' },
  { id: 34, name: 'Carne bovina (alcatra)', kcal: 163, category: 'Carnes' },
  { id: 35, name: 'Carne bovina (picanha)', kcal: 289, category: 'Carnes' },
  { id: 36, name: 'Carne bovina (contrafilé)', kcal: 182, category: 'Carnes' },
  { id: 37, name: 'Carne bovina (maminha)', kcal: 160, category: 'Carnes' },
  { id: 38, name: 'Carne bovina (fraldinha)', kcal: 205, category: 'Carnes' },
  { id: 39, name: 'Carne bovina (costela)', kcal: 320, category: 'Carnes' },
  { id: 40, name: 'Carne bovina (cupim)', kcal: 350, category: 'Carnes' },
  { id: 41, name: 'Frango (peito grelhado)', kcal: 159, category: 'Carnes' },
  { id: 42, name: 'Frango (coxa com pele)', kcal: 215, category: 'Carnes' },
  { id: 43, name: 'Frango (sobrecoxa)', kcal: 200, category: 'Carnes' },
  { id: 44, name: 'Frango desfiado', kcal: 165, category: 'Carnes' },
  { id: 45, name: 'Frango (asa)', kcal: 290, category: 'Carnes' },
  { id: 46, name: 'Calabresa', kcal: 350, category: 'Carnes' },
  { id: 47, name: 'Presunto', kcal: 140, category: 'Carnes' },
  { id: 48, name: 'Peito de peru', kcal: 110, category: 'Carnes' },
  { id: 49, name: 'Bacon', kcal: 540, category: 'Carnes' },
  { id: 50, name: 'Linguiça', kcal: 320, category: 'Carnes' },
  { id: 51, name: 'Carne seca', kcal: 290, category: 'Carnes' },
  { id: 52, name: 'Hambúrguer bovino', kcal: 250, category: 'Carnes' },
  { id: 53, name: 'Carne suína (lombo)', kcal: 164, category: 'Carnes' },
  { id: 54, name: 'Carne suína (costela)', kcal: 320, category: 'Carnes' },

  // 🐟 Peixes (55-58)
  { id: 55, name: 'Atum em lata', kcal: 116, category: 'Peixes' },
  { id: 56, name: 'Tilápia grelhada', kcal: 128, category: 'Peixes' },
  { id: 57, name: 'Salmão grelhado', kcal: 208, category: 'Peixes' },
  { id: 58, name: 'Sardinha em lata', kcal: 208, category: 'Peixes' },

  // 🥚 Ovos (59-61)
  { id: 59, name: 'Ovo cozido', kcal: 155, category: 'Ovos' },
  { id: 60, name: 'Ovo frito', kcal: 196, category: 'Ovos' },
  { id: 61, name: 'Ovo mexido', kcal: 175, category: 'Ovos' },

  // 🌾 Leguminosas (62-66)
  { id: 62, name: 'Feijão carioca cozido', kcal: 76, category: 'Leguminosas' },
  { id: 63, name: 'Feijão preto cozido', kcal: 77, category: 'Leguminosas' },
  { id: 64, name: 'Grão de bico cozido', kcal: 164, category: 'Leguminosas' },
  { id: 65, name: 'Lentilha cozida', kcal: 93, category: 'Leguminosas' },
  { id: 66, name: 'Ervilha', kcal: 81, category: 'Leguminosas' },

  // 🥔 Legumes e Verduras (67-85)
  { id: 67, name: 'Batata inglesa cozida', kcal: 52, category: 'Legumes e Verduras' },
  { id: 68, name: 'Batata doce cozida', kcal: 77, category: 'Legumes e Verduras' },
  { id: 69, name: 'Mandioca cozida', kcal: 125, category: 'Legumes e Verduras' },
  { id: 70, name: 'Cenoura crua', kcal: 34, category: 'Legumes e Verduras' },
  { id: 71, name: 'Abobrinha', kcal: 15, category: 'Legumes e Verduras' },
  { id: 72, name: 'Berinjela', kcal: 19, category: 'Legumes e Verduras' },
  { id: 73, name: 'Chuchu cozido', kcal: 17, category: 'Legumes e Verduras' },
  { id: 74, name: 'Abóbora', kcal: 26, category: 'Legumes e Verduras' },
  { id: 75, name: 'Brócolis cozido', kcal: 25, category: 'Legumes e Verduras' },
  { id: 76, name: 'Couve-flor cozida', kcal: 19, category: 'Legumes e Verduras' },
  { id: 77, name: 'Espinafre', kcal: 17, category: 'Legumes e Verduras' },
  { id: 78, name: 'Couve', kcal: 27, category: 'Legumes e Verduras' },
  { id: 79, name: 'Alface', kcal: 11, category: 'Legumes e Verduras' },
  { id: 80, name: 'Rúcula', kcal: 17, category: 'Legumes e Verduras' },
  { id: 81, name: 'Escarola', kcal: 20, category: 'Legumes e Verduras' },
  { id: 82, name: 'Palmito', kcal: 28, category: 'Legumes e Verduras' },
  { id: 83, name: 'Pepino', kcal: 10, category: 'Legumes e Verduras' },
  { id: 84, name: 'Pimentão', kcal: 20, category: 'Legumes e Verduras' },
  { id: 85, name: 'Cogumelo', kcal: 22, category: 'Legumes e Verduras' },

  // 🍅 Temperos e Vegetais Aromáticos (86-97)
  { id: 86, name: 'Tomate', kcal: 15, category: 'Temperos' },
  { id: 87, name: 'Cebola', kcal: 40, category: 'Temperos' },
  { id: 88, name: 'Alho', kcal: 149, category: 'Temperos' },
  { id: 89, name: 'Tomate seco', kcal: 213, category: 'Temperos' },
  { id: 90, name: 'Azeitona', kcal: 115, category: 'Temperos' },
  { id: 91, name: 'Orégano', kcal: 265, category: 'Temperos' },
  { id: 92, name: 'Salsinha', kcal: 36, category: 'Temperos' },
  { id: 93, name: 'Cebolinha', kcal: 32, category: 'Temperos' },
  { id: 94, name: 'Manjericão', kcal: 23, category: 'Temperos' },
  { id: 95, name: 'Gengibre', kcal: 80, category: 'Temperos' },
  { id: 96, name: 'Pimenta-do-reino', kcal: 251, category: 'Temperos' },
  { id: 97, name: 'Cominho', kcal: 375, category: 'Temperos' },

  // 🧂 Outros (98-110)
  { id: 98, name: 'Açúcar', kcal: 387, category: 'Outros' },
  { id: 99, name: 'Sal', kcal: 0, category: 'Outros' },
  { id: 100, name: 'Fermento biológico', kcal: 90, category: 'Outros' },
  { id: 101, name: 'Gergelim', kcal: 573, category: 'Outros' },
  { id: 102, name: 'Castanha de caju', kcal: 553, category: 'Outros' },
  { id: 103, name: 'Nozes', kcal: 654, category: 'Outros' },
  { id: 104, name: 'Amendoim', kcal: 567, category: 'Outros' },
  { id: 105, name: 'Passas', kcal: 299, category: 'Outros' },
  { id: 106, name: 'Mel', kcal: 304, category: 'Outros' },
  { id: 107, name: 'Ketchup', kcal: 101, category: 'Outros' },
  { id: 108, name: 'Mostarda', kcal: 66, category: 'Outros' },
  { id: 109, name: 'Maionese', kcal: 680, category: 'Outros' },
  { id: 110, name: 'Molho inglês', kcal: 77, category: 'Outros' },
];

// Função para buscar alimento por nome
export function findFoodByName(name: string): TacoFood | undefined {
  return tacoFoods.find(food => 
    food.name.toLowerCase().includes(name.toLowerCase())
  );
}

// Função para buscar alimentos por categoria
export function getFoodsByCategory(category: string): TacoFood[] {
  return tacoFoods.filter(food => food.category === category);
}

// Função para buscar todas as categorias únicas
export function getUniqueCategories(): string[] {
  return Array.from(new Set(tacoFoods.map(food => food.category)));
}
