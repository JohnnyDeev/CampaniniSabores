import React from 'react';
import { motion } from 'motion/react';
import { Plus, Minus, Package, Tag } from 'lucide-react';
import type { Promotion, Product } from '../types';

interface ComboCardProps {
  promotion: Promotion;
  products: Product[];
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

export default function ComboCard({ promotion, products, quantity, onAdd, onRemove }: ComboCardProps) {
  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Produto indisponível';
  };

  const originalPrice = promotion.items?.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    return total + (product?.price || 0) * item.quantity;
  }, 0) || 0;

  const savings = originalPrice - (promotion.comboPrice || 0);
  const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  const isExpired = promotion.expiresAt && new Date(promotion.expiresAt) < new Date();

  if (!promotion.active || isExpired) return null;

  return (
    <motion.div
      layout
      className="bg-gradient-to-br from-[#FFF8F5] to-[#FFF3E0] rounded-2xl overflow-hidden shadow-md border-2 border-[#E8A849]/30 hover:shadow-lg transition-all duration-300"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#E8A849] to-[#C75B48] rounded-lg flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <span className="px-2 py-0.5 bg-[#E8A849] text-white rounded-full text-xs font-bold">
              COMBO
            </span>
          </div>
          {savingsPercent > 0 && (
            <div className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full">
              <Tag size={10} />
              <span className="text-xs font-bold">{savingsPercent}% OFF</span>
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-[#3D2A24] mb-1">{promotion.name}</h3>
        {promotion.description && (
          <p className="text-sm text-[#8C7066] mb-3">{promotion.description}</p>
        )}

        <div className="space-y-1 mb-4">
          {promotion.items?.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-[#5D4037]">
              <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-[#C75B48]">
                {item.quantity}
              </span>
              <span>{getProductName(item.productId)}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {originalPrice > 0 && (
              <span className="text-sm text-[#8C7066] line-through">
                R$ {originalPrice.toFixed(2)}
              </span>
            )}
            <span className="text-2xl font-bold text-[#C75B48]">
              R$ {promotion.comboPrice?.toFixed(2)}
            </span>
          </div>
          {savings > 0 && (
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
              Economia de R$ {savings.toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center">
          <div className="flex items-center bg-white rounded-xl p-1 border border-[#F0E4DF]">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onRemove}
              className="p-2 hover:bg-[#F0E4DF]/50 rounded-lg transition-colors text-[#5D4037]"
              disabled={quantity === 0}
            >
              <Minus size={18} />
            </motion.button>
            <motion.span
              key={quantity}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-12 text-center font-bold text-[#3D2A24]"
            >
              {quantity}
            </motion.span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onAdd}
              className="p-2 hover:bg-[#C75B48]/10 rounded-lg transition-colors text-[#C75B48]"
            >
              <Plus size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
