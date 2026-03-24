import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AddToCartAnimation {
  id: string;
  productName: string;
}

interface AddToCartContextType {
  triggerAnimation: (productId: string, productName: string) => void;
}

const AddToCartContext = createContext<AddToCartContextType | null>(null);

export function useAddToCartAnimation() {
  const context = useContext(AddToCartContext);
  if (!context) {
    return { triggerAnimation: () => {} };
  }
  return context;
}

export function AddToCartProvider({ children }: { children: React.ReactNode }) {
  const [animations, setAnimations] = useState<AddToCartAnimation[]>([]);

  const triggerAnimation = useCallback((productId: string, productName: string) => {
    const id = Date.now().toString();
    setAnimations(prev => [...prev, { id, productName }]);
    
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 1000);
  }, []);

  return (
    <AddToCartContext.Provider value={{ triggerAnimation }}>
      {children}
      <AddToCartAnimations animations={animations} />
    </AddToCartContext.Provider>
  );
}

function AddToCartAnimations({ animations }: { animations: AddToCartAnimation[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {animations.map(anim => (
          <motion.div
            key={anim.id}
            initial={{ opacity: 1, scale: 0.5, y: 0, x: 0 }}
            animate={{ 
              opacity: 0, 
              scale: 1.5, 
              y: -100,
              x: 50
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 bg-[#FF5C00] text-white px-4 py-2 rounded-full shadow-lg">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                className="text-xl font-bold"
              >
                +1
              </motion.span>
              <span className="text-sm font-medium">{anim.productName}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AddToBagButton({ 
  onClick, 
  quantity, 
  isAdding 
}: { 
  onClick: () => void; 
  quantity: number; 
  isAdding?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all flex items-center justify-center ${
        quantity > 0 
          ? 'bg-[#FF5C00]/10 text-[#FF5C00] hover:bg-[#FF5C00]/20' 
          : 'bg-[#FFF7F2] text-[#FF5C00] hover:bg-[#F0E4DF]'
      }`}
    >
      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div
            key="adding"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
            </svg>
          </motion.div>
        ) : quantity > 0 ? (
          <motion.div
            key="plus-minus"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.div>
        ) : (
          <motion.div
            key="plus"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function CartBadge() {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-[#FF5C00] to-[#E65100] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md"
    />
  );
}

