/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Star, 
  ArrowLeft, 
  CheckCircle2, 
  MessageCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type Screen = 'welcome' | 'menu' | 'bag' | 'success';

interface Esfiha {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface Rating {
  id: string;
  productId: string;
  score: number;
  comment: string;
}

interface BagItem {
  productId: string;
  quantity: number;
}

// --- Constants ---

const PRODUCTS: Esfiha[] = [
  { id: '1', name: 'Esfiha de Espinafre com Ricota e Tomate Seco', description: 'Pacote com 10 unidades | 40 g cada unidade | Pré-assadas e congeladas, é só aquecer em casa', price: 30 },
  { id: '2', name: 'Esfiha de Escarola com Queijo', description: 'Pacote com 10 unidades | 40 g cada unidade | Pré-assadas e congeladas, é só aquecer em casa', price: 30 },
  { id: '3', name: 'Esfiha de Calabresa com Queijo', description: 'Pacote com 10 unidades | 40 g cada unidade | Pré-assadas e congeladas, é só aquecer em casa', price: 30 },
  { id: '4', name: 'Esfiha de Calabresa com Catupiry', description: 'Pacote com 10 unidades | 40 g cada unidade | Pré-assadas e congeladas, é só aquecer em casa', price: 30 },
  { id: '5', name: 'Esfiha de Frango com Catupiry', description: 'Pacote com 10 unidades | 40 g cada unidade | Pré-assadas e congeladas, é só aquecer em casa', price: 30 },
  { id: '6', name: 'Esfiha de Carne', description: 'Pacote com 10 unidades | 40 g cada unidade | Pré-assadas e congeladas, é só aquecer em casa', price: 30 },
  { id: '7', name: 'Esfiha de Palmito com Catupiry', description: 'Pacote com 10 unidades | 40 g cada unidade | Pré-assadas e congeladas, é só aquecer em casa', price: 30 },
  { id: '8', name: 'Esfiha de Queijo', description: 'Pacote com 10 unidades | 40 g cada unidade | Pré-assadas e congeladas, é só aquecer em casa', price: 30 },
];

const WHATSAPP_NUMBER = '+5511991938761';

// --- Animation Variants ---

const screenVariants = {
  initial: { opacity: 0, x: 10, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -10, scale: 0.98, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

// --- Components ---

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [bag, setBag] = useState<BagItem[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', address: '', obs: '' });
  const [orderMessage, setOrderMessage] = useState('');
  const [ratingProduct, setRatingProduct] = useState<Esfiha | null>(null);

  // Load ratings from localStorage on mount
  useEffect(() => {
    const savedRatings = localStorage.getItem('campanini_ratings');
    if (savedRatings) setRatings(JSON.parse(savedRatings));
  }, []);

  // Save ratings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('campanini_ratings', JSON.stringify(ratings));
  }, [ratings]);

  const addToBag = (productId: string) => {
    setBag(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromBag = (productId: string) => {
    setBag(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.productId !== productId);
    });
  };

  const getQuantity = (productId: string) => {
    return bag.find(item => item.productId === productId)?.quantity || 0;
  };

  const totalItems = bag.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = bag.reduce((acc, item) => {
    const product = PRODUCTS.find(p => p.id === item.productId);
    return acc + (product?.price || 0) * item.quantity;
  }, 0);

  const getAverageRating = (productId: string) => {
    const productRatings = ratings.filter(r => r.productId === productId);
    if (productRatings.length === 0) return 0;
    const sum = productRatings.reduce((acc, r) => acc + r.score, 0);
    return sum / productRatings.length;
  };

  const handleRegisterOrder = () => {
    if (bag.length === 0) {
      alert('Sua sacola está vazia!');
      return;
    }
    if (!customerInfo.name || !customerInfo.address) {
      alert('Por favor, preencha seu nome e endereço.');
      return;
    }

    let message = `Olá! Gostaria de fazer um pedido:\n\n`;
    message += `*Cliente:* ${customerInfo.name}\n`;
    message += `*Endereço:* ${customerInfo.address}\n`;
    if (customerInfo.obs) message += `*Observações:* ${customerInfo.obs}\n`;
    message += `\n*Itens do Pedido:*\n`;

    bag.forEach(item => {
      const product = PRODUCTS.find(p => p.id === item.productId);
      if (product) {
        message += `– ${item.quantity}x ${product.name} (R$ ${product.price.toFixed(2)} cada)\n`;
      }
    });

    message += `\n*Total (sem frete): R$ ${totalPrice.toFixed(2)}*\n`;
    message += `\nO valor do frete será combinado em seguida.`;

    setOrderMessage(message);
    setCurrentScreen('success');
  };

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(orderMessage);
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
  };

