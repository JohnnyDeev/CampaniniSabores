import { motion } from 'motion/react';
import { Sparkles, Plus } from 'lucide-react';
import type { Product } from '../types';

interface IdleCartSuggestionsProps {
  products: Product[];
  onAddProduct: (productId: string) => void;
  getQuantity: (productId: string) => number;
}

export default function IdleCartSuggestions({ 
  products, 
  onAddProduct, 
  getQuantity 
}: IdleCartSuggestionsProps) {
  const suggestedProducts = products.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#FFF8F5] to-[#FFF3E0] rounded-2xl p-5 border border-[#E8A849]/30"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} className="text-[#E8A849]" />
        <h3 className="text-lg font-bold text-[#3D2A24]">Sugestões pra você</h3>
      </div>
      
      <p className="text-sm text-[#8C7066] mb-4">
        Que tal adicionar alguns favoritos ao seu pedido?
      </p>

      <div className="grid grid-cols-2 gap-3">
        {suggestedProducts.map(product => {
          const quantity = getQuantity(product.id);
          
          return (
            <motion.div
              key={product.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-xl p-3 shadow-sm border border-[#F0E4DF]"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-semibold text-[#3D2A24] line-clamp-1">
                  {product.name}
                </h4>
                <span className="text-sm font-bold text-[#C75B48]">
                  R$ {product.price.toFixed(2)}
                </span>
              </div>
              
              <button
                onClick={() => onAddProduct(product.id)}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                  quantity > 0
                    ? 'bg-[#C75B48] text-white'
                    : 'bg-[#FFF8F5] text-[#C75B48] hover:bg-[#C75B48] hover:text-white'
                }`}
              >
                {quantity > 0 ? (
                  <>
                    <Plus size={14} />
                    <span>Mais {quantity}</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Adicionar</span>
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function EmptyBagCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <div className="w-16 h-16 bg-[#F0E4DF] rounded-full flex items-center justify-center mx-auto mb-4">
        <Sparkles size={32} className="text-[#C75B48]" />
      </div>
      <h3 className="text-xl font-bold text-[#3D2A24] mb-2">
        Sua sacola está vazia
      </h3>
      <p className="text-[#8C7066]">
        Adicione produtos do cardápio para fazer seu pedido
      </p>
    </motion.div>
  );
}
