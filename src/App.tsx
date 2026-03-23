import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Star,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  X,
  Heart,
  Leaf,
  Loader2,
  Camera,
  LogOut,
  User,
  Gift,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { db, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, where, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase';
import { User as FirebaseUser } from 'firebase/auth';
import type { Product, Rating, BagItem, Address, Customer, Coupon, Promotion } from './types';
import { getCustomer, createCustomer, addLoyaltyPoints } from './services/CustomerService';
import LoginModal from './components/LoginModal';
import CouponInput from './components/CouponInput';
import { recordCouponUse } from './services/CouponService';
import { getActivePromotions } from './services/PromotionService';
import ComboCard from './components/ComboCard';

type Screen = 'welcome' | 'menu' | 'bag' | 'success';

const WHATSAPP_NUMBER = '+5511991938761';

const screenVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const containerVariants = {
  animate: { transition: { staggerChildren: 0.07 } }
};

const itemVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

export default function App() {
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [bag, setBag] = useState<BagItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    obs: ''
  });
  const [address, setAddress] = useState<Partial<Address>>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [orderMessage, setOrderMessage] = useState('');
  const [ratingProduct, setRatingProduct] = useState<Product | null>(null);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'register'>('login');
  const [showSignupTip, setShowSignupTip] = useState(false);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}-${digits.slice(3)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCEP = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const validateName = (value: string): string => {
    if (!value.trim()) return 'Nome é obrigatório';
    if (value.trim().length < 3) return 'Nome deve ter pelo menos 3 caracteres';
    return '';
  };

  const validatePhone = (value: string): string => {
    if (!value.trim()) return 'Telefone é obrigatório';
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10) return 'Telefone incompleto';
    if (digits.length > 11) return 'Telefone muito longo';
    return '';
  };

  const validateCEP = (value: string): string => {
    if (!value.trim()) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 8) return 'CEP incompleto';
    return '';
  };

  const validateRequired = (value: string, fieldName: string): string => {
    if (!value.trim()) return `${fieldName} é obrigatório`;
    return '';
  };

  const handleNameChange = (value: string) => {
    setCustomerInfo(prev => ({ ...prev, name: value }));
    const error = validateName(value);
    setErrors(prev => ({ ...prev, name: error }));
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setCustomerInfo(prev => ({ ...prev, phone: formatted }));
    const error = validatePhone(formatted);
    setErrors(prev => ({ ...prev, phone: error }));
  };

  const handleCEPChange = (value: string) => {
    const formatted = formatCEP(value);
    setAddress(prev => ({ ...prev, zipCode: formatted }));
    const error = validateCEP(formatted);
    setErrors(prev => ({ ...prev, zipCode: error }));
  };

  const handleStreetChange = (value: string) => {
    setAddress(prev => ({ ...prev, street: value }));
    const error = validateRequired(value, 'Rua');
    setErrors(prev => ({ ...prev, street: error }));
  };

  const handleNumberChange = (value: string) => {
    setAddress(prev => ({ ...prev, number: value }));
    const error = validateRequired(value, 'Número');
    setErrors(prev => ({ ...prev, number: error }));
  };

  const handleNeighborhoodChange = (value: string) => {
    setAddress(prev => ({ ...prev, neighborhood: value }));
    const error = validateRequired(value, 'Bairro');
    setErrors(prev => ({ ...prev, neighborhood: error }));
  };

  const handleComplementChange = (value: string) => {
    setAddress(prev => ({ ...prev, complement: value }));
  };

  const handleCityChange = (value: string) => {
    setAddress(prev => ({ ...prev, city: value }));
    const error = validateRequired(value, 'Cidade');
    setErrors(prev => ({ ...prev, city: error }));
  };

  const handleStateChange = (value: string) => {
    setAddress(prev => ({ ...prev, state: value.toUpperCase().slice(0, 2) }));
    const error = validateRequired(value, 'UF');
    setErrors(prev => ({ ...prev, state: error }));
  };

  const validateAll = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    const nameError = validateName(customerInfo.name);
    const phoneError = validatePhone(customerInfo.phone);
    const streetError = validateRequired(address.street || '', 'Rua');
    const numberError = validateRequired(address.number || '', 'Número');
    const neighborhoodError = validateRequired(address.neighborhood || '', 'Bairro');
    const cityError = validateRequired(address.city || '', 'Cidade');
    const stateError = validateRequired(address.state || '', 'UF');
    const zipCodeError = validateCEP(address.zipCode || '');

    if (nameError) newErrors.name = nameError;
    if (phoneError) newErrors.phone = phoneError;
    if (streetError) newErrors.street = streetError;
    if (numberError) newErrors.number = numberError;
    if (neighborhoodError) newErrors.neighborhood = neighborhoodError;
    if (cityError) newErrors.city = cityError;
    if (stateError) newErrors.state = stateError;
    if (zipCodeError) newErrors.zipCode = zipCodeError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let cust = await getCustomer(firebaseUser.uid);
        if (!cust) {
          cust = await createCustomer(
            firebaseUser.uid,
            firebaseUser.displayName || '',
            firebaseUser.email || '',
            ''
          );
        }
        setCustomer(cust);
        if (cust) {
          setCustomerInfo({
            name: cust.name || firebaseUser.displayName || '',
            phone: cust.phone || '',
            obs: '',
          });
          const defaultAddr = cust.addresses.find(a => a.isDefault) || cust.addresses[0];
          if (defaultAddr) {
            setAddress({
              street: defaultAddr.street,
              number: defaultAddr.number,
              complement: defaultAddr.complement,
              neighborhood: defaultAddr.neighborhood,
              city: defaultAddr.city,
              state: defaultAddr.state,
              zipCode: defaultAddr.zipCode,
            });
          }
        }
      } else {
        setCustomer(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('active', '==', true));
        const snapshot = await getDocs(q);
        const loadedProducts: Product[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        setProducts(loadedProducts);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const loadRatings = async () => {
      try {
        const ratingsRef = collection(db, 'ratings');
        const q = query(ratingsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const loadedRatings: Rating[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Rating));
        setRatings(loadedRatings);
      } catch (error) {
        console.error('Erro ao carregar avaliações:', error);
      } finally {
        setLoadingRatings(false);
      }
    };
    loadRatings();
  }, []);

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        const data = await getActivePromotions();
        setPromotions(data);
      } catch (error) {
        console.error('Erro ao carregar promoções:', error);
      } finally {
        setLoadingPromotions(false);
      }
    };
    loadPromotions();
  }, []);

  const handleLogin = async (firebaseUser: FirebaseUser, cust?: Customer) => {
    setUser(firebaseUser);
    if (cust) {
      setCustomer(cust);
      setCustomerInfo({
        name: cust.name || firebaseUser.displayName || '',
        phone: cust.phone || '',
        obs: '',
      });
      const defaultAddr = cust.addresses.find(a => a.isDefault) || cust.addresses[0];
      if (defaultAddr) {
        setAddress({
          street: defaultAddr.street,
          number: defaultAddr.number,
          complement: defaultAddr.complement,
          neighborhood: defaultAddr.neighborhood,
          city: defaultAddr.city,
          state: defaultAddr.state,
          zipCode: defaultAddr.zipCode,
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCustomer(null);
      setCustomerInfo({ name: '', phone: '', obs: '' });
      setAddress({
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: 'Santo André',
        state: 'SP',
        zipCode: '',
      });
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const openLogin = (mode: 'login' | 'register' = 'login') => {
    setLoginModalMode(mode);
    setShowLoginModal(true);
  };

  const addToBag = (productId: string) => {
    setBag(prev => {
      const existing = prev.find(item => item.productId === productId && !item.comboId);
      if (existing) {
        return prev.map(item => item.productId === productId && !item.comboId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromBag = (productId: string) => {
    setBag(prev => {
      const existing = prev.find(item => item.productId === productId && !item.comboId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.productId === productId && !item.comboId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => !(item.productId === productId && !item.comboId));
    });
  };

  const getQuantity = (productId: string) => {
    return bag.find(item => item.productId === productId && !item.comboId)?.quantity || 0;
  };

  const addComboToBag = (promo: Promotion) => {
    setBag(prev => {
      const existing = prev.find(item => item.comboId === promo.id);
      if (existing) {
        return prev.map(item => item.comboId === promo.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        productId: promo.items?.[0]?.productId || '',
        quantity: 1,
        comboId: promo.id,
        comboItems: promo.items,
        comboPrice: promo.comboPrice,
      }];
    });
  };

  const removeComboFromBag = (promoId: string) => {
    setBag(prev => {
      const existing = prev.find(item => item.comboId === promoId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.comboId === promoId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.comboId !== promoId);
    });
  };

  const getComboQuantity = (promoId: string) => {
    return bag.find(item => item.comboId === promoId)?.quantity || 0;
  };

  const totalItems = bag.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = bag.reduce((acc, item) => {
    if (item.comboId && item.comboPrice) {
      return acc + item.comboPrice * item.quantity;
    }
    const product = products.find(p => p.id === item.productId);
    return acc + (product?.price || 0) * item.quantity;
  }, 0);
  const finalPrice = Math.max(0, totalPrice - appliedDiscount);

  const getAverageRating = (productId: string) => {
    const productRatings = ratings.filter(r => r.productId === productId);
    if (productRatings.length === 0) return 0;
    const sum = productRatings.reduce((acc, r) => acc + r.score, 0);
    return sum / productRatings.length;
  };

  const formatAddress = () => {
    const parts = [
      address.street && `Rua ${address.street}`,
      address.number && `Nº ${address.number}`,
      address.complement,
      address.neighborhood && `Bairro ${address.neighborhood}`,
      address.city && address.city,
      address.state && address.state,
      address.zipCode && `CEP ${address.zipCode}`,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleRegisterOrder = () => {
    if (bag.length === 0) {
      alert('Sua sacola está vazia!');
      return;
    }

    if (!validateAll()) {
      alert('Por favor, corrija os erros antes de registrar o pedido.');
      return;
    }

    const addressStr = formatAddress();

    let message = `Olá! Gostaria de fazer um pedido:\n\n`;
    message += `*Cliente:* ${customerInfo.name}\n`;
    if (customerInfo.phone) message += `*Telefone:* ${customerInfo.phone}\n`;
    message += `*Endereço:* ${addressStr}\n`;
    if (customerInfo.obs) message += `*Observações:* ${customerInfo.obs}\n`;
    message += `\n*Itens do Pedido:*\n`;

    bag.forEach(item => {
      if (item.comboId) {
        const promo = promotions.find(p => p.id === item.comboId);
        if (promo) {
          const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || '';
          message += `– [COMBO] ${item.quantity}x ${promo.name}\n`;
          item.comboItems?.forEach(ci => {
            message += `   ${ci.quantity}x ${getProductName(ci.productId)}\n`;
          });
          message += `   R$ ${promo.comboPrice?.toFixed(2)} cada\n`;
        }
      } else {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          message += `– ${item.quantity}x ${product.name} (R$ ${product.price.toFixed(2)} cada)\n`;
        }
      }
    });

    if (appliedCoupon) {
      message += `\n📌 Cupom aplicado: *${appliedCoupon.code}*\n`;
      message += `*Subtotal:* R$ ${totalPrice.toFixed(2)}\n`;
      message += `*Desconto:* -R$ ${appliedDiscount.toFixed(2)}\n`;
      message += `*Total:* R$ ${finalPrice.toFixed(2)}\n`;
    } else {
      message += `\n*Total (sem frete): R$ ${totalPrice.toFixed(2)}*\n`;
    }
    message += `\nO valor do frete será combinado pelo WhatsApp.`;

    setOrderMessage(message);
    setCurrentScreen('success');
  };

  const saveOrderToFirestore = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const docRef = await addDoc(ordersRef, {
        customerId: user?.uid || null,
        customerName: customerInfo.name,
        customerEmail: user?.email || null,
        customerPhone: customerInfo.phone || null,
        customerAddress: formatAddress(),
        customerAddressStructured: address,
        customerObs: customerInfo.obs,
        items: [...bag],
        total: finalPrice,
        subtotal: totalPrice,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: appliedDiscount || 0,
        status: 'novo',
        paid: false,
        createdAt: serverTimestamp(),
        whatsappSent: false,
      });

      if (appliedCoupon && appliedDiscount > 0) {
        await recordCouponUse(
          appliedCoupon.id,
          appliedCoupon.code,
          docRef.id,
          appliedDiscount,
          user?.uid,
          user?.email || undefined
        );
      }

      return docRef.id;
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      return null;
    }
  };

  const openWhatsApp = async () => {
    if (bag.length === 0) return;

    const orderId = await saveOrderToFirestore();

    let fullMessage = orderMessage;
    if (orderId) {
      fullMessage += `\n\n[Código do Pedido: #${orderId.slice(0, 8).toUpperCase()}]`;
    }

    const encodedMessage = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');

    if (orderId) {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { whatsappSent: true });
    }

    setBag([]);
    setCustomerInfo({ name: '', phone: '', obs: '' });
    setAddress({
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    });
    setShowSignupTip(false);
    setAppliedCoupon(null);
    setAppliedDiscount(0);
  };

  const saveRating = async (score: number, comment: string) => {
    if (!ratingProduct || !user) return;
    try {
      const ratingsRef = collection(db, 'ratings');
      const userName = user.displayName?.split(' ')[0] || 'Anônimo';
      const userPhoto = user.photoURL || '';
      const docRef = await addDoc(ratingsRef, {
        productId: ratingProduct.id,
        score,
        comment,
        userName,
        userPhoto,
        createdAt: serverTimestamp()
      });
      const newRating: Rating = {
        id: docRef.id,
        productId: ratingProduct.id,
        score,
        comment,
        userName,
        userPhoto,
        createdAt: new Date()
      };
      setRatings(prev => [newRating, ...prev]);
      setRatingProduct(null);
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      alert('Erro ao salvar avaliação. Tente novamente.');
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-[#C75B48]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] text-[#3D2A24] font-sans selection:bg-[#C75B48] selection:text-white">
      <AnimatePresence mode="wait">
        {currentScreen === 'welcome' && (
          <WelcomeScreen onNext={() => setCurrentScreen('menu')} />
        )}
        {currentScreen === 'menu' && (
          <MenuScreen
            onNext={() => setCurrentScreen('bag')}
            addToBag={addToBag}
            removeFromBag={removeFromBag}
            getQuantity={getQuantity}
            totalItems={totalItems}
            getAverageRating={getAverageRating}
            onRate={setRatingProduct}
            loadingRatings={loadingRatings}
            user={user}
            customer={customer}
            onOpenLogin={openLogin}
            onLogout={handleLogout}
            products={products}
            loadingProducts={loadingProducts}
            promotions={promotions}
            loadingPromotions={loadingPromotions}
            addComboToBag={addComboToBag}
            removeComboFromBag={removeComboFromBag}
            getComboQuantity={getComboQuantity}
          />
        )}
        {currentScreen === 'bag' && (
          <BagScreen
            bag={bag}
            totalPrice={totalPrice}
            finalPrice={finalPrice}
            customerInfo={customerInfo}
            setCustomerInfo={setCustomerInfo}
            address={address}
            setAddress={setAddress}
            onBack={() => setCurrentScreen('menu')}
            onRegister={handleRegisterOrder}
            products={products}
            promotions={promotions}
            user={user}
            customer={customer}
            onOpenLogin={openLogin}
            showSignupTip={showSignupTip}
            setShowSignupTip={setShowSignupTip}
            dismissedTips={dismissedTips}
            setDismissedTips={setDismissedTips}
            appliedCoupon={appliedCoupon}
            appliedDiscount={appliedDiscount}
            onApplyCoupon={(coupon, discount) => {
              setAppliedCoupon(coupon);
              setAppliedDiscount(discount);
            }}
            onRemoveCoupon={() => {
              setAppliedCoupon(null);
              setAppliedDiscount(0);
            }}
            errors={errors}
            setErrors={setErrors}
            formatPhone={formatPhone}
            formatCEP={formatCEP}
            validateName={validateName}
            validatePhone={validatePhone}
            validateCEP={validateCEP}
            validateRequired={validateRequired}
          />
        )}
        {currentScreen === 'success' && (
          <SuccessScreen onSend={openWhatsApp} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ratingProduct && (
          <RatingDialog
            product={ratingProduct}
            onClose={() => setRatingProduct(null)}
            onSave={saveRating}
            user={user}
            onOpenLogin={() => openLogin('login')}
          />
        )}
      </AnimatePresence>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        mode={loginModalMode}
      />
    </div>
  );
}

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-md mx-auto px-6 pt-12 pb-8 flex flex-col items-center min-h-screen text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8, type: "spring", stiffness: 100 }}
        className="w-full mb-8"
      >
        <img
          src="/CampaniniSaboresLogo.png"
          alt="Campanini Sabores"
          className="w-full max-w-md mx-auto"
          style={{ filter: 'sepia(1) saturate(800%) hue-rotate(340deg) brightness(0.95)' }}
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-white rounded-3xl p-8 shadow-lg shadow-[#E8A849]/10 text-left mb-10 border border-[#F0E4DF]"
      >
        <p className="whitespace-pre-line leading-relaxed text-[#3D2A24]/90">
          <span className="text-3xl font-handwritten text-[#C75B48]">Olá!</span>{"\n\n"}
          Seja muito bem-vindo(a) à nossa família!{"\n\n"}
          <span className="text-[#8C7066]">
            Aqui cada esfiha é feita com muito carinho — da massa ao recheio, tudo com receita de família.
          </span>{"\n\n"}
          <span className="text-[#8C7066]">
            Nossas esfihas chegam pré-assadas e congeladas. É só aquecer no forno ou airfryer e pronto — delícia garantida!
          </span>{"\n\n"}
          <span className="text-[#C75B48] font-handwritten text-2xl">
            Escolha seus sabores favoritos e boa experiência!
          </span>
        </p>
      </motion.div>

      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        className="w-full bg-gradient-to-r from-[#C75B48] to-[#A84838] text-white py-5 rounded-2xl font-handwritten font-semibold text-xl shadow-lg shadow-[#C75B48]/25 hover:shadow-xl hover:shadow-[#C75B48]/30 transition-all duration-300"
      >
        Ver cardápio
      </motion.button>

      <motion.p
        variants={itemVariants}
        className="mt-6 text-base font-handwritten text-[#8C7066] flex items-center gap-2"
      >
        <Heart size={14} className="text-[#C75B48]" />
        Feito com carinho só pra você
      </motion.p>
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
  onRate,
  loadingRatings,
  user,
  customer,
  onOpenLogin,
  onLogout,
  products,
  loadingProducts,
  promotions,
  loadingPromotions,
  addComboToBag,
  removeComboFromBag,
  getComboQuantity,
}: {
  onNext: () => void;
  addToBag: (id: string) => void;
  removeFromBag: (id: string) => void;
  getQuantity: (id: string) => number;
  totalItems: number;
  getAverageRating: (id: string) => number;
  onRate: (product: Product) => void;
  loadingRatings: boolean;
  user: FirebaseUser | null;
  customer: Customer | null;
  onOpenLogin: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  products: Product[];
  loadingProducts: boolean;
  promotions: Promotion[];
  loadingPromotions: boolean;
  addComboToBag: (promo: Promotion) => void;
  removeComboFromBag: (promoId: string) => void;
  getComboQuantity: (promoId: string) => number;
}) {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-2xl mx-auto px-4 py-8 pb-36"
    >
      <div className="flex justify-between items-center mb-8">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-3"
        >
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold font-serif text-[#3D2A24]">Cardápio</h2>
            <p className="text-base text-[#8C7066] mt-1">Escolha seus sabores favoritos</p>
          </div>
          {user ? (
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => navigate('/perfil')}
                className="flex items-center gap-2 group"
                title="Meu Perfil"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-full border-2 border-transparent group-hover:border-[#C75B48] transition-all" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#C75B48] flex items-center justify-center group-hover:bg-[#A84838] transition-colors">
                    <User size={20} className="text-white" />
                  </div>
                )}
              </button>
              {customer && customer.loyaltyPoints > 0 && (
                <div className="hidden sm:flex items-center gap-1 bg-[#FFF8F5] border border-[#F0E4DF] rounded-full px-2 py-1">
                  <Star size={12} className="text-[#E8A849] fill-[#E8A849]" />
                  <span className="text-xs font-bold text-[#3D2A24]">{customer.loyaltyPoints}</span>
                </div>
              )}
              <button onClick={onLogout} className="p-2 text-[#8C7066] hover:text-red-500 transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenLogin('login')}
              className="ml-4 px-4 py-2 bg-[#C75B48] text-white rounded-xl text-sm font-medium hover:bg-[#A84838] transition-colors"
            >
              Entrar
            </button>
          )}
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onNext}
          className="relative bg-white p-3.5 rounded-2xl shadow-md shadow-[#E8A849]/10 text-[#C75B48] transition-all hover:shadow-lg"
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
              className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-[#C75B48] to-[#A84838] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md"
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
        className="space-y-5"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-[#C75B48] to-transparent"></div>
          <span className="text-lg font-handwritten font-semibold text-[#C75B48]">Linha Tradicional</span>
          <div className="h-px flex-1 bg-gradient-to-l from-[#C75B48] to-transparent"></div>
        </motion.div>

        {products.filter(p => p.category === 'tradicional').map(product => (
          <motion.div
            key={product.id}
            variants={itemVariants}
            layout
            className="bg-white rounded-2xl overflow-hidden shadow-md shadow-[#F0E4DF]/50 border border-[#F0E4DF] hover:shadow-lg hover:shadow-[#E8A849]/10 transition-all duration-300"
          >
            <div className="relative">
              <div className="bg-gradient-to-br from-[#F0E4DF] to-[#F5EDE8] h-48 flex flex-col items-center justify-center gap-3">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={32} className="text-[#C75B48]/40" />
                    <span className="text-xs text-[#8C7066]/60 font-medium">Adicionar foto</span>
                  </>
                )}
              </div>
              {product.tags && product.tags[0] && (
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-sm font-handwritten font-semibold shadow-sm ${
                  product.tags[0] === 'Clássica' ? 'bg-[#C75B48] text-white' :
                  product.tags[0] === 'Leve' ? 'bg-[#7BA05B] text-white' :
                  product.tags[0] === 'Fit' ? 'bg-[#81C784] text-white' :
                  'bg-white/90 text-[#5D4037]'
                }`}>
                  {product.tags[0]}
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold leading-tight text-[#3D2A24] pr-2">{product.name}</h3>
                <span className="text-xl font-bold whitespace-nowrap text-[#C75B48]">R$ {product.price.toFixed(2)}</span>
              </div>

              <p className="text-base text-[#8C7066] mb-4 leading-relaxed">
                {product.description}
              </p>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={14}
                      fill={star <= Math.round(getAverageRating(product.id)) ? "#E8A849" : "none"}
                      className={star <= Math.round(getAverageRating(product.id)) ? "text-[#E8A849]" : "text-[#F0E4DF]"}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-[#8C7066]">
                  {loadingRatings ? (
                    <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" />Carregando</span>
                  ) : getAverageRating(product.id) > 0 ? getAverageRating(product.id).toFixed(1) : 'Sem avaliações'}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => user ? onRate(product) : onOpenLogin('login')}
                  className="text-sm font-handwritten font-medium text-[#C75B48] underline underline-offset-2 ml-auto"
                >
                  {user ? 'Avaliar' : 'Faça login para avaliar'}
                </motion.button>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex items-center bg-[#FFF8F5] rounded-xl p-1 border border-[#F0E4DF]">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => removeFromBag(product.id)}
                    className="p-2 hover:bg-[#F0E4DF]/50 rounded-lg transition-colors text-[#5D4037]"
                    disabled={getQuantity(product.id) === 0}
                  >
                    <Minus size={18} />
                  </motion.button>
                  <motion.span
                    key={getQuantity(product.id)}
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-12 text-center font-bold text-[#3D2A24]"
                  >
                    {getQuantity(product.id)}
                  </motion.span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => addToBag(product.id)}
                    className="p-2 hover:bg-[#C75B48]/10 rounded-lg transition-colors text-[#C75B48]"
                  >
                    <Plus size={18} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {!loadingPromotions && promotions.filter(p => p.type === 'combo').length > 0 && (
          <>
            <motion.div variants={itemVariants} className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-gradient-to-r from-[#E8A849] to-transparent"></div>
              <span className="text-lg font-handwritten font-semibold text-[#E8A849]">Combos</span>
              <div className="h-px flex-1 bg-gradient-to-l from-[#E8A849] to-transparent"></div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {promotions.filter(p => p.type === 'combo').map(promo => (
                <ComboCard
                  promotion={promo}
                  products={products}
                  quantity={getComboQuantity(promo.id)}
                  onAdd={() => addComboToBag(promo)}
                  onRemove={() => removeComboFromBag(promo.id)}
                />
              ))}
            </div>
          </>
        )}

        <motion.div variants={itemVariants} className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-[#7BA05B] to-transparent"></div>
          <span className="text-lg font-handwritten font-semibold text-[#7BA05B]">Linha Fit</span>
          <div className="h-px flex-1 bg-gradient-to-l from-[#7BA05B] to-transparent"></div>
        </motion.div>

        {products.filter(p => p.category === 'fit').map(product => (
          <motion.div
            key={product.id}
            variants={itemVariants}
            layout
            className="bg-white rounded-2xl overflow-hidden shadow-md shadow-[#F0E4DF]/50 border border-[#F0E4DF] hover:shadow-lg hover:shadow-[#7BA05B]/10 transition-all duration-300"
          >
            <div className="relative">
              <div className="bg-gradient-to-br from-[#E8F5E9] to-[#F1F8E9] h-48 flex flex-col items-center justify-center gap-3">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Leaf size={32} className="text-[#7BA05B]/40" />
                    <span className="text-xs text-[#7BA05B]/60 font-medium">Opção Fit</span>
                  </>
                )}
              </div>
              {product.tags && product.tags[0] && (
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-sm font-handwritten font-semibold shadow-sm ${
                  product.tags[0] === 'Fit' ? 'bg-[#7BA05B] text-white' :
                  product.tags[0] === 'Leve' ? 'bg-[#81C784] text-white' :
                  'bg-white/90 text-[#5D4037]'
                }`}>
                  {product.tags[0]}
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold leading-tight text-[#3D2A24] pr-2">{product.name}</h3>
                <span className="text-xl font-bold whitespace-nowrap text-[#7BA05B]">R$ {product.price.toFixed(2)}</span>
              </div>

              <p className="text-base text-[#8C7066] mb-4 leading-relaxed">
                {product.description}
              </p>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={14}
                      fill={star <= Math.round(getAverageRating(product.id)) ? "#E8A849" : "none"}
                      className={star <= Math.round(getAverageRating(product.id)) ? "text-[#E8A849]" : "text-[#F0E4DF]"}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-[#8C7066]">
                  {loadingRatings ? (
                    <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" />Carregando</span>
                  ) : getAverageRating(product.id) > 0 ? getAverageRating(product.id).toFixed(1) : 'Sem avaliações'}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => user ? onRate(product) : onOpenLogin('login')}
                  className="text-sm font-handwritten font-medium text-[#7BA05B] underline underline-offset-2 ml-auto"
                >
                  {user ? 'Avaliar' : 'Faça login para avaliar'}
                </motion.button>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex items-center bg-[#F1F8E9] rounded-xl p-1 border border-[#C8E6C9]">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => removeFromBag(product.id)}
                    className="p-2 hover:bg-[#C8E6C9]/50 rounded-lg transition-colors text-[#5D4037]"
                    disabled={getQuantity(product.id) === 0}
                  >
                    <Minus size={18} />
                  </motion.button>
                  <motion.span
                    key={getQuantity(product.id)}
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-12 text-center font-bold text-[#3D2A24]"
                  >
                    {getQuantity(product.id)}
                  </motion.span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => addToBag(product.id)}
                    className="p-2 hover:bg-[#7BA05B]/10 rounded-lg transition-colors text-[#7BA05B]"
                  >
                    <Plus size={18} />
                  </motion.button>
                </div>
              </div>
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
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNext}
            className="w-full bg-gradient-to-r from-[#C75B48] to-[#A84838] text-white py-5 rounded-2xl font-handwritten font-bold text-xl shadow-xl shadow-[#C75B48]/25 flex items-center justify-center gap-3 transition-all hover:shadow-2xl hover:shadow-[#C75B48]/30"
          >
            <ShoppingBag size={20} />
            Ver sacola ({totalItems})
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

function BagScreen({
  bag,
  totalPrice,
  finalPrice,
  customerInfo,
  setCustomerInfo,
  address,
  setAddress,
  onBack,
  onRegister,
  products,
  user,
  customer,
  onOpenLogin,
  showSignupTip,
  setShowSignupTip,
  dismissedTips,
  setDismissedTips,
  appliedCoupon,
  appliedDiscount,
  onApplyCoupon,
  onRemoveCoupon,
  promotions,
  errors,
  setErrors,
  formatPhone,
  formatCEP,
  validateName,
  validatePhone,
  validateCEP,
  validateRequired,
}: {
  bag: BagItem[];
  totalPrice: number;
  finalPrice: number;
  customerInfo: { name: string; phone: string; obs: string };
  setCustomerInfo: React.Dispatch<React.SetStateAction<{ name: string; phone: string; obs: string }>>;
  address: Partial<import('./types').Address>;
  setAddress: React.Dispatch<React.SetStateAction<Partial<import('./types').Address>>>;
  onBack: () => void;
  onRegister: () => void;
  products: Product[];
  promotions: Promotion[];
  user: import('firebase/auth').User | null;
  customer: import('./types').Customer | null;
  onOpenLogin: (mode?: 'login' | 'register') => void;
  showSignupTip: boolean;
  setShowSignupTip: (show: boolean) => void;
  dismissedTips: Set<string>;
  setDismissedTips: React.Dispatch<React.SetStateAction<Set<string>>>;
  appliedCoupon: import('./types').Coupon | null;
  appliedDiscount: number;
  onApplyCoupon: (coupon: import('./types').Coupon, discount: number) => void;
  onRemoveCoupon: () => void;
  errors: {[key: string]: string};
  setErrors: React.Dispatch<React.SetStateAction<{[key: string]: string}>>;
  formatPhone: (value: string) => string;
  formatCEP: (value: string) => string;
  validateName: (value: string) => string;
  validatePhone: (value: string) => string;
  validateCEP: (value: string) => string;
  validateRequired: (value: string, fieldName: string) => string;
}) {
  const tipKey = 'bag-signup-tip';
  const isTipDismissed = dismissedTips.has(tipKey);

  const handleNameChange = (value: string) => {
    setCustomerInfo(prev => ({ ...prev, name: value }));
    const error = validateName(value);
    setErrors(prev => ({ ...prev, name: error }));
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setCustomerInfo(prev => ({ ...prev, phone: formatted }));
    const error = validatePhone(formatted);
    setErrors(prev => ({ ...prev, phone: error }));
  };

  const handleStreetChange = (value: string) => {
    setAddress(prev => ({ ...prev, street: value }));
    const error = validateRequired(value, 'Rua');
    setErrors(prev => ({ ...prev, street: error }));
  };

  const handleNumberChange = (value: string) => {
    setAddress(prev => ({ ...prev, number: value }));
    const error = validateRequired(value, 'Número');
    setErrors(prev => ({ ...prev, number: error }));
  };

  const handleNeighborhoodChange = (value: string) => {
    setAddress(prev => ({ ...prev, neighborhood: value }));
    const error = validateRequired(value, 'Bairro');
    setErrors(prev => ({ ...prev, neighborhood: error }));
  };

  const handleComplementChange = (value: string) => {
    setAddress(prev => ({ ...prev, complement: value }));
  };

  const handleCityChange = (value: string) => {
    setAddress(prev => ({ ...prev, city: value }));
    const error = validateRequired(value, 'Cidade');
    setErrors(prev => ({ ...prev, city: error }));
  };

  const handleStateChange = (value: string) => {
    const formatted = value.toUpperCase().slice(0, 2);
    setAddress(prev => ({ ...prev, state: formatted }));
    const error = validateRequired(formatted, 'UF');
    setErrors(prev => ({ ...prev, state: error }));
  };

  const handleCEPChange = (value: string) => {
    const formatted = formatCEP(value);
    setAddress(prev => ({ ...prev, zipCode: formatted }));
    const error = validateCEP(formatted);
    setErrors(prev => ({ ...prev, zipCode: error }));
  };

  const handleObsChange = (value: string) => {
    setCustomerInfo(prev => ({ ...prev, obs: value }));
  };

  return (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <div className="flex items-center gap-4 mb-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-2.5 bg-white rounded-xl shadow-md text-[#5D4037] transition-all hover:shadow-lg"
        >
          <ArrowLeft size={24} />
        </motion.button>
        <div>
          <h2 className="text-3xl font-bold font-serif text-[#3D2A24]">Sua sacola</h2>
          <p className="text-sm text-[#8C7066]">{bag.length} {bag.length === 1 ? 'item' : 'itens'}</p>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="bg-white rounded-2xl p-6 shadow-md shadow-[#F0E4DF]/50 mb-6 space-y-4 border border-[#F0E4DF]"
      >
        {bag.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBag size={48} className="mx-auto text-[#F0E4DF] mb-3" />
            <p className="text-[#8C7066]">Sua sacola está vazia</p>
          </div>
        ) : (
          <>
            {bag.map((item, idx) => {
              if (item.comboId) {
                const promo = promotions.find(p => p.id === item.comboId);
                if (!promo) return null;
                const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || '';
                return (
                  <motion.div
                    key={`combo-${item.comboId}-${idx}`}
                    variants={itemVariants}
                    className="border-b border-[#F0E4DF] pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-[#E8A849] text-white rounded text-xs font-bold">COMBO</span>
                        <h4 className="font-semibold text-[#3D2A24]">{promo.name}</h4>
                      </div>
                      <span className="font-bold text-[#C75B48]">R$ {((promo.comboPrice || 0) * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {item.comboItems?.map((ci, ciIdx) => (
                        <p key={ciIdx} className="text-xs text-[#8C7066]">
                          {ci.quantity}x {getProductName(ci.productId)}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-[#8C7066] mt-1 ml-6">{item.quantity}x R$ {promo.comboPrice?.toFixed(2)} cada</p>
                  </motion.div>
                );
              }
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;
              return (
                <motion.div
                  key={item.productId}
                  variants={itemVariants}
                  className="flex justify-between items-center border-b border-[#F0E4DF] pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <h4 className="font-semibold text-[#3D2A24]">{product.name}</h4>
                    <p className="text-sm text-[#8C7066]">{item.quantity}x R$ {product.price.toFixed(2)}</p>
                  </div>
                  <span className="font-bold text-[#C75B48]">R$ {(item.quantity * product.price).toFixed(2)}</span>
                </motion.div>
              );
            })}

            <motion.div variants={itemVariants} className="pt-4 border-t-2 border-[#F0E4DF]">
              {appliedCoupon && (
                <div className="flex justify-between items-center mb-2 text-sm text-[#7BA05B]">
                  <span>Subtotal</span>
                  <span>R$ {totalPrice.toFixed(2)}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between items-center mb-2 text-sm text-[#7BA05B]">
                  <span>Desconto ({appliedCoupon.code})</span>
                  <span>-R$ {appliedDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-semibold text-[#3D2A24]">
                  {appliedCoupon ? 'Total' : 'Total (sem frete)'}
                </span>
                <span className="text-2xl font-bold text-[#C75B48]">R$ {finalPrice.toFixed(2)}</span>
              </div>

              <div className="mb-3">
                <CouponInput
                  orderTotal={totalPrice}
                  customerId={user?.uid}
                  customerEmail={user?.email || undefined}
                  appliedCoupon={appliedCoupon}
                  appliedDiscount={appliedDiscount}
                  onApply={onApplyCoupon}
                  onRemove={onRemoveCoupon}
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-[#FFF8F5] rounded-xl border border-[#F0E4DF]">
                <Leaf size={16} className="text-[#7BA05B] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#5D4037]">
                  O frete será combinado pelo WhatsApp
                </p>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>

      {!user && showSignupTip && !isTipDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#FFF8F5] to-[#FFF3E0] rounded-2xl p-5 mb-6 border border-[#E8A849]/30 shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#E8A849] to-[#C75B48] rounded-xl flex items-center justify-center flex-shrink-0">
              <Gift size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-[#3D2A24] mb-1">Cadastre-se e ganhe benefícios!</h4>
              <ul className="text-xs text-[#5D4037] space-y-0.5 mb-3">
                <li>✦ Acompanhe seus pedidos em tempo real</li>
                <li>✦ Salve seus endereços para checkout rápido</li>
                <li>✦ Ganhe pontos e troque por descontos</li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => onOpenLogin('register')}
                  className="px-4 py-2 bg-gradient-to-r from-[#C75B48] to-[#A84838] text-white text-xs font-semibold rounded-lg hover:shadow-md transition-all"
                >
                  Criar conta
                </button>
                <button
                  onClick={() => onOpenLogin('login')}
                  className="px-4 py-2 bg-white border border-[#F0E4DF] text-[#3D2A24] text-xs font-medium rounded-lg hover:bg-[#FFF8F5] transition-all"
                >
                  Já tenho conta
                </button>
                <button
                  onClick={() => {
                    setDismissedTips(prev => new Set(prev).add(tipKey));
                    setShowSignupTip(false);
                  }}
                  className="ml-auto p-1.5 text-[#8C7066] hover:text-[#3D2A24]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-4">
        <div className="flex items-center justify-between">
          <motion.h3 variants={itemVariants} className="text-xl font-semibold font-serif px-1 text-[#3D2A24]">Seus dados</motion.h3>
          {user && (
            <span className="text-xs text-[#7BA05B] bg-[#F1F8E9] px-2 py-1 rounded-full flex items-center gap-1">
              <Star size={10} className="fill-[#7BA05B]" />
              Logado
            </span>
          )}
        </div>
        <div className="space-y-3">
          <motion.div variants={itemVariants}>
            <label className="text-xs font-medium text-[#8C7066] mb-1 block">Nome completo *</label>
            <input
              type="text"
              placeholder="Seu nome"
              required
              value={customerInfo.name}
              onChange={e => handleNameChange(e.target.value)}
              className={`w-full bg-white border rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all ${
                errors.name ? 'border-red-500' : 'border-[#F0E4DF]'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.name}
              </p>
            )}
          </motion.div>
          <motion.div variants={itemVariants}>
            <label className="text-xs font-medium text-[#8C7066] mb-1 block">WhatsApp *</label>
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              value={customerInfo.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              className={`w-full bg-white border rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all ${
                errors.phone ? 'border-red-500' : 'border-[#F0E4DF]'
              }`}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.phone}
              </p>
            )}
          </motion.div>

          <motion.h3 variants={itemVariants} className="text-xl font-semibold font-serif px-1 pt-2 text-[#3D2A24]">Endereço de entrega</motion.h3>

          <motion.div variants={itemVariants}>
            <label className="text-xs font-medium text-[#8C7066] mb-1 block">Rua / Avenida *</label>
            <input
              type="text"
              placeholder="Rua das Flores"
              required
              value={address.street}
              onChange={e => handleStreetChange(e.target.value)}
              className={`w-full bg-white border rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all ${
                errors.street ? 'border-red-500' : 'border-[#F0E4DF]'
              }`}
            />
            {errors.street && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.street}
              </p>
            )}
          </motion.div>
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-medium text-[#8C7066] mb-1 block">Número *</label>
              <input
                type="text"
                placeholder="123"
                required
                value={address.number}
                onChange={e => handleNumberChange(e.target.value)}
                className={`w-full bg-white border rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all ${
                  errors.number ? 'border-red-500' : 'border-[#F0E4DF]'
                }`}
              />
              {errors.number && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.number}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-[#8C7066] mb-1 block">Complemento</label>
              <input
                type="text"
                placeholder="Apto, Bloco, Casa..."
                value={address.complement}
                onChange={e => handleComplementChange(e.target.value)}
                className="w-full bg-white border border-[#F0E4DF] rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all"
              />
            </div>
          </motion.div>
          <motion.div variants={itemVariants}>
            <label className="text-xs font-medium text-[#8C7066] mb-1 block">Bairro *</label>
            <input
              type="text"
              placeholder="Jardim Primavera"
              required
              value={address.neighborhood}
              onChange={e => handleNeighborhoodChange(e.target.value)}
              className={`w-full bg-white border rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all ${
                errors.neighborhood ? 'border-red-500' : 'border-[#F0E4DF]'
              }`}
            />
            {errors.neighborhood && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.neighborhood}
              </p>
            )}
          </motion.div>
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-[#8C7066] mb-1 block">Cidade *</label>
              <input
                type="text"
                placeholder="Cidade"
                value={address.city}
                onChange={e => handleCityChange(e.target.value)}
                className={`w-full bg-white border rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all ${
                  errors.city ? 'border-red-500' : 'border-[#F0E4DF]'
                }`}
              />
              {errors.city && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.city}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-[#8C7066] mb-1 block">UF *</label>
              <input
                type="text"
                maxLength={2}
                placeholder="SP"
                value={address.state}
                onChange={e => handleStateChange(e.target.value)}
                className={`w-full bg-white border rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all ${
                  errors.state ? 'border-red-500' : 'border-[#F0E4DF]'
                }`}
              />
              {errors.state && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.state}
                </p>
              )}
            </div>
          </motion.div>
          <motion.div variants={itemVariants}>
            <label className="text-xs font-medium text-[#8C7066] mb-1 block">CEP</label>
            <input
              type="text"
              placeholder="09100-000"
              value={address.zipCode}
              onChange={e => handleCEPChange(e.target.value)}
              className={`w-full bg-white border rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all ${
                errors.zipCode ? 'border-red-500' : 'border-[#F0E4DF]'
              }`}
            />
            {errors.zipCode && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.zipCode}
              </p>
            )}
          </motion.div>
          <motion.input
            variants={itemVariants}
            type="text"
            placeholder="Observações do pedido (opcional)"
            value={customerInfo.obs}
            onChange={e => handleObsChange(e.target.value)}
            className="w-full bg-white border border-[#F0E4DF] rounded-xl p-4 shadow-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all"
          />
        </div>
      </motion.div>

      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onRegister}
        disabled={bag.length === 0}
        className="w-full bg-gradient-to-r from-[#C75B48] to-[#A84838] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-[#C75B48]/25 mt-8 transition-all hover:shadow-xl hover:shadow-[#C75B48]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        Registrar pedido
      </motion.button>
    </motion.div>
  );
}

function SuccessScreen({ onSend }: { onSend: () => void }) {
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
        className="relative mb-6"
      >
        <div className="absolute inset-0 bg-[#7BA05B]/20 blur-2xl rounded-full scale-150"></div>
        <div className="relative bg-white rounded-full p-5 shadow-xl border border-[#F0E4DF]">
          <CheckCircle2 size={56} className="text-[#7BA05B]" />
        </div>
      </motion.div>

      <motion.h2 variants={itemVariants} className="text-3xl font-bold font-serif text-[#3D2A24] mb-2">
        Pedido registrado!
      </motion.h2>
      <motion.p variants={itemVariants} className="text-[#8C7066] mb-8">
        Agora é só enviar pelo WhatsApp para finalizar.
      </motion.p>

      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSend}
        className="w-full bg-gradient-to-r from-[#7BA05B] to-[#6B8E4A] text-white py-5 rounded-2xl font-handwritten font-bold text-xl shadow-lg shadow-[#7BA05B]/25 flex items-center justify-center gap-3 mb-8 transition-all hover:shadow-xl hover:shadow-[#7BA05B]/30"
      >
        <MessageCircle size={24} />
        Enviar pelo WhatsApp
      </motion.button>

      <motion.div
        variants={itemVariants}
        className="bg-white/95 backdrop-blur-sm p-7 rounded-3xl shadow-lg text-left border border-[#F0E4DF] w-full"
      >
        <h3 className="font-semibold text-lg text-[#3D2A24] mb-4 pb-3 border-b border-[#F0E4DF] flex items-center gap-2">
          <Leaf size={18} className="text-[#7BA05B]" />
          Dicas de consumo
        </h3>
        <div className="space-y-4 text-sm leading-relaxed text-[#5D4037]">
          <div className="flex gap-3">
            <span className="text-[#C75B48] font-bold">1.</span>
            <p>Retire da geladeira 15 minutos antes de preparar</p>
          </div>
          <div className="flex gap-3">
            <span className="text-[#C75B48] font-bold">2.</span>
            <p>Coloque as esfihas em uma forma untada</p>
          </div>
          <div className="flex gap-3">
            <span className="text-[#C75B48] font-bold">3.</span>
            <p>Forno ou airfryer a 120°C por 15 minutos</p>
          </div>
          <div className="flex gap-3">
            <span className="text-[#C75B48] font-bold">4.</span>
            <p>Retire, espere 1 minuto e aproveite!</p>
          </div>

          <p className="font-semibold text-[#C75B48] pt-2">Bom apetite!</p>

          <div className="p-3 bg-[#FFF3E0]/50 rounded-xl border border-[#E8A849]/30 text-[#5D4037]">
            <p className="font-medium flex items-center gap-2">
              <span className="text-lg">Importante:</span> Não use micro-ondas — ele deixa a massa dura!
            </p>
          </div>

          <div className="pt-3 border-t border-[#F0E4DF] text-sm font-handwritten text-[#8C7066]">
            <p className="mb-1 font-medium">Aceitamos feedbacks sinceros!</p>
            <p>Sua opinião é muito importante para melhorarmos cada vez mais.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RatingDialog({
  product,
  onClose,
  onSave,
  user,
  onOpenLogin
}: {
  product: Product;
  onClose: () => void;
  onSave: (score: number, comment: string) => void;
  user: import('firebase/auth').User | null;
  onOpenLogin: () => void;
}) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2A24]/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative border border-[#F0E4DF] text-center"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#8C7066] hover:text-[#3D2A24] hover:bg-[#FFF8F5] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>

          <h3 className="text-xl font-semibold text-[#3D2A24] mb-4 pr-8">{product.name}</h3>
          <p className="text-[#8C7066] mb-6">Faça login para avaliar este produto</p>

          <button
            onClick={onOpenLogin}
            className="w-full bg-gradient-to-r from-[#C75B48] to-[#A84838] text-white py-4 rounded-xl font-handwritten font-semibold text-lg shadow-lg shadow-[#C75B48]/20 active:scale-[0.98] transition-all"
          >
            Fazer login para avaliar
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2A24]/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative border border-[#F0E4DF]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8C7066] hover:text-[#3D2A24] hover:bg-[#FFF8F5] rounded-lg transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ''} className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#C75B48] flex items-center justify-center">
              <User size={24} className="text-white" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold text-[#3D2A24]">{user.displayName?.split(' ')[0]}</h3>
            <p className="text-sm text-[#8C7066]">Avaliando: {product.name}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(star => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setScore(star)}
                className="transition-transform"
              >
                <Star
                  size={36}
                  fill={star <= score ? "#E8A849" : "none"}
                  className={star <= score ? "text-[#E8A849]" : "text-[#F0E4DF]"}
                />
              </motion.button>
            ))}
          </div>
          <p className="text-center font-medium text-[#5D4037]">
            {score === 1 && "Poderia ser melhor"}
            {score === 2 && "Regular"}
            {score === 3 && "Gostei!"}
            {score === 4 && "Muito bom!"}
            {score === 5 && "Excelente!"}
          </p>
        </div>

        <textarea
          placeholder="Deixe um comentário (opcional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          className="w-full bg-[#FFF8F5] border border-[#F0E4DF] rounded-xl p-4 mb-6 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none transition-all resize-none text-[#3D2A24]"
        />

        <button
          onClick={() => onSave(score, comment)}
          className="w-full bg-gradient-to-r from-[#C75B48] to-[#A84838] text-white py-4 rounded-xl font-handwritten font-semibold text-lg shadow-lg shadow-[#C75B48]/20 active:scale-[0.98] transition-all"
        >
          Salvar avaliação
        </button>
      </motion.div>
    </div>
  );
}
