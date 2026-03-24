import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Star,
  ArrowLeft,
  ArrowRight,
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
import { fetchCEP, formatCEP as formatCEPUtil } from './services/CEPService';
import LoginModal from './components/LoginModal';
import CouponInput from './components/CouponInput';
import { recordCouponUse } from './services/CouponService';
import { getActivePromotions } from './services/PromotionService';
import ComboCard from './components/ComboCard';
import PromoCard from './components/PromoCard';
import ProductCard from './components/ProductCard';
import CartItem from './components/CartItem';
import { getActiveBanners } from './services/BannerService';
import type { Banner } from './types';

type Screen = 'menu' | 'bag' | 'success';

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

const BANNER_IMAGES = [
  '/banner1.png',
  '/banner2.png',
  '/banner3.png'
];

const CATEGORY_ICONS: { [key: string]: any } = {
  tradicional: { name: 'Tradicionais', icon: Heart },
  fit: { name: 'Linha Fit', icon: Leaf },
  combo: { name: 'Combos', icon: ShoppingBag },
};

export default function App() {
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);

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
    const newErrors: { [key: string]: string } = {};

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

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const data = await getActiveBanners();
        setBanners(data);
      } catch (error) {
        console.error('Erro ao carregar banners:', error);
      } finally {
        setLoadingBanners(false);
      }
    };
    loadBanners();
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
        comboId: promo.id,
        quantity: 1,
        comboItems: promo.items?.map(i => ({ productId: i.productId, quantity: i.quantity }))
      }];
    });
  };
  const removeComboFromBag = (promoId: string) => {
    setBag(prev => prev.filter(item => item.comboId !== promoId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromBag(productId);
      return;
    }
    setBag(prev => prev.map(item => 
      item.productId === productId && !item.comboId ? { ...item, quantity } : item
    ));
  };

  const updateComboQuantity = (comboId: string, quantity: number) => {
    if (quantity <= 0) {
      removeComboFromBag(comboId);
      return;
    }
    setBag(prev => prev.map(item => 
      item.comboId === comboId ? { ...item, quantity } : item
    ));
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
      <div className="min-h-screen bg-[#FFF7F2] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-[#FF5C00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF7F2] text-[#3D2A24] font-sans selection:bg-[#FF5C00] selection:text-white">
      <AnimatePresence mode="wait">
        {currentScreen === 'menu' && (
          <MenuScreen
            products={products}
            bag={bag}
            addToBag={addToBag}
            removeFromBag={removeFromBag}
            getQuantity={getQuantity}
            totalItems={totalItems}
            onNext={() => setCurrentScreen('bag')}
            user={user}
            customer={customer}
            onLogout={handleLogout}
            onOpenLogin={openLogin}
            onRate={setRatingProduct}
            loadingRatings={loadingRatings}
            ratings={ratings}
            getAverageRating={getAverageRating}
            promotions={promotions}
            loadingPromotions={loadingPromotions}
            addComboToBag={addComboToBag}
            removeComboFromBag={removeComboFromBag}
            getComboQuantity={getComboQuantity}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            banners={banners}
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
            updateQuantity={updateQuantity}
            updateComboQuantity={updateComboQuantity}
            removeFromBag={removeFromBag}
            removeComboFromBag={removeComboFromBag}
            errors={errors}
            setErrors={setErrors}
            formatPhone={formatPhone}
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

      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onClose={() => setShowWelcomeModal(false)} 
      />
    </div>
  );
}

function WelcomeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/5 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md glass-effect rounded-[40px] p-8 relative overflow-hidden text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 transition-colors text-[#3D2A24]"
            >
              <X size={20} />
            </button>

            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <img
                src="/CampaniniSaboresLogo.png"
                alt="Logo"
                className="w-40 mx-auto"
                style={{ filter: 'sepia(1) saturate(800%) hue-rotate(340deg) brightness(0.95)' }}
              />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-handwritten text-[#FF5C00]">Olá!</h2>
              
              <p className="text-2xl font-handwritten text-[#3D2A24] leading-relaxed">
                Seja muito bem-vindo(a) à nossa família!
              </p>

              <p className="text-xl font-handwritten text-[#8C7066] leading-relaxed">
                Aqui cada esfiha é feita com muito carinho — da massa ao recheio, tudo com receita de família.
              </p>

              <p className="text-xl font-handwritten text-[#8C7066] leading-relaxed">
                Nossas esfihas chegam pré-assadas e congeladas. É só aquecer no forno ou airfryer e pronto — delícia garantida!
              </p>

              <div className="pt-4">
                <p className="text-2xl font-handwritten text-[#FF5C00]">
                  Escolha seus sabores favoritos e boa experiência!
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="bg-primary text-white px-10 py-3 rounded-full font-bold shadow-lg shadow-primary/20 mt-4 h-12 inline-flex items-center justify-center"
              >
                Ver cardápio
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MenuScreen({
  products,
  bag,
  addToBag,
  removeFromBag,
  getQuantity,
  totalItems,
  onNext,
  user,
  customer,
  onLogout,
  onOpenLogin,
  onRate,
  loadingRatings,
  ratings,
  getAverageRating,
  promotions,
  loadingPromotions,
  addComboToBag,
  removeComboFromBag,
  getComboQuantity,
  activeCategory,
  setActiveCategory,
  banners,
}: {
  products: Product[];
  bag: BagItem[];
  addToBag: (productId: string) => void;
  removeFromBag: (productId: string) => void;
  getQuantity: (productId: string) => number;
  totalItems: number;
  onNext: () => void;
  user: FirebaseUser | null;
  customer: Customer | null;
  onLogout: () => void;
  onOpenLogin: (mode?: 'login' | 'register') => void;
  onRate: (product: Product) => void;
  loadingRatings: boolean;
  ratings: Rating[];
  getAverageRating: (productId: string) => number;
  promotions: Promotion[];
  loadingPromotions: boolean;
  addComboToBag: (promo: Promotion) => void;
  removeComboFromBag: (promoId: string) => void;
  getComboQuantity: (promoId: string) => number;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  banners: Banner[];
}) {
  const navigate = useNavigate();
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    setBannerIndex(0);
  }, [banners.length]);

  useEffect(() => {
    const bannerCount = (banners && banners.length > 0) ? banners.length : BANNER_IMAGES.length;
    if (bannerCount <= 1) return;

    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % bannerCount);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const categories = ['all', 'tradicional', 'fit', 'combo'];

  return (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-xl mx-auto pb-36 bg-background min-h-screen"
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border-light px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF5C00] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#FF5C00]/20">
            C
          </div>
          <div>
            <h1 className="text-sm font-black text-text-main leading-tight tracking-tight uppercase">CAMPANINI SABORES</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate('/perfil')}
              className="w-10 h-10 rounded-full border-2 border-border-light overflow-hidden hover:border-primary transition-all"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-border-light flex items-center justify-center text-text-muted">
                  <User size={20} />
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => onOpenLogin('login')}
              className="text-sm font-semibold text-primary px-3 py-1 hover:bg-primary/5 rounded-lg transition-all"
            >
              Entrar
            </button>
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onNext}
            className="relative w-10 h-10 bg-background rounded-full flex items-center justify-center text-text-main hover:bg-border-light transition-all"
          >
            <ShoppingBag size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {totalItems}
              </span>
            )}
          </motion.button>
        </div>
      </header>

      <div className="px-4 pt-6">
        {/* Banner Carousel */}
        <section className="relative mb-6">
          <div className="relative h-48 sm:h-64 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/10 border border-white/20">
            <AnimatePresence mode="wait">
              <motion.div
                key={bannerIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {(() => {
                  const currentBanner = banners && banners.length > 0 ? banners[bannerIndex % banners.length] : null;
                  const fallbackImage = BANNER_IMAGES[bannerIndex % BANNER_IMAGES.length];
                  
                  const BannerContent = (
                    <div className="relative w-full h-full">
                      <motion.img
                        initial={{ scale: 1.15 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 6, ease: "linear" }}
                        src={currentBanner?.image || fallbackImage}
                        alt={currentBanner?.title || "Banner"}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Premium Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-7 sm:p-9">
                        <div className="overflow-hidden">
                          <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                          >
                            <h2 className="text-white font-black text-2xl sm:text-3xl leading-tight drop-shadow-lg uppercase tracking-tight">
                              {currentBanner?.title || (
                                bannerIndex === 0 ? 'Esfihas Artesanais' : 
                                bannerIndex === 1 ? 'Receita de Família' : 
                                'Sabor Incomparável'
                              )}
                            </h2>
                          </motion.div>
                        </div>
                        
                        <div className="overflow-hidden mt-1">
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                          >
                            <p className="text-white/90 text-sm sm:text-base font-medium drop-shadow-md">
                              {currentBanner?.subtitle || 'Peça agora e receba em casa com carinho'}
                            </p>
                          </motion.div>
                        </div>

                        {/* Glassmorphism Badge */}
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.6, type: "spring" }}
                          className="mt-4 self-start bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest"
                        >
                          {currentBanner?.tag || 'Exclusivo Campanini'}
                        </motion.div>
                      </div>
                    </div>
                  );

                  if (currentBanner?.link) {
                    return (
                      <a 
                        href={currentBanner.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full h-full"
                      >
                        {BannerContent}
                      </a>
                    );
                  }

                  return BannerContent;
                })()}
              </motion.div>
            </AnimatePresence>
            
            {/* Custom Pagination Dots */}
            <div className="absolute bottom-6 right-8 flex gap-2">
              {(banners.length > 0 ? banners : BANNER_IMAGES).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIndex(i)}
                  className={`h-2 rounded-full transition-all duration-500 shadow-sm ${
                    i === bannerIndex 
                      ? 'w-8 bg-primary border-none' 
                      : 'w-2 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Category Navigation (Pills) */}
        <nav className="sticky top-[64px] z-40 bg-background/80 backdrop-blur-md -mx-4 md:mx-0 border-b border-border-light mb-6">
          <div className="pill-nav px-4 md:px-0">
            <button
              onClick={() => setActiveCategory('all')}
              className={`pill-item ${activeCategory === 'all' ? 'pill-item-active' : 'pill-item-inactive'}`}
            >
              Todos
            </button>
            {categories.filter(c => c !== 'all').map(cat => {
              const info = CATEGORY_ICONS[cat];
              const Icon = info.icon;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`pill-item flex items-center gap-2 ${activeCategory === cat ? 'pill-item-active' : 'pill-item-inactive'}`}
                >
                  <Icon size={16} />
                  {info.name}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Products List */}
        <div className="space-y-8">
          {(activeCategory === 'all' || activeCategory === 'combo') && !loadingPromotions && promotions.filter(p => p.type === 'combo').length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-main">Combos Imperdíveis</h3>
                <div className="h-px flex-1 bg-border-light ml-4"></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {promotions.filter(p => p.type === 'combo').map(promo => (
                  <ComboCard
                    key={`promo-${promo.id}`}
                    promotion={promo}
                    products={products}
                    quantity={getComboQuantity(promo.id)}
                    onAdd={() => addComboToBag(promo)}
                    onRemove={() => removeComboFromBag(promo.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {categories.filter(c => c !== 'all' && c !== 'combo').map(cat => {
            if (activeCategory !== 'all' && activeCategory !== cat) return null;
            const filteredProducts = products.filter(p => p.category === cat);
            if (filteredProducts.length === 0) return null;

            return (
              <section key={cat}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-text-main">{CATEGORY_ICONS[cat].name}</h3>
                  <div className="h-px flex-1 bg-border-light ml-4"></div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 px-1">
                  {filteredProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={getQuantity(product.id)}
                      onAdd={() => addToBag(product.id)}
                      onRemove={() => removeFromBag(product.id)}
                      averageRating={getAverageRating(product.id)}
                      onRate={() => onRate(product)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-white via-white to-transparent z-50 flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNext}
            className="w-full max-w-lg bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-3"
          >
            <div className="relative">
              <ShoppingBag size={20} />
              <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            Ver sacola
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
  promotions,
  user,
  onOpenLogin,
  showSignupTip,
  setShowSignupTip,
  dismissedTips,
  setDismissedTips,
  appliedCoupon,
  appliedDiscount,
  onApplyCoupon,
  onRemoveCoupon,
  errors,
  setErrors,
  formatPhone,
  validateName,
  validatePhone,
  validateCEP,
  validateRequired,
  updateQuantity,
  updateComboQuantity,
  removeFromBag,
  removeComboFromBag,
  customer,
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
  onOpenLogin: (mode?: 'login' | 'register') => void;
  showSignupTip: boolean;
  setShowSignupTip: (show: boolean) => void;
  dismissedTips: Set<string>;
  setDismissedTips: React.Dispatch<React.SetStateAction<Set<string>>>;
  appliedCoupon: import('./types').Coupon | null;
  appliedDiscount: number;
  onApplyCoupon: (coupon: import('./types').Coupon, discount: number) => void;
  onRemoveCoupon: () => void;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  formatPhone: (value: string) => string;
  validateName: (value: string) => string;
  validatePhone: (value: string) => string;
  validateCEP: (value: string) => string;
  validateRequired: (value: string, fieldName: string) => string;
  updateQuantity: (id: string, q: number) => void;
  updateComboQuantity: (id: string, q: number) => void;
  removeFromBag: (id: string) => void;
  removeComboFromBag: (id: string) => void;
  customer: Customer | null;
}) {
  const [step, setStep] = useState<'bag' | 'details'>('bag');
  const tipKey = 'bag-signup-tip';
  const isTipDismissed = dismissedTips.has(tipKey);
  const [loadingCEP, setLoadingCEP] = useState(false);

  const handleCEPChange = async (value: string) => {
    const formatted = formatCEPUtil(value);
    setAddress(prev => ({ ...prev, zipCode: formatted }));
    const error = validateCEP(formatted);
    setErrors(prev => ({ ...prev, zipCode: error }));

    const cleanCEP = value.replace(/\D/g, '');
    if (cleanCEP.length === 8 && !error) {
      setLoadingCEP(true);
      try {
        const addressData = await fetchCEP(value);
        if (addressData) {
          setAddress(prev => ({
            ...prev,
            street: addressData.street,
            neighborhood: addressData.neighborhood,
            city: addressData.city,
            state: addressData.state,
            complement: addressData.complement || prev.complement,
          }));
          setErrors(prev => ({ ...prev, street: '', neighborhood: '', city: '', state: '' }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const steps = [
    { id: 'bag', label: 'Sacola', icon: ShoppingBag },
    { id: 'details', label: 'Entrega', icon: User }
  ];

  const canGoNext = () => {
    if (step === 'bag') return bag.length > 0;
    if (step === 'details') {
      return (
        customerInfo.name.length >= 3 &&
        customerInfo.phone.replace(/\D/g, '').length >= 10 &&
        address.street &&
        address.number &&
        address.neighborhood &&
        address.city &&
        address.state
      );
    }
    return true;
  };

  return (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-xl mx-auto px-4 py-8 pb-32"
    >
      {/* Header & Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-8">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={step === 'bag' ? onBack : () => setStep('bag')}
            className="p-3 bg-white rounded-2xl shadow-sm text-[#3D2A24] border border-gray-100"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <h2 className="text-2xl font-bold text-[#3D2A24]">
            {step === 'bag' ? 'Sua Sacola' : 'Finalizar Pedido'}
          </h2>
        </div>

        <div className="flex items-center justify-between px-4 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
          {steps.map((s, idx) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  step === s.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' 
                    : steps.indexOf(steps.find(st => st.id === step)!) > idx
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-400 border border-gray-100'
                }`}
              >
                {steps.indexOf(steps.find(st => st.id === step)!) > idx ? <CheckCircle2 size={20} /> : <s.icon size={18} />}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${step === s.id ? 'text-primary' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'bag' ? (
          <motion.div
            key="bag-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Bag Items */}
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 space-y-6">
                  <div className="space-y-0.5">
                    {bag.map((item, idx) => (
                      <CartItem
                        key={`${item.productId}-${item.comboId}-${idx}`}
                        item={item}
                        product={products.find(p => p.id === item.productId)}
                        promotion={promotions.find(p => p.id === item.comboId)}
                        onUpdateQuantity={(q) => {
                          if (item.comboId) {
                            updateComboQuantity(item.comboId, q);
                          } else if (item.productId) {
                            updateQuantity(item.productId, q);
                          }
                        }}
                        onRemove={() => {
                          if (item.comboId) {
                            removeComboFromBag(item.comboId);
                          } else if (item.productId) {
                            removeFromBag(item.productId);
                          }
                        }}
                      />
                    ))}
                  </div>

                  <div className="pt-6 border-t-2 border-dashed border-gray-100 space-y-3">
                    <CouponInput
                      orderTotal={totalPrice}
                      customerId={user?.uid}
                      customerEmail={user?.email || undefined}
                      appliedCoupon={appliedCoupon}
                      appliedDiscount={appliedDiscount}
                      onApply={onApplyCoupon}
                      onRemove={onRemoveCoupon}
                    />

                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>R$ {totalPrice.toFixed(2)}</span>
                      </div>
                      {appliedDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600 font-medium">
                          <span>Desconto ({appliedCoupon?.code})</span>
                          <span>-R$ {appliedDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold text-[#3D2A24] pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-primary text-2xl">R$ {finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

            {/* Signup Tip */}
            {!user && showSignupTip && !isTipDismissed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/5 rounded-3xl p-6 border-2 border-primary/10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => { setDismissedTips(prev => new Set(prev).add(tipKey)); setShowSignupTip(false); }} className="text-primary/40 hover:text-primary">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                    <Gift size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#3D2A24] mb-1 text-sm">Ganhe benefícios extras!</h4>
                    <p className="text-xs text-gray-500 mb-4">Acumule pontos em cada pedido e troque por esfihas grátis.</p>
                    <div className="flex gap-2">
                       <button onClick={() => onOpenLogin('register')} className="px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-xl shadow-md">Criar Conta</button>
                       <button onClick={() => onOpenLogin('login')} className="px-4 py-2 bg-white text-[#3D2A24] text-[11px] font-bold rounded-xl border border-gray-100">Login</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="details-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#3D2A24] flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                Seus Dados
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome Completo</label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={e => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-gray-300"
                    placeholder="Como devemos te chamar?"
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={e => setCustomerInfo(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-gray-300"
                    placeholder="(00) 00000-0000"
                  />
                  {errors.phone && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Address Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#3D2A24] flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                Endereço de Entrega
              </h3>
              <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">CEP</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={address.zipCode}
                        onChange={e => handleCEPChange(e.target.value)}
                        className="w-full bg-gray-50 border border-transparent rounded-2xl p-4 focus:bg-white focus:border-primary outline-none transition-all"
                        placeholder="00000-000"
                      />
                      {loadingCEP && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
                    </div>
                  </div>
                  <div className="col-span-8 space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Rua / Avenida</label>
                    <input
                      type="text"
                      value={address.street}
                      onChange={e => setAddress(prev => ({ ...prev, street: e.target.value }))}
                      className="w-full bg-gray-50 border border-transparent rounded-2xl p-4 focus:bg-white focus:border-primary outline-none transition-all"
                      placeholder="Nome da rua"
                    />
                  </div>
                  <div className="col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Número</label>
                    <input
                      type="text"
                      value={address.number}
                      onChange={e => setAddress(prev => ({ ...prev, number: e.target.value }))}
                      className="w-full bg-gray-50 border border-transparent rounded-2xl p-4 focus:bg-white focus:border-primary outline-none transition-all"
                      placeholder="123"
                    />
                  </div>
                  <div className="col-span-12 space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Complemento / Ref</label>
                    <input
                      type="text"
                      value={address.complement}
                      onChange={e => setAddress(prev => ({ ...prev, complement: e.target.value }))}
                      className="w-full bg-gray-50 border border-transparent rounded-2xl p-4 focus:bg-white focus:border-primary outline-none transition-all"
                      placeholder="Apto, Bloco, Casa..."
                    />
                  </div>
                   <div className="col-span-12 space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Bairro</label>
                    <input
                      type="text"
                      value={address.neighborhood}
                      onChange={e => setAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                      className="w-full bg-gray-50 border border-transparent rounded-2xl p-4 focus:bg-white focus:border-primary outline-none transition-all"
                      placeholder="Nome do bairro"
                    />
                  </div>
                  <div className="col-span-8 space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Cidade</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={e => setAddress(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full bg-gray-50 border border-transparent rounded-2xl p-4 focus:bg-white focus:border-primary outline-none transition-all"
                      placeholder="Santo André"
                    />
                  </div>
                  <div className="col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={address.state}
                      onChange={e => setAddress(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                      className="w-full bg-gray-50 border border-transparent rounded-2xl p-4 focus:bg-white focus:border-primary outline-none transition-all text-center"
                      placeholder="SP"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#3D2A24] flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                Observações
              </h3>
              <textarea
                value={customerInfo.obs}
                onChange={e => setCustomerInfo(prev => ({ ...prev, obs: e.target.value }))}
                className="w-full bg-white border border-gray-100 rounded-3xl p-5 shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all min-h-[120px] resize-none text-sm"
                placeholder="Ex: Tirar cebola, campainha com defeito..."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-50 flex justify-center"
      >
        <div className="w-full max-w-xl flex gap-3">
          {step === 'details' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep('bag')}
              className="px-6 bg-gray-100 text-[#3D2A24] rounded-2xl font-bold border border-gray-200"
            >
              Voltar
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: canGoNext() ? 1.02 : 1 }}
            whileTap={{ scale: canGoNext() ? 0.98 : 1 }}
            onClick={step === 'bag' ? () => setStep('details') : onRegister}
            disabled={!canGoNext()}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${
              canGoNext() 
                ? 'bg-primary text-white shadow-primary/30' 
                : 'bg-gray-100 text-gray-300 border border-gray-100 shadow-none cursor-not-allowed'
            }`}
          >
            {step === 'bag' ? (
              <>Continuar <ArrowRight size={18} /></>
            ) : (
              <>Fazer Pedido <CheckCircle2 size={18} /></>
            )}
          </motion.button>
        </div>
      </motion.div>
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
            <span className="text-[#FF5C00] font-bold">1.</span>
            <p>Retire da geladeira 15 minutos antes de preparar</p>
          </div>
          <div className="flex gap-3">
            <span className="text-[#FF5C00] font-bold">2.</span>
            <p>Coloque as esfihas em uma forma untada</p>
          </div>
          <div className="flex gap-3">
            <span className="text-[#FF5C00] font-bold">3.</span>
            <p>Forno ou airfryer a 120°C por 15 minutos</p>
          </div>
          <div className="flex gap-3">
            <span className="text-[#FF5C00] font-bold">4.</span>
            <p>Retire, espere 1 minuto e aproveite!</p>
          </div>

          <p className="font-semibold text-[#FF5C00] pt-2">Bom apetite!</p>

          <div className="p-3 bg-[#FFF3E0]/50 rounded-xl border border-[#FFB800]/30 text-[#5D4037]">
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
            className="absolute top-4 right-4 p-2 text-[#8C7066] hover:text-[#3D2A24] hover:bg-[#FFF7F2] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>

          <h3 className="text-xl font-semibold text-[#3D2A24] mb-4 pr-8">{product.name}</h3>
          <p className="text-[#8C7066] mb-6">Faça login para avaliar este produto</p>

          <button
            onClick={onOpenLogin}
            className="w-full bg-gradient-to-r from-[#FF5C00] to-[#E65100] text-white py-4 rounded-xl font-handwritten font-semibold text-lg shadow-lg shadow-[#FF5C00]/20 active:scale-[0.98] transition-all"
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
          className="absolute top-4 right-4 p-2 text-[#8C7066] hover:text-[#3D2A24] hover:bg-[#FFF7F2] rounded-lg transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ''} className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#FF5C00] flex items-center justify-center">
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
                  fill={star <= score ? "#FFB800" : "none"}
                  className={star <= score ? "text-[#FFB800]" : "text-[#F0E4DF]"}
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
          className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-4 mb-6 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all resize-none text-[#3D2A24]"
        />

        <button
          onClick={() => onSave(score, comment)}
          className="w-full bg-gradient-to-r from-[#FF5C00] to-[#E65100] text-white py-4 rounded-xl font-handwritten font-semibold text-lg shadow-lg shadow-[#FF5C00]/20 active:scale-[0.98] transition-all"
        >
          Salvar avaliação
        </button>
      </motion.div>
    </div>
  );
}

