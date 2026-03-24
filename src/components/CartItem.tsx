import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { BagItem, Product, Promotion } from '../types';

interface CartItemProps {
  key?: string | number;
  item: BagItem;
  product?: Product;
  promotion?: Promotion;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export default function CartItem({
  item,
  product,
  promotion,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const isCombo = !!item.comboId;
  const name = isCombo ? promotion?.name : product?.name;
  const price = isCombo ? promotion?.comboPrice : product?.price;
  const image = isCombo ? promotion?.image : product?.image;

  if (!name || price === undefined) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 py-4 border-b border-border-light/50 last:border-0"
    >
      <div className="w-16 h-16 bg-background rounded-xl overflow-hidden flex-shrink-0 border border-border-light/50">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <img 
            src="/esfiha-placeholder.png" 
            alt={name} 
            className="w-full h-full object-cover opacity-70" 
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-text-main text-sm truncate uppercase tracking-tight">{name}</h4>
        {isCombo && item.comboItems && (
          <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
            {item.comboItems.map(ci => ci.quantity + 'x ' + ci.productId).join(', ')}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-primary">
            R$ {(price * item.quantity).toFixed(2)}
          </span>
          
          <div className="flex items-center bg-background rounded-lg p-0.5 border border-border-light/50">
            {item.quantity <= 1 ? (
              <button
                onClick={onRemove}
                className="p-1 hover:bg-red-50 text-red-400 rounded-md transition-colors"
              >
                <Trash2 size={14} />
              </button>
            ) : (
              <button
                onClick={() => onUpdateQuantity(item.quantity - 1)}
                className="p-1 hover:bg-white text-text-main rounded-md transition-colors"
              >
                <Minus size={14} />
              </button>
            )}
            
            <span className="w-7 text-center text-xs font-bold text-text-main">{item.quantity}</span>
            
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="p-1 hover:bg-white text-primary rounded-md transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