  const saveRating = (score: number, comment: string) => {
    if (!ratingProduct) return;
    const newRating: Rating = {
      id: Date.now().toString(),
      productId: ratingProduct.id,
      score,
      comment
    };
    setRatings(prev => [...prev, newRating]);
    setRatingProduct(null);
  };

  return (
    <div className="min-h-screen bg-[#EAB308] text-[#7F1D1D] font-sans selection:bg-[#7F1D1D] selection:text-white">
      <AnimatePresence mode="wait">
        {currentScreen === 'welcome' && (
          <WelcomeScreen key="welcome" onNext={() => setCurrentScreen('menu')} />
        )}
        {currentScreen === 'menu' && (
          <MenuScreen 
            key="menu" 
            onNext={() => setCurrentScreen('bag')} 
            addToBag={addToBag}
            removeFromBag={removeFromBag}
            getQuantity={getQuantity}
            totalItems={totalItems}
            getAverageRating={getAverageRating}
            onRate={setRatingProduct}
          />
        )}
        {currentScreen === 'bag' && (
          <BagScreen 
            key="bag" 
            bag={bag}
            totalPrice={totalPrice}
            customerInfo={customerInfo}
            setCustomerInfo={setCustomerInfo}
            onBack={() => setCurrentScreen('menu')}
            onRegister={handleRegisterOrder}
          />
        )}
        {currentScreen === 'success' && (
          <SuccessScreen key="success" onSend={openWhatsApp} />
        )}
      </AnimatePresence>

      {/* Rating Dialog */}
      <AnimatePresence>
        {ratingProduct && (
          <RatingDialog 
            product={ratingProduct} 
            onClose={() => setRatingProduct(null)} 
            onSave={saveRating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Screen Components ---

function WelcomeScreen({ onNext }: { onNext: () => void; key?: string }) {
  return (
    <motion.div 
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-md mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-screen text-center"
    >
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 100 }}
        className="flex flex-col items-center mb-10"
      >
        <div className="bg-[#7F1D1D] p-4 rounded-full mb-4 shadow-lg">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" x2="18" y1="17" y2="17" />
          </svg>
        </div>
        <h1 className="text-5xl font-black tracking-tighter uppercase text-[#7F1D1D] drop-shadow-sm leading-none">
          Campanini
        </h1>
        <div className="flex items-center gap-2 w-full mt-1">
          <div className="h-[2px] flex-1 bg-[#7F1D1D]"></div>
          <span className="text-2xl font-bold tracking-[0.2em] text-[#7F1D1D] uppercase">Sabores</span>
          <div className="h-[2px] flex-1 bg-[#7F1D1D]"></div>
        </div>
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} fill="#7F1D1D" className="text-[#7F1D1D]" />)}
        </div>
      </motion.div>
      
      <motion.div 
        variants={itemVariants}
        className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl text-left mb-10 border-2 border-[#7F1D1D]/5"
      >
        <p className="whitespace-pre-line leading-relaxed">
          Oiê! 👋💛{"\n\n"}
          Seja muito bem-vindo(a) à nossa família de apaixonados por esfihas 🥟✨{"\n\n"}
          Aqui cada pedido é feito com muito carinho e dedicação — e eu fico super feliz em ter você por aqui! 🤗💫
          {"\n\n"}
          Trabalhamos com esfihas pré-assadas e congeladas, perfeitas pra deixar seu dia mais prático e saboroso 😋
          É só aquecer no forno ou na airfryer e pronto: delícia garantida em poucos minutinhos! 🔥💨
          {"\n\n"}
          Agora é só escolher seus sabores favoritos! 💛
          (Ah e se quiser adaptar algum, também pode)
          {"\n\n"}
          Qualquer dúvida ou vontade, me chama aqui no WhatsApp 📲😉
        </p>
      </motion.div>

      <motion.button 
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        className="w-full bg-[#7F1D1D] text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:bg-[#991B1B] transition-colors"
      >
        Veja nosso cardápio
      </motion.button>
    </motion.div>
  );
}

function MenuScreen({ 
  onNext, 
  addToBag, 
  removeFromBag, 
  getQuantity, 
  totalItems,
  getAverageRating,
  onRate
}: { 
  onNext: () => void;
  addToBag: (id: string) => void;
  removeFromBag: (id: string) => void;
  getQuantity: (id: string) => number;
  totalItems: number;
  getAverageRating: (id: string) => number;
  onRate: (product: Esfiha) => void;
  key?: string;
}) {
  return (
    <motion.div 
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-2xl mx-auto px-4 py-8 pb-32"
    >
      <div className="flex justify-between items-center mb-8">
        <motion.h2 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="text-3xl font-bold"
        >
          Cardápio
        </motion.h2>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onNext}
          className="relative p-3 bg-white rounded-full shadow-md text-[#7F1D1D] transition-transform"
        >
          <motion.div
            key={totalItems}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
          >
            <ShoppingBag size={24} />
          </motion.div>
          {totalItems > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-[#7F1D1D] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white"
            >
              {totalItems}
            </motion.span>
          )}
        </motion.button>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {PRODUCTS.map(product => (
          <motion.div 
            key={product.id}
            variants={itemVariants}
            layout
            className="bg-white rounded-2xl p-6 shadow-md border border-[#7F1D1D]/5"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold leading-tight">{product.name}</h3>
              <span className="text-lg font-bold whitespace-nowrap ml-4">R$ {product.price.toFixed(2)}</span>
            </div>
            
            <p className="text-sm text-[#7F1D1D]/70 mb-4 leading-relaxed">
              {product.description}
            </p>

            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center text-yellow-500">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={16} 
                    fill={star <= Math.round(getAverageRating(product.id)) ? "currentColor" : "none"} 
                    className={star <= Math.round(getAverageRating(product.id)) ? "" : "text-gray-300"}
                  />
                ))}
              </div>
              <span className="text-xs font-medium opacity-60">
                {getAverageRating(product.id).toFixed(1)}
              </span>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                onClick={() => onRate(product)}
                className="text-xs font-semibold underline ml-2"
              >
                Avaliar
              </motion.button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center bg-[#EAB308]/10 rounded-lg p-1">
                <motion.button 
                  whileTap={{ scale: 0.8 }}
                  onClick={() => removeFromBag(product.id)}
                  className="p-2 hover:bg-white rounded-md transition-colors"
                >
                  <Minus size={18} />
                </motion.button>
                <motion.span 
                  key={getQuantity(product.id)}
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-10 text-center font-bold"
                >
                  {getQuantity(product.id)}
                </motion.span>
                <motion.button 
                  whileTap={{ scale: 0.8 }}
                  onClick={() => addToBag(product.id)}
                  className="p-2 hover:bg-white rounded-md transition-colors"
                >
                  <Plus size={18} />
                </motion.button>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => addToBag(product.id)}
                className="bg-[#7F1D1D] text-white px-6 py-2 rounded-lg font-semibold shadow-sm transition-transform"
              >
                Adicionar
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {totalItems > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto"
        >
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNext}
            className="w-full bg-[#7F1D1D] text-white py-4 rounded-xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 transition-transform"
          >
            <ShoppingBag size={20} />
            Ver Sacola ({totalItems})
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

function BagScreen({ 
  bag, 
  totalPrice, 
  customerInfo, 
  setCustomerInfo, 
  onBack, 
  onRegister 
}: { 
  bag: BagItem[];
  totalPrice: number;
  customerInfo: { name: string; address: string; obs: string };
  setCustomerInfo: React.Dispatch<React.SetStateAction<{ name: string; address: string; obs: string }>>;
  onBack: () => void;
  onRegister: () => void;
  key?: string;
}) {
  return (
    <motion.div 
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack} 
          className="p-2 bg-white rounded-full shadow-sm"
        >
          <ArrowLeft size={24} />
        </motion.button>
        <h2 className="text-3xl font-bold">Sua sacola</h2>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="bg-white rounded-2xl p-6 shadow-md mb-8 space-y-4"
      >
        {bag.length === 0 ? (
          <p className="text-center py-8 opacity-60">Sua sacola está vazia.</p>
        ) : (
          <>
            {bag.map(item => {
              const product = PRODUCTS.find(p => p.id === item.productId);
              if (!product) return null;
              return (
                <motion.div 
                  key={item.productId} 
                  variants={itemVariants}
                  className="flex justify-between items-center border-b border-[#7F1D1D]/5 pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <h4 className="font-bold">{product.name}</h4>
                    <p className="text-sm opacity-60">{item.quantity} pacotes x R$ {product.price.toFixed(2)}</p>
                  </div>
                  <span className="font-bold">R$ {(item.quantity * product.price).toFixed(2)}</span>
                </motion.div>
              );
            })}
            
            <motion.div variants={itemVariants} className="pt-4 border-t-2 border-[#7F1D1D]/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold">Total (sem frete)</span>
                <span className="text-2xl font-bold">R$ {totalPrice.toFixed(2)}</span>
              </div>
              <p className="text-sm text-[#7F1D1D] font-medium bg-[#EAB308]/20 p-3 rounded-lg">
                O valor do frete NÃO está incluso. Combinamos o frete pelo WhatsApp.
              </p>
            </motion.div>
          </>
        )}
      </motion.div>

      <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-4">
        <motion.h3 variants={itemVariants} className="text-xl font-bold px-1">Seus dados</motion.h3>
        <div className="space-y-3">
          <motion.input 
            variants={itemVariants}
            type="text" 
            placeholder="Nome completo *"
            required
            value={customerInfo.name}
            onChange={e => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-white border-none rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#7F1D1D] outline-none transition-shadow"
          />
          <motion.textarea 
            variants={itemVariants}
            placeholder="Endereço completo (rua, número, complemento, bairro, cidade) *"
            required
            rows={3}
            value={customerInfo.address}
            onChange={e => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
            className="w-full bg-white border-none rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#7F1D1D] outline-none transition-shadow"
          />
          <motion.input 
            variants={itemVariants}
            type="text" 
            placeholder="Observações do pedido (opcional)"
            value={customerInfo.obs}
            onChange={e => setCustomerInfo(prev => ({ ...prev, obs: e.target.value }))}
            className="w-full bg-white border-none rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#7F1D1D] outline-none transition-shadow"
          />
        </div>
      </motion.div>

      <motion.button 
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onRegister}
        disabled={bag.length === 0}
        className="w-full bg-[#7F1D1D] text-white py-4 rounded-xl font-bold text-lg shadow-lg mt-8 transition-transform disabled:opacity-50 disabled:scale-100"
      >
        Registrar pedido
      </motion.button>
    </motion.div>
  );
}

function SuccessScreen({ onSend }: { onSend: () => void; key?: string }) {
  return (
    <motion.div 
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-md mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-screen text-center"
    >
      <motion.div 
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="bg-white rounded-full p-4 mb-6 shadow-lg text-green-600"
      >
        <CheckCircle2 size={64} />
      </motion.div>
      
      <motion.h2 
        variants={itemVariants}
        className="text-4xl font-bold mb-4"
      >
        PEDIDO REGISTRADO
      </motion.h2>
      <motion.p 
        variants={itemVariants}
        className="text-lg mb-8 opacity-80"
      >
        Seu pedido foi registrado! Agora é só nos enviar pelo WhatsApp para finalizar.
      </motion.p>

      <motion.button 
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSend}
        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 hover:bg-green-700 transition-colors mb-8"
      >
        <MessageCircle size={24} />
        ENVIAR
      </motion.button>

      <motion.div 
        variants={itemVariants}
        className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-xl text-left border border-[#7F1D1D]/10 w-full"
      >
        <h3 className="font-bold text-xl mb-6 border-b border-[#7F1D1D]/10 pb-2">DICAS DE CONSUMO</h3>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>1️⃣ Não coma congelada! 😂 (Tire 15 minutos antes de preparar)</p>
          <p>2️⃣ Coloque as esfihas numa forma 🥟</p>
          <p>3️⃣ Coloque no forno ou airfryer 🔥 a 120 graus por 15 minutinhos.</p>
          <p>4️⃣ Tire, espere 1 minutinho (se aguentar 😅) e aproveite!</p>
          
          <p className="font-bold pt-2">Bom apetite! 😍</p>
          
          <p className="text-red-700 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
            ⚠️ Importante: não use o micro-ondas 🚫 — ele deixa a massa dura!
          </p>
          
          <div className="pt-4 border-t border-[#7F1D1D]/10 text-xs opacity-70 italic">
            <p className="mb-1">✨ ✉️ E aqui aceitamos feedbacks sinceros!!</p>
            <p>Fique a vontade pra avaliar nossos produtos. Você é nosso termômetro de qualidade. Sua opinião é muito importante.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RatingDialog({ 
  product, 
  onClose, 
  onSave 
}: { 
  product: Esfiha; 
  onClose: () => void; 
  onSave: (score: number, comment: string) => void;
}) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100">
          <X size={24} />
        </button>

        <h3 className="text-2xl font-bold mb-2 pr-8">{product.name}</h3>
        <p className="text-sm opacity-60 mb-6">O que você achou deste sabor?</p>

        <div className="mb-8">
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map(star => (
              <button 
                key={star} 
                onClick={() => setScore(star)}
                className="transition-transform active:scale-125"
              >
                <Star 
                  size={40} 
                  fill={star <= score ? "#EAB308" : "none"} 
                  className={star <= score ? "text-[#EAB308]" : "text-gray-200"}
                />
              </button>
            ))}
          </div>
          <p className="text-center font-bold text-xl text-[#EAB308]">
            {score === 1 && "Poderia ser melhor 😕"}
            {score === 2 && "Regular 😐"}
            {score === 3 && "Gostei! 🙂"}
            {score === 4 && "Muito bom! 😊"}
            {score === 5 && "Excelente! 😍"}
          </p>
        </div>

        <textarea 
          placeholder="Escreva um comentário (opcional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          className="w-full bg-[#EAB308]/5 border-2 border-[#EAB308]/10 rounded-xl p-4 mb-6 focus:border-[#EAB308] outline-none transition-colors"
        />

        <button 
          onClick={() => onSave(score, comment)}
          className="w-full bg-[#7F1D1D] text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
        >
          Salvar avaliação
        </button>
      </motion.div>
    </div>
  );
}
