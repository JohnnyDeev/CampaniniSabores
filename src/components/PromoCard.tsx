import React from 'react';
import { motion } from 'motion/react';
import { Gift, ArrowRight } from 'lucide-react';
import type { Promotion, Product } from '../types';

interface PromoCardProps {
  promotion: Promotion;
  applicableProducts: Product[];
  onApply?: () => void;
}

export default function PromoCard({ promotion, applicableProducts, onApply }: PromoCardProps) {
  return (
    <motion.div
      layout
      className="bg-gradient-to-br from-[#FFF5F5] to-[#FFF0F0] rounded-2xl p-5 border-2 border-[#FF5C00]/20 shadow-sm relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF5C00]/5 rounded-full -mr-12 -mt-12" />
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-[#FF5C00]/10">
          <Gift size={24} className="text-[#FF5C00]" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-[#FF5C00] text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
              Oferta
            </span>
            <h3 className="text-lg font-bold text-[#3D2A24]">{promotion.name}</h3>
          </div>
          
          <p className="text-sm text-[#8C7066] mb-3">{promotion.description}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {applicableProducts.map(product => (
              <span 
                key={product.id}
                className="text-[11px] px-2 py-1 bg-white border border-[#FF5C00]/10 rounded-lg text-[#5D4037] font-medium"
              >
                {product.name}
              </span>
            ))}
          </div>

          <motion.button
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onApply}
            className="flex items-center gap-2 text-[#FF5C00] font-bold text-sm"
          >
            Ver detalhes
            <ArrowRight size={16} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

