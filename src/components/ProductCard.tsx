import React from 'react';
import { motion } from 'motion/react';
import { Plus, Minus, Star, Leaf, Heart } from 'lucide-react';
import type { Product } from '../types';

interface ProductCardProps {
  key?: string | number;
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  onRate?: () => void;
  averageRating: number;
}

export default function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
  onRate,
  averageRating = 4.5,
}: ProductCardProps) {
  const isFit = product.category === 'fit';
  const isMostOrdered = product.tags?.includes('Mais Pedido');

  return (
    <motion.div
      layout
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-border-light hover:shadow-md transition-all group flex flex-col h-full"
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-background overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <img
            src="/esfiha-placeholder.png"
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
          />
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
          {isMostOrdered && (
            <span className="bg-secondary text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm w-fit uppercase">
              Mais Pedido
            </span>
          )}
          {isFit && (
            <span className="bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm w-fit uppercase">
              FIT
            </span>
          )}
          {product.tags && product.tags.filter(t => t !== 'Mais Pedido').map((tag, i) => (
            <span key={i} className="bg-white/90 backdrop-blur-sm text-primary text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-primary/10 w-fit">
              {tag}
            </span>
          ))}
        </div>

        {/* Floating Add Button */}
        <div className="absolute bottom-2 right-2">
          {quantity > 0 ? (
            <div className="flex items-center bg-white rounded-full p-0.5 shadow-lg border border-border-light transition-all origin-right">
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="w-8 h-8 flex items-center justify-center text-text-main hover:bg-background rounded-full transition-all"
              >
                <Minus size={16} />
              </motion.button>
              <span className="w-6 text-center text-sm font-bold text-text-main">{quantity}</span>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full shadow-sm shadow-primary/20"
              >
                <Plus size={16} />
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="w-10 h-10 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-all"
            >
              <Plus size={24} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1 gap-1">
          <h4 className="font-bold text-text-main text-[13px] leading-tight line-clamp-2 min-h-[2rem]">
            {product.name}
          </h4>
        </div>

        <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed mb-auto opacity-80">
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-light/50">
          <div className="flex flex-col">
            <span className="text-[9px] text-text-muted font-medium uppercase tracking-tighter">A partir de</span>
            <span className="text-sm font-bold text-primary">R$ {product.price.toFixed(2)}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRate?.(); }}
            className="flex items-center gap-1 bg-background px-2 py-1.5 rounded-lg border border-border-light hover:bg-[#FFF7F2] hover:border-[#FF5C00]/30 transition-all active:scale-95 group/rating"
            title={averageRating > 0 ? `Avaliar produto (média: ${averageRating.toFixed(1)})` : 'Avaliar produto'}
          >
            <Star size={12} className="text-secondary fill-secondary group-hover/rating:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-text-main">Avaliar</span>
            {averageRating > 0 && (
              <span className="text-[9px] font-medium text-text-muted ml-0.5">({averageRating.toFixed(1)})</span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
