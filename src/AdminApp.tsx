import React, { useState, useEffect, useRef } from 'react';
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
  ChefHat,
  Clock,
  Truck,
  Package,
  Settings,
  LayoutDashboard,
  ShoppingCart,
  Users,
  MessageSquare,
  BarChart3,
  Bell,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  PieChart,
  List,
  Grid3X3,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Tag,
  Ticket,
  Percent,
  PackageSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, storage, ref, uploadBytes, getDownloadURL, deleteDoc } from './firebase';
import { User as FirebaseUser } from 'firebase/auth';
import type { Coupon, Customer, Promotion } from './types';
import { getCoupons, createCoupon, updateCoupon } from './services/CouponService';
import { getAllCustomers, getLoyaltyStats, getRescueThresholds, enrichCustomerWithLoyalty } from './services/LoyaltyService';
import { getPromotions, createPromotion, updatePromotion, deletePromotion } from './services/PromotionService';
import { getOrders, updateOrderStatus, getOrderStats, markOrderAsPaid } from './services/OrderService';
import { getRatings, deleteRating } from './services/RatingService';
import { checkIsAdmin, addAdmin, removeAdmin } from './services/AdminService';

type FirebaseTimestamp = { toDate: () => Date };

function toDate(date: FirebaseTimestamp | Date | undefined): Date {
  if (!date) return new Date();
  if ('toDate' in date) return date.toDate();
  return date;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  tags: string[];
  category: 'tradicional' | 'fit';
  active: boolean;
  createdAt?: FirebaseTimestamp | Date;
}

interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  customerObs: string;
  items: { productId: string; quantity: number }[];
  total: number;
  status: 'novo' | 'producao' | 'saiu' | 'entregue';
  createdAt: FirebaseTimestamp | Date;
  whatsappSent: boolean;
  paid: boolean;
  loyaltyPointsEarned?: number;
}

const PRODUCTS_MOCK = [
  { id: '1', name: 'Esfiha de Carne Clássica', price: 30, sales: 142, rating: 4.8, active: true },
  { id: '2', name: 'Esfiha Queijo com Ricota', price: 30, sales: 98, rating: 4.6, active: true },
  { id: '3', name: 'Esfiha Frango com Catupiry', price: 30, sales: 125, rating: 4.9, active: true },
  { id: '4', name: 'Esfiha Calabresa com Catupiry', price: 30, sales: 87, rating: 4.7, active: true },
  { id: '5', name: 'Esfiha Palmito Cremoso', price: 30, sales: 45, rating: 4.5, active: true },
  { id: '6', name: 'Espinafre com Tomate Seco', price: 30, sales: 32, rating: 4.4, active: true },
  { id: '7', name: 'Esfiha Escarola Refogada', price: 30, sales: 28, rating: 4.3, active: true },
];

const ORDERS_MOCK: Order[] = [
  { id: 'ord1', customerName: 'Maria Santos', customerAddress: 'Rua das Flores, 123 - Jardim Primavera', customerObs: '', items: [{ productId: '1', quantity: 2 }, { productId: '3', quantity: 1 }], total: 90, status: 'novo', createdAt: new Date(), whatsappSent: true, paid: false },
  { id: 'ord2', customerName: 'João Silva', customerAddress: 'Av. Brasil, 456 - Centro', customerObs: 'Sem cebola', items: [{ productId: '4', quantity: 3 }], total: 90, status: 'producao', createdAt: new Date(Date.now() - 3600000), whatsappSent: true, paid: false },
  { id: 'ord3', customerName: 'Ana Oliveira', customerAddress: 'Rua do Sol, 789 - Vila Nova', customerObs: '', items: [{ productId: '1', quantity: 1 }, { productId: '2', quantity: 1 }, { productId: '6', quantity: 1 }], total: 90, status: 'saiu', createdAt: new Date(Date.now() - 7200000), whatsappSent: true, paid: false },
  { id: 'ord4', customerName: 'Carlos Mendes', customerAddress: 'Alameda das Palmeiras, 321 - Parque', customerObs: 'Entregar após 18h', items: [{ productId: '3', quantity: 2 }, { productId: '5', quantity: 1 }], total: 90, status: 'entregue', createdAt: new Date(Date.now() - 86400000), whatsappSent: true, paid: false },
];

const RATINGS_MOCK = [
  { id: '1', productName: 'Esfiha de Carne Clássica', userName: 'Maria', score: 5, comment: 'A melhor esfiha que já provei!', createdAt: new Date() },
  { id: '2', productName: 'Esfiha Frango com Catupiry', userName: 'João', score: 4, comment: 'Muito bom, mas poderia ser maior', createdAt: new Date(Date.now() - 86400000) },
  { id: '3', productName: 'Esfiha Queijo com Ricota', userName: 'Ana', score: 5, comment: 'Perfeito para o lanche da tarde', createdAt: new Date(Date.now() - 172800000) },
];

const CUSTOMERS_MOCK = [
  { id: '1', name: 'Maria Santos', email: 'maria@email.com', orders: 12, totalSpent: 1080, lastOrder: new Date(), fidelity: 3 },
  { id: '2', name: 'João Silva', email: 'joao@email.com', orders: 8, totalSpent: 720, lastOrder: new Date(Date.now() - 86400000), fidelity: 2 },
  { id: '3', name: 'Ana Oliveira', email: 'ana@email.com', orders: 5, totalSpent: 450, lastOrder: new Date(Date.now() - 172800000), fidelity: 1 },
  { id: '4', name: 'Carlos Mendes', email: 'carlos@email.com', orders: 15, totalSpent: 1350, lastOrder: new Date(Date.now() - 259200000), fidelity: 3 },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { id: 'products', label: 'Produtos', icon: ShoppingBag },
  { id: 'coupons', label: 'Cupons', icon: Ticket },
  { id: 'promotions', label: 'Promoções', icon: PackageSearch },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'ratings', label: 'Avaliações', icon: Star },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Package; color: string; bg: string }> = {
  novo: { label: 'Novo', icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
  producao: { label: 'Em Produção', icon: ChefHat, color: 'text-amber-600', bg: 'bg-amber-100' },
  saiu: { label: 'Saiu', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-100' },
  entregue: { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' }
};

const DEFAULT_PRODUCTS: Omit<Product, 'id' | 'createdAt'>[] = [
  { name: 'Esfiha de Carne Clássica', description: 'A preferida de todos. Carne de primeira, suculenta e temperada com tomate e cebola frescos.', price: 30, tags: ['Clássica'], category: 'tradicional', active: true },
  { name: 'Esfiha Queijo com Ricota', description: 'O sabor mais suave do cardápio. Mix de queijos para um lanche leve e proteico.', price: 30, tags: ['Leve'], category: 'tradicional', active: true },
  { name: 'Esfiha Frango com Catupiry (Original)', description: 'Peito de frango desfiado com tempero caseiro e requeijão premium.', price: 30, tags: ['Clássica'], category: 'tradicional', active: true },
  { name: 'Esfiha Calabresa com Catupiry', description: 'Calabresa moída de alta qualidade e requeijão cremoso.', price: 30, tags: ['Clássica'], category: 'tradicional', active: true },
  { name: 'Esfiha Palmito Cremoso', description: 'Palmito artesanal em um recheio suave e envolvente.', price: 30, tags: ['Leve'], category: 'tradicional', active: true },
  { name: 'Espinafre com Tomate Seco', description: 'Espinafre equilibrado com tomate seco e creme de ricota.', price: 30, tags: ['Fit'], category: 'fit', active: true },
  { name: 'Esfiha Escarola Refogada com Mussarela Leve', description: 'Escarola refogada com tempero artesanal e mussarela.', price: 30, tags: ['Fit', 'Leve'], category: 'fit', active: true },
];

export default function AdminApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [selectedCouponForReport, setSelectedCouponForReport] = useState<Coupon | null>(null);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const [ratings, setRatings] = useState<import('./types').Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customersSubTab, setCustomersSubTab] = useState<'list' | 'loyalty'>('list');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    newOrders: 0,
    avgRating: 0,
  });
  const [loadingDashboardStats, setLoadingDashboardStats] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setLoadingAdmin(true);
        try {
          const admin = await checkIsAdmin();
          setIsAdmin(admin);
        } catch (e) {
          setIsAdmin(false);
        }
        setLoadingAdmin(false);
      } else {
        setIsAdmin(false);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardStats();
    }
    if (activeTab === 'products') {
      loadProducts();
    }
    if (activeTab === 'coupons') {
      loadCoupons();
    }
    if (activeTab === 'promotions') {
      loadPromotions();
    }
    if (activeTab === 'orders') {
      loadOrders();
    }
    if (activeTab === 'ratings') {
      loadRatings();
    }
    if (activeTab === 'customers') {
      loadCustomers();
    }
  }, [activeTab]);

  const loadDashboardStats = async () => {
    try {
      setLoadingDashboardStats(true);
      const [orderStats, ratingsData] = await Promise.all([
        getOrderStats(),
        getRatings()
      ]);
      
      const avgRating = ratingsData.length > 0
        ? ratingsData.reduce((sum, r) => sum + r.score, 0) / ratingsData.length
        : 0;
      
      setDashboardStats({
        totalRevenue: orderStats.totalRevenue,
        totalOrders: orderStats.totalOrders,
        avgOrderValue: orderStats.avgOrderValue,
        newOrders: orderStats.newOrders,
        avgRating,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoadingDashboardStats(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      alert('Erro ao fazer login. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const productsRef = collection(db, 'products');
      const q = query(productsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        await seedDefaultProducts();
        return;
      }
      
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

  const seedDefaultProducts = async () => {
    try {
      for (const product of DEFAULT_PRODUCTS) {
        await addDoc(collection(db, 'products'), {
          ...product,
          createdAt: serverTimestamp()
        });
      }
      await loadProducts();
    } catch (error) {
      console.error('Erro ao criar produtos padrão:', error);
    }
  };

  const saveProduct = async (productData: Omit<Product, 'id' | 'createdAt'>, imageFile?: File) => {
    try {
      let imageUrl = productData.image;

      if (imageFile) {
        setUploadingImage(true);
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
        setUploadingImage(false);
      }

      if (editingProduct) {
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, {
          ...productData,
          image: imageUrl
        });
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          image: imageUrl,
          createdAt: serverTimestamp()
        });
      }

      await loadProducts();
      setShowProductModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      setUploadingImage(false);
      alert('Erro ao salvar produto. Tente novamente.');
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      await deleteDoc(doc(db, 'products', productId));
      await loadProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto. Tente novamente.');
    }
  };

  const toggleProductActive = async (product: Product) => {
    try {
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, { active: !product.active });
      await loadProducts();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
    }
  };

  const loadCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const data = await getCoupons();
      setCoupons(data);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const saveCoupon = async (data: Parameters<typeof createCoupon>[0]) => {
    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, {
          type: data.type,
          value: data.value,
          minOrderValue: data.minOrderValue,
          maxDiscount: data.maxDiscount,
          expiresAt: data.expiresAt,
          maxUses: data.maxUses,
          perCustomerLimit: data.perCustomerLimit,
          active: true,
        });
      } else {
        await createCoupon(data);
      }
      await loadCoupons();
      setShowCouponModal(false);
      setEditingCoupon(null);
    } catch (error) {
      console.error('Erro ao salvar cupom:', error);
      alert('Erro ao salvar cupom. Tente novamente.');
    }
  };

  const toggleCouponActive = async (coupon: Coupon) => {
    try {
      await updateCoupon(coupon.id, { active: !coupon.active });
      await loadCoupons();
    } catch (error) {
      console.error('Erro ao atualizar cupom:', error);
    }
  };

  const loadPromotions = async () => {
    try {
      setLoadingPromotions(true);
      const data = await getPromotions();
      setPromotions(data);
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
    } finally {
      setLoadingPromotions(false);
    }
  };

  const savePromo = async (data: Parameters<typeof createPromotion>[0]) => {
    try {
      if (editingPromo) {
        await updatePromotion(editingPromo.id, data);
      } else {
        await createPromotion(data);
      }
      await loadPromotions();
      setShowPromoModal(false);
      setEditingPromo(null);
    } catch (error) {
      console.error('Erro ao salvar promoção:', error);
      alert('Erro ao salvar promoção. Tente novamente.');
    }
  };

  const togglePromoActive = async (promo: Promotion) => {
    try {
      await updatePromotion(promo.id, { active: !promo.active });
      await loadPromotions();
    } catch (error) {
      console.error('Erro ao atualizar promoção:', error);
    }
  };

  const removePromo = async (promoId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta promoção?')) return;
    try {
      await deletePromotion(promoId);
      await loadPromotions();
    } catch (error) {
      console.error('Erro ao excluir promoção:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await getOrders();
      setOrders(data);
      const newCount = data.filter(o => o.status === 'novo').length;
      setNewOrdersCount(newCount);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  };

  const handleTogglePaid = async (order: Order) => {
    if (!order.paid && order.customerId) {
      const points = Math.floor(order.total);
      await markOrderAsPaid(order.id, order.customerId, points, order.total);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, paid: true, loyaltyPointsEarned: points } : o));
    }
  };

  const loadRatings = async () => {
    try {
      setLoadingRatings(true);
      const data = await getRatings();
      setRatings(data);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setLoadingRatings(false);
    }
  };

  const handleDeleteRating = async (ratingId: string) => {
    if (!confirm('Excluir esta avaliação?')) return;
    try {
      await deleteRating(ratingId);
      setRatings(prev => prev.filter(r => r.id !== ratingId));
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const data = await getAllCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const formatDate = (date: { toDate?: () => Date } | Date) => {
    const d = date && 'toDate' in date ? date.toDate() : (date || new Date());
    return d.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-[#C75B48]" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-3xl p-10 shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-[#C75B48] to-[#A84838] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Settings size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Painel Admin</h1>
          <p className="text-gray-500 mb-8">Campanini Sabores</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border-2 border-gray-200 rounded-2xl py-4 px-6 font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
          <p className="text-xs text-gray-400 mt-6">Acesso restrito a administradores</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <motion.aside 
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="bg-gray-900 text-white flex flex-col fixed h-full z-20"
      >
        <div className="p-6 border-b border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#C75B48] to-[#A84838] rounded-xl flex items-center justify-center flex-shrink-0">
            <Leaf size={24} className="text-white" />
          </div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-bold text-lg">Campanini</h1>
              <p className="text-xs text-gray-400">Sabores Admin</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-[#C75B48] text-white shadow-lg shadow-[#C75B48]/30' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={22} />
              {sidebarOpen && (
                <span className="font-medium flex-1 text-left">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <User size={20} />
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.displayName}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white shadow-lg"
        >
          <ChevronRight size={14} className={sidebarOpen ? '' : 'rotate-180'} />
        </button>
      </motion.aside>

      <main className={`flex-1 ${sidebarOpen ? 'ml-[280px]' : 'ml-[80px]'} transition-all`}>
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-gray-500">
                {activeTab === 'dashboard' && 'Visão geral do seu negócio'}
                {activeTab === 'orders' && 'Gerencie os pedidos'}
                {activeTab === 'products' && 'Catálogo de produtos'}
                {activeTab === 'customers' && 'Base de clientes'}
                {activeTab === 'ratings' && 'Avaliações dos clientes'}
                {activeTab === 'reports' && 'Relatórios e métricas'}
                {activeTab === 'settings' && 'Configurações da loja'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell size={22} />
                {newOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {newOrdersCount}
                  </span>
                )}
              </button>
              <a 
                href="/" 
                target="_blank"
                className="text-sm text-[#C75B48] hover:underline flex items-center gap-1"
              >
                Ver Site <Leaf size={14} />
              </a>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <DashboardContent 
              totalRevenue={dashboardStats.totalRevenue} 
              totalOrders={dashboardStats.totalOrders} 
              avgRating={dashboardStats.avgRating} 
              newOrders={dashboardStats.newOrders}
              loading={loadingDashboardStats}
              recentOrders={orders}
              products={products}
            />
          )}

          {/* Orders */}
          {activeTab === 'orders' && (
            <OrdersContent
              orders={orders}
              loadingOrders={loadingOrders}
              products={products}
              onStatusChange={handleOrderStatusChange}
              onTogglePaid={handleTogglePaid}
            />
          )}

          {/* Products */}
          {activeTab === 'products' && (
            <ProductsContent 
              products={products}
              loadingProducts={loadingProducts}
              onEdit={(product) => {
                setEditingProduct(product);
                setShowProductModal(true);
              }}
              onDelete={deleteProduct}
              onToggleActive={toggleProductActive}
              onAddNew={() => {
                setEditingProduct(null);
                setShowProductModal(true);
              }}
            />
          )}

          {/* Coupons */}
          {activeTab === 'coupons' && (
            <CouponsContent
              coupons={coupons}
              loadingCoupons={loadingCoupons}
              onAddNew={() => {
                setEditingCoupon(null);
                setShowCouponModal(true);
              }}
              onEdit={(coupon) => {
                setEditingCoupon(coupon);
                setShowCouponModal(true);
              }}
              onToggleActive={toggleCouponActive}
              onViewReport={setSelectedCouponForReport}
            />
          )}

          {/* Promotions */}
          {activeTab === 'promotions' && (
            <PromotionsContent
              promotions={promotions}
              products={products}
              loadingPromotions={loadingPromotions}
              onAddNew={() => {
                setEditingPromo(null);
                setShowPromoModal(true);
              }}
              onEdit={(promo) => {
                setEditingPromo(promo);
                setShowPromoModal(true);
              }}
              onToggleActive={togglePromoActive}
              onDelete={removePromo}
            />
          )}

          {/* Customers */}
          {activeTab === 'customers' && (
            <CustomersContent
              customers={customers}
              loadingCustomers={loadingCustomers}
              subTab={customersSubTab}
              onSubTabChange={setCustomersSubTab}
            />
          )}

          {/* Ratings */}
          {activeTab === 'ratings' && (
            <RatingsContent
              ratings={ratings}
              loadingRatings={loadingRatings}
              products={products}
              onDelete={handleDeleteRating}
            />
          )}

          {/* Reports */}
          {activeTab === 'reports' && (
            <ReportsContent orders={orders} products={products} />
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <SettingsContent />
          )}
        </div>
      </main>

      <AnimatePresence>
        {showProductModal && (
          <ProductModal
            product={editingProduct}
            onSave={saveProduct}
            onClose={() => {
              setShowProductModal(false);
              setEditingProduct(null);
            }}
            uploading={uploadingImage}
          />
        )}
        {showCouponModal && (
          <CouponModal
            coupon={editingCoupon}
            onSave={saveCoupon}
            onClose={() => {
              setShowCouponModal(false);
              setEditingCoupon(null);
            }}
          />
        )}
        {showPromoModal && (
          <PromoModal
            promotion={editingPromo}
            products={products}
            onSave={savePromo}
            onClose={() => {
              setShowPromoModal(false);
              setEditingPromo(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DashboardContent({ totalRevenue, totalOrders, avgRating, newOrders, loading, recentOrders, products }: { 
  totalRevenue: number; 
  totalOrders: number; 
  avgRating: number; 
  newOrders: number; 
  loading?: boolean;
  recentOrders?: Order[];
  products?: Product[];
}) {
  const navigateToOrders = () => {
    window.dispatchEvent(new CustomEvent('navigateToOrders'));
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[#C75B48]" />
      </div>
    );
  }
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign size={24} className="text-green-600" />
            </div>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <TrendingUp size={12} /> +12%
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-1">Receita do Mês</p>
          <p className="text-3xl font-bold text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingCart size={24} className="text-blue-600" />
            </div>
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <TrendingUp size={12} /> +8%
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-1">Pedidos do Mês</p>
          <p className="text-3xl font-bold text-gray-800">{totalOrders}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Star size={24} className="text-amber-600" />
            </div>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <TrendingUp size={12} /> +0.2
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-1">Avaliação Média</p>
          <p className="text-3xl font-bold text-gray-800">{avgRating} <span className="text-lg text-gray-400">/ 5</span></p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-purple-600" />
            </div>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </div>
          <p className="text-gray-500 text-sm mb-1">Pedidos Novos</p>
          <p className="text-3xl font-bold text-gray-800">{newOrders}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">Pedidos por Dia</h3>
            <select className="text-sm border-none bg-gray-100 rounded-lg px-3 py-1.5 text-gray-600">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
              <option>Este mês</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {[65, 45, 78, 52, 90, 68, 85].map((value, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-gradient-to-t from-[#C75B48] to-[#E8A849] rounded-t-lg transition-all hover:opacity-80"
                  style={{ height: `${value}%` }}
                />
                <span className="text-xs text-gray-400">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-6">Produtos Mais Vendidos</h3>
          <div className="space-y-4">
            {(products || []).slice(0, 4).map((product, i) => (
              <div key={product.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-300">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">R$ {product.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {(!products || products.length === 0) && (
              <p className="text-sm text-gray-400">Nenhum produto cadastrado</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-800">Pedidos Recentes</h3>
          <button className="text-sm text-[#C75B48] hover:underline">
            Ver todos
          </button>
        </div>
        <div className="space-y-4">
          {(recentOrders || []).slice(0, 3).map(order => {
            const statusConfig = STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            return (
              <div key={order.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded">#{order.id.slice(0, 6)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color} font-medium`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <p className="font-medium text-gray-800">{order.customerName}</p>
                  <p className="text-sm text-gray-500">{order.items.reduce((acc: number, i: any) => acc + i.quantity, 0)} itens</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#C75B48]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}</p>
                  <p className="text-xs text-gray-400">{toDate(order.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function OrdersContent({ orders, loadingOrders, products, onStatusChange, onTogglePaid }: {
  orders: Order[];
  loadingOrders: boolean;
  products: Product[];
  onStatusChange: (orderId: string, status: Order['status']) => Promise<void>;
  onTogglePaid: (order: Order) => Promise<void>;
}) {
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({});
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDateTime = (date: FirebaseTimestamp | Date) => {
    const d = toDate(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return `Hoje ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Ontem ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  const filteredOrders = orders.filter(order => {
    const orderDate = toDate(order.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilter === 'today' && orderDate.toDateString() !== today.toDateString()) return false;
    if (dateFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (orderDate.toDateString() !== yesterday.toDateString()) return false;
    }
    
    if (filter !== 'all' && order.status !== filter) return false;
    return true;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    return toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime();
  });

  const todayStats = orders.filter(order => {
    const orderDate = toDate(order.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orderDate >= today;
  });

  const totalToday = todayStats.reduce((acc, o) => acc + o.total, 0);
  const paidToday = todayStats.filter(o => o.paid).reduce((acc, o) => acc + o.total, 0);
  const pendingToday = totalToday - paidToday;

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  const handleCopyOrder = (order: Order) => {
    const itemsText = order.items.map((item: any) => {
      if (item.comboId) {
        const comboItems = item.comboItems?.map((ci: any) => `${ci.quantity}x ${getProductName(ci.productId)}`).join(', ');
        return `[COMBO] ${item.quantity}x ${item.comboName || 'Combo'} (${comboItems})`;
      }
      return `${item.quantity}x ${getProductName(item.productId)}`;
    }).join('\n');

    const text = `📋 *Pedido #${order.id.slice(0, 8).toUpperCase()}*\n\n👤 *Cliente:* ${order.customerName}\n📍 *Endereço:* ${order.customerAddress}\n${order.customerObs ? `📝 *Obs:* ${order.customerObs}\n` : ''}\n📦 *Itens:*\n${itemsText}\n\n💰 *Total:* ${formatCurrency(order.total)}\n${order.paid ? '✅ *Pago*' : '⏳ *Pendente de pagamento*'}`;
    
    navigator.clipboard.writeText(text);
    alert('Pedido copiado para a área de transferência!');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Pedidos Hoje</p>
          <p className="text-2xl font-bold text-gray-800">{todayStats.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Hoje</p>
          <p className="text-2xl font-bold text-[#C75B48]">{formatCurrency(totalToday)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Recebido</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(paidToday)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Pendente</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(pendingToday)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Package size={18} />
            <span>{sortedOrders.length} pedidos</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="all">Todos</option>
            </select>
            {['Todos', 'Novos', 'Produção', 'Saiu', 'Entregues'].map((label, i) => {
              const values = ['all', 'novo', 'producao', 'saiu', 'entregue'];
              return (
                <button
                  key={label}
                  onClick={() => setFilter(values[i])}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === values[i]
                      ? 'bg-[#C75B48] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Header */}
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-2">Cliente</div>
          <div className="col-span-3">Itens</div>
          <div className="col-span-2">Endereço</div>
          <div className="col-span-1 text-right">Valor</div>
          <div className="col-span-1 text-center">Pago</div>
          <div className="col-span-2 text-center">Status</div>
        </div>

        {/* Orders List */}
        <div className="divide-y divide-gray-100">
          {sortedOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            const itemCount = order.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
            
            return (
              <div 
                key={order.id} 
                className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors cursor-pointer ${
                  order.status === 'novo' ? 'bg-blue-50/50' : ''
                }`}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="col-span-1 flex flex-col">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{order.id.slice(0, 6).toUpperCase()}</span>
                  {order.whatsappSent && <MessageCircle size={14} className="text-green-600 ml-1" />}
                  <div className="text-xs text-gray-400 mt-1">{formatDateTime(order.createdAt)}</div>
                </div>
                
                <div className="col-span-2">
                  <p className="font-medium text-gray-800 text-sm">{order.customerName}</p>
                  {order.customerObs && <p className="text-xs text-gray-400 truncate">Obs: {order.customerObs}</p>}
                </div>
                
                <div className="col-span-3">
                  <div className="text-sm text-gray-600">
                    {order.items.map((item: any, i: number) => (
                      <span key={i}>
                        {item.comboId ? <span className="text-[#E8A849] font-medium">[COMBO]</span> : null}
                        {item.quantity}x {item.comboId ? (item.comboName || 'Combo') : getProductName(item.productId)}
                        {i < order.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">{itemCount} itens</p>
                </div>
                
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 truncate">{order.customerAddress}</p>
                </div>
                
                <div className="col-span-1 text-right">
                  <p className="font-bold text-[#C75B48]">{formatCurrency(order.total)}</p>
                </div>
                
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePaid(order);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      order.paid
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    {order.paid ? <CheckCircle2 size={18} /> : <X size={18} />}
                  </button>
                </div>
                
                <div className="col-span-2 flex justify-center">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color}`}>
                    <StatusIcon size={12} />
                    {statusConfig.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {loadingOrders ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#C75B48]" />
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500">Nenhum pedido encontrado</p>
          </div>
        ) : null}
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            notes={orderNotes[selectedOrder.id] || ''}
            onNotesChange={(notes) => setOrderNotes(prev => ({ ...prev, [selectedOrder.id]: notes }))}
            onTogglePaid={() => onTogglePaid(selectedOrder)}
            onClose={() => setSelectedOrder(null)}
            onCopy={() => handleCopyOrder(selectedOrder)}
            products={products}
            onStatusChange={onStatusChange}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OrderDetailsModal({ 
  order, 
  notes, 
  onNotesChange, 
  onTogglePaid,
  onClose,
  onCopy,
  products,
  onStatusChange,
}: { 
  order: Order; 
  notes: string;
  onNotesChange: (notes: string) => void;
  onTogglePaid: () => void;
  onClose: () => void;
  onCopy: () => void;
  products: Product[];
  onStatusChange: (orderId: string, status: Order['status']) => Promise<void>;
}) {
  const [status, setStatus] = useState(order.status);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedNextStatus, setSelectedNextStatus] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(order.paid);

  const handleTogglePaid = async () => {
    setIsPaid(!isPaid);
    await onTogglePaid();
  };

  const statusFlow: Record<string, string[]> = {
    novo: ['producao', 'saiu', 'entregue'],
    producao: ['saiu', 'entregue'],
    saiu: ['entregue'],
    entregue: []
  };

  const handleStatusSelect = async (newStatus: string) => {
    setStatus(newStatus as Order['status']);
    await onStatusChange(order.id, newStatus as Order['status']);
    setSelectedNextStatus(null);
    setShowStatusDropdown(false);
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Pedido #{order.id.slice(0, 8).toUpperCase()}</h3>
            <p className="text-sm text-gray-500">{toDate(order.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800">Cliente</h4>
              <button
                onClick={onCopy}
                className="text-xs text-[#C75B48] hover:underline flex items-center gap-1"
              >
                <Download size={12} /> Copiar pedido
              </button>
            </div>
            <p className="font-medium text-gray-800">{order.customerName}</p>
            <p className="text-sm text-gray-600 mt-1">{order.customerAddress}</p>
            {order.customerObs && (
              <p className="text-sm text-gray-500 mt-2 italic">"{order.customerObs}"</p>
            )}
          </div>

          {/* Items */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Itens do Pedido</h4>
            <div className="space-y-2">
              {order.items.map((item: any, i: number) => {
                if (item.comboId) {
                  return (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 bg-[#FFF8F5] rounded-lg px-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 bg-[#E8A849] text-white rounded text-xs font-bold">COMBO</span>
                          <p className="text-gray-800 font-medium">{item.quantity}x {item.comboName || 'Combo'}</p>
                        </div>
                        {item.comboItems?.map((ci: any, ciIdx: number) => (
                          <p key={ciIdx} className="text-xs text-gray-500 ml-4">
                            {ci.quantity}x {getProductName(ci.productId)}
                          </p>
                        ))}
                        <p className="text-xs text-[#C75B48] mt-1 font-medium">
                          R$ {((item.comboPrice || 0) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                }
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-gray-800">{item.quantity}x {getProductName(item.productId)}</p>
                      <p className="text-xs text-gray-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * (product?.price || 0))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-gray-200">
              <span className="font-bold text-gray-800">Total</span>
              <span className="text-xl font-bold text-[#C75B48]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div>
              <h4 className="font-semibold text-gray-800">Pagamento</h4>
              <p className="text-sm text-gray-500">{isPaid ? 'Recebido' : 'Pendente'}</p>
            </div>
            <button
              onClick={handleTogglePaid}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                isPaid
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              {isPaid ? '✅ Recebido' : 'Marcar como Pago'}
            </button>
          </div>

          {/* Status */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Status do Pedido</h4>
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`w-full p-4 rounded-2xl font-medium flex items-center justify-between transition-colors ${
                  status === 'novo' ? 'bg-blue-100 text-blue-700' :
                  status === 'producao' ? 'bg-amber-100 text-amber-700' :
                  status === 'saiu' ? 'bg-purple-100 text-purple-700' :
                  'bg-green-100 text-green-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  {React.createElement(STATUS_CONFIG[status].icon, { size: 20 })}
                  {STATUS_CONFIG[status].label}
                </span>
                <ChevronDown size={20} className={showStatusDropdown ? 'rotate-180' : ''} />
              </button>
              
              {showStatusDropdown && statusFlow[status].length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-10">
                  {statusFlow[status].map((nextStatus) => (
                    <button
                      key={nextStatus}
                      onClick={() => handleStatusSelect(nextStatus)}
                      className={`w-full p-3 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                        STATUS_CONFIG[nextStatus].bg
                      } ${STATUS_CONFIG[nextStatus].color}`}
                    >
                      {React.createElement(STATUS_CONFIG[nextStatus].icon, { size: 18 })}
                      {STATUS_CONFIG[nextStatus].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Anotações Internas</h4>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Adicione notas sobre este pedido..."
              rows={3}
              className="w-full p-4 border border-gray-200 rounded-2xl resize-none focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Estas notas são apenas para você</p>
          </div>

          {/* WhatsApp Button */}
          {order.customerPhone ? (
            <a
              href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Referente ao pedido #${order.id.slice(0, 8).toUpperCase()}`)}`}
              target="_blank"
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={20} />
              Enviar mensagem no WhatsApp
            </a>
          ) : (
            <button
              disabled
              className="w-full py-4 bg-gray-200 text-gray-500 rounded-2xl font-medium flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <MessageCircle size={20} />
              Telefone não informado
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ProductsContent({ 
  products, 
  loadingProducts, 
  onEdit, 
  onDelete, 
  onToggleActive,
  onAddNew 
}: { 
  products: Product[];
  loadingProducts: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleActive: (product: Product) => void;
  onAddNew: () => void;
}) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Catálogo de Produtos</h3>
          <button 
            onClick={onAddNew}
            className="flex items-center gap-2 bg-[#C75B48] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#A84838] transition-colors"
          >
            <Plus size={18} /> Novo Produto
          </button>
        </div>

        {loadingProducts ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-[#C75B48]" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={64} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500">Nenhum produto cadastrado</p>
            <button onClick={onAddNew} className="mt-4 text-[#C75B48] hover:underline">
              Cadastrar primeiro produto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preço</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FFF8F5] rounded-lg flex items-center justify-center overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={20} className="text-[#C75B48]" />
                          )}
                        </div>
                        <span className="font-medium text-gray-800">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.category === 'tradicional' 
                          ? 'bg-[#C75B48]/10 text-[#C75B48]' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {product.category === 'tradicional' ? 'Tradicional' : 'Fit'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {product.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onToggleActive(product)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          product.active 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {product.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => onEdit(product)}
                          className="p-2 text-gray-400 hover:text-[#C75B48] hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => onDelete(product.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CustomersContent({
  customers,
  loadingCustomers,
  subTab,
  onSubTabChange
}: {
  customers: Customer[];
  loadingCustomers: boolean;
  subTab: 'list' | 'loyalty';
  onSubTabChange: (tab: 'list' | 'loyalty') => void;
}) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (date: Date | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onSubTabChange('list')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  subTab === 'list'
                    ? 'bg-[#C75B48] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Lista de Clientes
              </button>
              <button
                onClick={() => onSubTabChange('loyalty')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  subTab === 'loyalty'
                    ? 'bg-[#C75B48] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Programa de Fidelidade
              </button>
            </div>
            {subTab === 'list' && (
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-64 focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
              <p className="text-sm text-blue-600">Total de Clientes</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(customers.reduce((acc, c) => acc + c.totalSpent, 0))}</p>
              <p className="text-sm text-green-600">Receita Total</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-purple-600">
                {customers.length > 0 ? Math.round(customers.reduce((acc, c) => acc + c.orderCount, 0) / customers.length) : 0}
              </p>
              <p className="text-sm text-purple-600">Média de Pedidos</p>
            </div>
          </div>
        </div>

        {subTab === 'list' && (
          <div className="overflow-x-auto">
            {loadingCustomers ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={48} className="animate-spin text-[#C75B48]" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-20">
                <Users size={64} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-500">Nenhum cliente cadastrado ainda</p>
                <p className="text-xs text-gray-400 mt-1">Clientes aparecem quando fazem login ou pedido</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Pedidos</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Total Gasto</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Último Pedido</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Pontos</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map(customer => {
                    const tier = getLoyaltyStats([]); // just for reference
                    const thresholds = getRescueThresholds();
                    const currentTier = thresholds.find(t => customer.loyaltyPoints >= t.min) || thresholds[thresholds.length - 1];
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {customer.photo ? (
                              <img src={customer.photo} alt="" className="w-10 h-10 rounded-full" />
                            ) : (
                              <div className="w-10 h-10 bg-[#C75B48] rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-800">{customer.name || '—'}</p>
                              <p className="text-sm text-gray-500">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{customer.orderCount}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{formatCurrency(customer.totalSpent)}</td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(customer.lastOrderAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${currentTier.color} ${currentTier.bg}`}>
                              {currentTier.label}
                            </span>
                            <span className="text-sm font-bold text-[#E8A849]">{customer.loyaltyPoints}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-gray-400 hover:text-[#C75B48] hover:bg-gray-100 rounded-lg transition-colors">
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {subTab === 'loyalty' && (
          <LoyaltyContent customers={customers} />
        )}
      </div>
    </motion.div>
  );
}

function RatingsContent({ ratings, loadingRatings, products, onDelete }: {
  ratings: import('./types').Rating[];
  loadingRatings: boolean;
  products: Product[];
  onDelete: (ratingId: string) => Promise<void>;
}) {
  const formatDate = (date: FirebaseTimestamp | Date | undefined) => {
    if (!date) return '';
    const d = toDate(date);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  const allRatings = ratings;
  const avgRating = allRatings.length > 0
    ? (allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length).toFixed(1)
    : '0.0';

  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: allRatings.filter(r => r.score === stars).length,
    percent: allRatings.length > 0 ? Math.round((allRatings.filter(r => r.score === stars).length / allRatings.length) * 100) : 0,
  }));

  const thisMonth = allRatings.filter(r => {
    const d = toDate(r.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star size={32} fill="#E8A849" className="text-[#E8A849]" />
          </div>
          <p className="text-4xl font-bold text-gray-800 mb-1">{avgRating}</p>
          <p className="text-gray-500">Avaliação Média</p>
          <div className="flex justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={18} fill={i <= Math.round(Number(avgRating)) ? "#E8A849" : "none"} className={i <= Math.round(Number(avgRating)) ? "text-[#E8A849]" : "text-gray-300"} />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-4">Distribuição</h4>
          <div className="space-y-3">
            {distribution.map(({ stars, count, percent }) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-8">{stars} ★</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{percent}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-4">Estatísticas</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total de Avaliações</span>
              <span className="font-semibold text-gray-800">{allRatings.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Este Mês</span>
              <span className="font-semibold text-gray-800">{thisMonth}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Respostas</span>
              <span className="font-semibold text-gray-800">0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Avaliações Recentes</h4>
        {loadingRatings ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-[#C75B48]" />
          </div>
        ) : allRatings.length === 0 ? (
          <div className="text-center py-12">
            <Star size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500">Nenhuma avaliação ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allRatings.map(rating => (
              <div key={rating.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#C75B48] rounded-full flex items-center justify-center text-white font-medium">
                      {rating.userName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{rating.userName || 'Anônimo'}</p>
                      <p className="text-sm text-gray-500">{getProductName(rating.productId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          size={14}
                          fill={i <= rating.score ? "#E8A849" : "none"}
                          className={i <= rating.score ? "text-[#E8A849]" : "text-gray-300"}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => onDelete(rating.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {rating.comment && <p className="text-gray-600 mb-2">{rating.comment}</p>}
                <p className="text-xs text-gray-400">{formatDate(rating.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ReportsContent({ orders, products }: { orders: Order[]; products: Product[] }) {
  const [period, setPeriod] = useState<'month' | 'lastMonth' | '3months'>('month');

  const { start, end } = React.useMemo(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'lastMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    } else if (period === '3months') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }
    return { start, end: now };
  }, [period]);

  const filteredOrders = orders.filter(o => {
    const d = toDate(o.createdAt);
    return o.paid && d >= start && d <= end;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const delivered = filteredOrders.filter(o => o.status === 'entregue').length;
  const inProgress = filteredOrders.filter(o => o.status !== 'entregue').length;

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyRevenue = monthNames.map((month, idx) => {
    const monthOrders = orders.filter(o => {
      const d = toDate(o.createdAt);
      return o.paid && d.getMonth() === idx && d.getFullYear() === new Date().getFullYear();
    });
    return monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  });
  const maxRevenue = Math.max(...monthlyRevenue, 1);

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || '';
  };

  const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
  orders.forEach(order => {
    order.items?.forEach((item: any) => {
      if (item.comboId) {
        if (!productSales[item.comboId]) {
          productSales[item.comboId] = { name: 'Combos', count: 0, revenue: 0 };
        }
        productSales[item.comboId].count += item.quantity;
        productSales[item.comboId].revenue += (item.comboPrice || 0) * item.quantity;
      } else {
        const name = getProductName(item.productId);
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name, count: 0, revenue: 0 };
        }
        productSales[item.productId].count += item.quantity;
        productSales[item.productId].revenue += (products.find(p => p.id === item.productId)?.price || 0) * item.quantity;
      }
    });
  });
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const totalProductRevenue = topProducts.reduce((sum, [, v]) => sum + v.revenue, 0);

  const handleExportCSV = () => {
    const headers = ['Data', 'Cliente', 'Endereço', 'Itens', 'Total', 'Status'];
    const rows = filteredOrders.map(o => [
      toDate(o.createdAt).toLocaleString('pt-BR'),
      o.customerName,
      o.customerAddress,
      o.items?.map((i: any) => `${i.quantity}x ${i.productId}`).join('; ') || '',
      o.total?.toFixed(2) || '0.00',
      o.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">Receita por Mês</h3>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as typeof period)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="month">Este Mês</option>
              <option value="lastMonth">Mês Passado</option>
              <option value="3months">Últimos 3 Meses</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-around gap-4">
            {monthlyRevenue.map((rev, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className="w-full max-w-[40px] bg-gradient-to-t from-[#C75B48] to-[#E8A849] rounded-t-lg transition-all"
                  style={{ height: `${Math.max((rev / maxRevenue) * 180, rev > 0 ? 10 : 0)}px` }}
                />
                <span className="text-xs text-gray-500">{monthNames[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">Produtos Mais Vendidos</h3>
            <button onClick={handleExportCSV} className="text-sm text-[#C75B48] flex items-center gap-1 hover:underline">
              <Download size={16} /> Exportar CSV
            </button>
          </div>
          {topProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingBag size={40} className="mx-auto mb-2" />
              <p className="text-sm">Sem dados de vendas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map(([id, data], idx) => (
                <div key={id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">#{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-800 font-medium truncate">{data.name}</span>
                      <span className="text-[#C75B48] font-bold">{data.count}x</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#C75B48] to-[#E8A849] rounded-full"
                        style={{ width: `${totalProductRevenue > 0 ? (data.revenue / totalProductRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">Resumo do Período</h3>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-[#C75B48] text-white rounded-lg text-sm font-medium hover:bg-[#A84838] transition-colors"
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Pedidos</p>
              <p className="text-2xl font-bold text-gray-800">{totalOrders}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Receita</p>
              <p className="text-2xl font-bold text-[#C75B48]">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(avgOrder)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Em Andamento</p>
              <p className="text-2xl font-bold text-amber-600">{inProgress}</p>
            </div>
          </div>

          {filteredOrders.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium">Itens</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 10).map(o => (
                    <tr key={o.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-600">{toDate(o.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="py-2 text-gray-800 font-medium">{o.customerName}</td>
                      <td className="py-2 text-gray-600">{o.items?.reduce((acc: number, i: any) => acc + i.quantity, 0) || 0} itens</td>
                      <td className="py-2 text-right font-bold text-[#C75B48]">{formatCurrency(o.total || 0)}</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[o.status]?.bg} ${STATUS_CONFIG[o.status]?.color}`}>
                          {STATUS_CONFIG[o.status]?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length > 10 && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  Mostrando 10 de {filteredOrders.length} pedidos
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SettingsContent() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-6">Informações da Loja</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Loja</label>
                <input 
                  type="text"
                  defaultValue="Campanini Sabores"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                <input 
                  type="text"
                  defaultValue="+55 11 99193-8761"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Funcionamento</label>
                <input 
                  type="text"
                  defaultValue="Seg - Sáb: 8h às 18h"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-6">Administradores</h3>
            <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
              <p className="text-sm text-blue-700">
                <strong>Gerencie administradores pelo Firebase Console.</strong><br />
                Adicione documentos em <code className="bg-blue-100 px-1 rounded">Firestore → coleções → admins</code> com o campo <code className="bg-blue-100 px-1 rounded">isAdmin: true</code> e o document ID sendo o UID do usuário.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Users size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Faça login com Google como admin para acessar</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-6">Programas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Leaf size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Programa de Fidelidade</p>
                    <p className="text-xs text-gray-500">A cada 10 pedidos</p>
                  </div>
                </div>
                <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bell size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Notificações</p>
                    <p className="text-xs text-gray-500">Alertas de novos pedidos</p>
                  </div>
                </div>
                <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-6">Integrações</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <MessageCircle size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">WhatsApp</p>
                    <p className="text-xs text-green-600">Conectado</p>
                  </div>
                </div>
                <button className="text-sm text-[#C75B48]">Gerenciar</button>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
            <h3 className="font-semibold text-red-700 mb-4">Zona de Perigo</h3>
            <p className="text-sm text-red-600 mb-4">Estas ações são irreversíveis.</p>
            <button className="w-full py-2 px-4 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
              Exportar Todos os Dados
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProductModal({ 
  product, 
  onSave, 
  onClose,
  uploading
}: { 
  product: Product | null;
  onSave: (data: Omit<Product, 'id' | 'createdAt'>, image?: File) => void;
  onClose: () => void;
  uploading: boolean;
}) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price?.toString() || '30');
  const [category, setCategory] = useState<'tradicional' | 'fit'>(product?.category || 'tradicional');
  const [tags, setTags] = useState<string[]>(product?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [image, setImage] = useState<string | undefined>(product?.image);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !description.trim()) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const priceValue = parseFloat(price.replace(',', '.'));
    if (isNaN(priceValue) || priceValue <= 0) {
      alert('Digite um preço válido.');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      price: priceValue,
      category,
      tags,
      active: product?.active ?? true,
      image
    }, imageFile || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            {product ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto do Produto</label>
            <div 
              className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-[#C75B48] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <div className="relative inline-block">
                  <img src={image} alt="" className="w-32 h-32 object-cover rounded-xl mx-auto" />
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(undefined);
                      setImageFile(null);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="text-gray-400">
                  <ImageIcon size={48} className="mx-auto mb-2" />
                  <p className="text-sm">Clique para adicionar foto</p>
                </div>
              )}
            </div>
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Esfiha de Carne Clássica"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o produto..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$) *</label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="30.00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'tradicional' | 'fit')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all bg-white"
              >
                <option value="tradicional">Linha Tradicional</option>
                <option value="fit">Linha Fit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, i) => (
                <span 
                  key={i}
                  className="px-3 py-1 bg-[#FFF8F5] text-[#C75B48] rounded-full text-sm flex items-center gap-1"
                >
                  {tag}
                  <button 
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Adicionar tag (ex: Clássica, Leve)"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Sugestões: Clássica, Leve, Fit, Popular, Premium</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 py-3 px-4 bg-[#C75B48] text-white rounded-xl font-medium hover:bg-[#A84838] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check size={18} />
                  {product ? 'Salvar Alterações' : 'Cadastrar'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function CouponModal({
  coupon,
  onSave,
  onClose
}: {
  coupon: Coupon | null;
  onSave: (data: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrderValue?: number;
    maxDiscount?: number;
    expiresAt: Date;
    maxUses: number | null;
    perCustomerLimit: number;
  }) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState(coupon?.code || '');
  const [type, setType] = useState<'percentage' | 'fixed'>(coupon?.type || 'percentage');
  const [value, setValue] = useState(coupon?.value?.toString() || '');
  const [minOrderValue, setMinOrderValue] = useState(coupon?.minOrderValue?.toString() || '');
  const [maxDiscount, setMaxDiscount] = useState(coupon?.maxDiscount?.toString() || '');
  const [expiresAt, setExpiresAt] = useState(
    coupon?.expiresAt
      ? new Date(coupon.expiresAt).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [maxUses, setMaxUses] = useState(coupon?.maxUses?.toString() || '');
  const [perCustomerLimit, setPerCustomerLimit] = useState(coupon?.perCustomerLimit?.toString() || '1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { alert('Digite o código do cupom.'); return; }
    if (!value || parseFloat(value) <= 0) { alert('Digite o valor do desconto.'); return; }
    if (!expiresAt) { alert('Defina a data de validade.'); return; }

    setLoading(true);
    try {
      await onSave({
        code: code.trim(),
        type,
        value: parseFloat(value),
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : undefined,
        maxDiscount: type === 'percentage' && maxDiscount ? parseFloat(maxDiscount) : undefined,
        expiresAt: new Date(expiresAt),
        maxUses: maxUses ? parseInt(maxUses) : null,
        perCustomerLimit: parseInt(perCustomerLimit) || 1,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {coupon ? 'Editar Cupom' : 'Novo Cupom'}
            </h3>
            <p className="text-sm text-gray-500">{coupon ? coupon.code : 'Crie um novo cupom de desconto'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Código do cupom *</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              disabled={!!coupon}
              placeholder="Ex: PRIMEIRA10"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono uppercase focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de desconto</label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setType('percentage')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${type === 'percentage' ? 'bg-[#C75B48] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setType('fixed')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${type === 'fixed' ? 'bg-[#C75B48] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  R$ Fixo
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Valor {type === 'percentage' ? '(%)' : '(R$)'}</label>
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                min="0"
                step={type === 'percentage' ? '1' : '0.01'}
                placeholder={type === 'percentage' ? '10' : '5,00'}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all"
              />
            </div>
          </div>

          {type === 'percentage' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Desconto máximo (R$) — opcional</label>
              <input
                type="number"
                value={maxDiscount}
                onChange={e => setMaxDiscount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Ex: 20,00"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">Limita o valor máximo de desconto quando usa %</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Pedido mínimo (R$) — opcional</label>
            <input
              type="number"
              value={minOrderValue}
              onChange={e => setMinOrderValue(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Ex: 50,00"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Limite de usos</label>
              <select
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all bg-white"
              >
                <option value="">Ilimitado</option>
                <option value="10">10 usos</option>
                <option value="25">25 usos</option>
                <option value="50">50 usos</option>
                <option value="100">100 usos</option>
                <option value="500">500 usos</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Por cliente</label>
              <select
                value={perCustomerLimit}
                onChange={e => setPerCustomerLimit(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all bg-white"
              >
                <option value="1">1x por cliente</option>
                <option value="2">2x por cliente</option>
                <option value="3">3x por cliente</option>
                <option value="5">5x por cliente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Validade até</label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#C75B48]/20 focus:border-[#C75B48] outline-none transition-all"
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Resumo:</p>
            <p className="text-sm text-gray-700">
              {type === 'percentage' ? `${value}% OFF` : `R$ ${value} de desconto`}
              {maxDiscount && type === 'percentage' && ` (máx R$ ${maxDiscount})`}
              {' '}— válido até {new Date(expiresAt).toLocaleDateString('pt-BR')}
              {maxUses ? ` — ${maxUses} usos` : ' — usos ilimitados'}
              {minOrderValue && ` — pedido mín. R$ ${minOrderValue}`}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#C75B48] text-white rounded-xl font-medium hover:bg-[#A84838] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {coupon ? 'Salvar Alterações' : 'Criar Cupom'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function CouponsContent({
  coupons,
  loadingCoupons,
  onAddNew,
  onEdit,
  onToggleActive,
  onViewReport
}: {
  coupons: Coupon[];
  loadingCoupons: boolean;
  onAddNew: () => void;
  onEdit: (coupon: Coupon) => void;
  onToggleActive: (coupon: Coupon) => void;
  onViewReport: (coupon: Coupon) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const filtered = coupons.filter(c => {
    if (filter === 'active') return c.active;
    if (filter === 'inactive') return !c.active;
    return true;
  });

  const activeCoupons = coupons.filter(c => c.active);
  const totalUsed = coupons.reduce((acc, c) => acc + c.usedCount, 0);
  const expiringSoon = coupons.filter(c => {
    const daysLeft = (new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return c.active && daysLeft > 0 && daysLeft <= 7;
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Cupons Ativos</p>
          <p className="text-2xl font-bold text-[#C75B48]">{activeCoupons.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total de Usos</p>
          <p className="text-2xl font-bold text-gray-800">{totalUsed}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Expiram em 7 dias</p>
          <p className="text-2xl font-bold text-amber-600">{expiringSoon.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Cupons Criados</p>
          <p className="text-2xl font-bold text-gray-800">{coupons.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">{filtered.length} cupons</span>
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f ? 'bg-[#C75B48] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#C75B48] text-white text-xs font-medium rounded-lg hover:bg-[#A84838] transition-colors"
            >
              <Plus size={14} />
              Novo Cupom
            </button>
          </div>
        </div>

        {loadingCoupons ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-[#C75B48]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Ticket size={64} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500">Nenhum cupom {filter === 'active' ? 'ativo' : filter === 'inactive' ? 'inativo' : ''}</p>
            <button onClick={onAddNew} className="mt-4 text-[#C75B48] hover:underline font-medium">
              Criar primeiro cupom
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(coupon => {
              const daysLeft = (new Date(coupon.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
              const isExpired = daysLeft < 0;
              const isExpiringSoon = !isExpired && daysLeft <= 7;

              return (
                <div key={coupon.id} className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-gray-800 text-sm bg-gray-100 px-2 py-0.5 rounded">
                        {coupon.code}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        !coupon.active ? 'bg-gray-100 text-gray-500' :
                        isExpired ? 'bg-red-100 text-red-600' :
                        isExpiringSoon ? 'bg-amber-100 text-amber-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {!coupon.active ? 'Inativo' : isExpired ? 'Expirado' : isExpiringSoon ? `Expira em ${Math.ceil(daysLeft)}d` : 'Ativo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `${formatCurrency(coupon.value)} OFF`}
                      {coupon.minOrderValue && ` • mín. ${formatCurrency(coupon.minOrderValue)}`}
                      {coupon.maxDiscount && coupon.type === 'percentage' && ` • máx ${formatCurrency(coupon.maxDiscount)}`}
                    </p>
                  </div>

                  <div className="text-center px-4">
                    <p className="text-lg font-bold text-gray-800">{coupon.usedCount}</p>
                    <p className="text-xs text-gray-400">{coupon.maxUses || '∞'} usos</p>
                  </div>

                  <div className="text-right text-xs text-gray-400 min-w-[80px]">
                    <p>Validade</p>
                    <p className="font-medium text-gray-600">
                      {isExpired ? 'Expirado' : new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewReport(coupon)}
                      className="p-2 text-gray-400 hover:text-[#C75B48] hover:bg-gray-100 rounded-lg transition-colors"
                      title="Ver relatório"
                    >
                      <BarChart3 size={16} />
                    </button>
                    <button
                      onClick={() => onToggleActive(coupon)}
                      className={`p-2 rounded-lg transition-colors ${
                        coupon.active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={coupon.active ? 'Desativar' : 'Ativar'}
                    >
                      {coupon.active ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    </button>
                    <button
                      onClick={() => onEdit(coupon)}
                      className="p-2 text-gray-400 hover:text-[#C75B48] hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoyaltyContent({ customers }: { customers: Customer[] }) {
  const stats = getLoyaltyStats(customers);
  const thresholds = getRescueThresholds();
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const enrichedCustomers = customers
    .map(c => enrichCustomerWithLoyalty(c))
    .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
    .slice(0, 20);

  const tiers = [
    { label: 'Ouro', min: 500, color: 'from-yellow-400 to-yellow-600', textColor: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200' },
    { label: 'Prata', min: 200, color: 'from-gray-300 to-gray-500', textColor: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' },
    { label: 'Bronze', min: 100, color: 'from-amber-600 to-amber-800', textColor: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  ];

  const nearReward = [...thresholds].reverse().find(t => {
    const pct = (customers.filter(c => {
      const nextTier = thresholds.find(th => c.loyaltyPoints >= th.min);
      return nextTier && nextTier.nextMin && c.loyaltyPoints < nextTier.nextMin && nextTier.nextMin - c.loyaltyPoints <= 30;
    }).length);
    return true;
  });

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#FFF8F5] to-[#FFF3E0] rounded-2xl p-5 border border-[#E8A849]/20">
          <p className="text-sm text-[#8C7066] mb-1">Pontos em Circulação</p>
          <p className="text-2xl font-bold text-[#E8A849]">{stats.totalPointsActive.toLocaleString()}</p>
          <p className="text-xs text-[#8C7066] mt-1">{stats.customersWithPoints} clientes com pontos</p>
        </div>
        <div className="bg-gradient-to-br from-[#F1F8E9] to-[#E8F5E9] rounded-2xl p-5 border border-[#C8E6C9]">
          <p className="text-sm text-[#5D8A3E] mb-1">Pontos Resgatados</p>
          <p className="text-2xl font-bold text-[#7BA05B]">
            {(stats.totalPointsIssued - stats.totalPointsActive).toLocaleString()}
          </p>
          <p className="text-xs text-[#5D8A3E] mt-1">
            {stats.totalPointsIssued > 0
              ? `${Math.round(((stats.totalPointsIssued - stats.totalPointsActive) / stats.totalPointsIssued) * 100)}% resgatado`
              : '0% resgatado'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
          <p className="text-sm text-blue-600 mb-1">Clientes Ativos</p>
          <p className="text-2xl font-bold text-blue-600">{stats.customersWithPoints}</p>
          <p className="text-xs text-blue-500 mt-1">com pontos acumulados</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
          <p className="text-sm text-purple-600 mb-1">Total de Pedidos</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalOrders}</p>
          <p className="text-xs text-purple-500 mt-1">média {stats.avgOrdersPerCustomer} por cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <h4 className="font-semibold text-gray-800 mb-4">🏆 Top Clientes — Programa de Fidelidade</h4>
          {enrichedCustomers.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <Star size={48} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500">Nenhum cliente com pontos ainda</p>
              <p className="text-xs text-gray-400 mt-1">Pontos são acumulados quando clientes fazem pedidos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrichedCustomers.map((customer, index) => {
                const tier = tiers.find(t => customer.loyaltyPoints >= t.min) || tiers[tiers.length - 1];
                const nextTier = thresholds.find(t => customer.loyaltyPoints < t.min);
                return (
                  <div key={customer.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-300 w-8 text-center">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#FFF8F5] flex items-center justify-center text-[#C75B48] font-bold text-sm">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-800 truncate">{customer.name || 'Cliente'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tier.bg} ${tier.color}`}>
                          {tier.label}
                        </span>
                  </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{customer.orderCount} pedidos</span>
                      <span>{formatCurrency(customer.totalSpent)} gastos</span>
                      {nextTier && (
                        <span className="text-[#C75B48]">+{customer.pointsToNextTier} pts para {nextTier.label}</span>
                      )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#E8A849]">{customer.loyaltyPoints}</p>
                      <p className="text-xs text-gray-400">pontos</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-gray-800 mb-4">📊 Distribuição por Nível</h4>
          <div className="space-y-4">
            {[
              { label: 'Ouro', min: 500, count: stats.tierCounts.ouro, color: 'from-yellow-400 to-yellow-600', pct: stats.totalCustomers > 0 ? Math.round((stats.tierCounts.ouro / stats.totalCustomers) * 100) : 0 },
              { label: 'Prata', min: 200, count: stats.tierCounts.prata, color: 'from-gray-300 to-gray-400', pct: stats.totalCustomers > 0 ? Math.round((stats.tierCounts.prata / stats.totalCustomers) * 100) : 0 },
              { label: 'Bronze', min: 100, count: stats.tierCounts.bronze, color: 'from-amber-600 to-amber-700', pct: stats.totalCustomers > 0 ? Math.round((stats.tierCounts.bronze / stats.totalCustomers) * 100) : 0 },
            ].map(tier => (
              <div key={tier.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700">{tier.label} ({tier.count})</span>
                  <span className="text-sm font-bold text-gray-500">{tier.pct}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${tier.color} rounded-full transition-all duration-500`}
                    style={{ width: `${tier.pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{tier.min}+ pontos</p>
              </div>
            ))}
          </div>

          <h4 className="font-semibold text-gray-800 mb-4 mt-6">🎯 Clientes Próximos ao Prêmio</h4>
          <div className="space-y-2">
            {thresholds.filter(t => t.nextMin).map(tier => {
              const nearCustomers = customers.filter(c => {
                return c.loyaltyPoints >= (tier.nextMin || 0) - 30 && c.loyaltyPoints < tier.nextMin!;
              });
              if (nearCustomers.length === 0) return null;
              return (
                <div key={tier.label} className="bg-[#FFF8F5] border border-[#E8A849]/20 rounded-xl p-3">
                  <p className="text-sm font-medium text-[#3D2A24]">
                    {nearCustomers.length} cliente{nearCustomers.length > 1 ? 's' : ''} faltando até {tier.label}
                  </p>
                  <div className="mt-1 space-y-1">
                    {nearCustomers.slice(0, 3).map(c => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate">{c.name || c.email}</span>
                        <span className="text-[#C75B48] font-bold flex-shrink-0 ml-2">
                          {c.loyaltyPoints} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#FFF8F5] to-[#FFF3E0] rounded-2xl p-6 border border-[#E8A849]/20">
        <h4 className="font-semibold text-gray-800 mb-4">💡 Como Funciona o Programa de Fidelidade</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {thresholds.map(tier => (
            <div key={tier.label} className={`rounded-xl p-4 ${tier.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold text-gray-800">{tier.min} pontos</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tier.color} bg-white/80`}>{tier.label}</span>
              </div>
              <p className="text-sm text-gray-600">
                Desconto de <strong className="text-gray-800">{tier.discount}% OFF</strong> em qualquer pedido
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Cliente resgata manualmente no perfil e usa o cupom no checkout
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          1 real gasto = 1 ponto. Pontos somados automaticamente ao finalizar pedido.
        </p>
      </div>
    </div>
  );
}

function PromoModal({
  promotion,
  products,
  onSave,
  onClose,
}: {
  promotion: Promotion | null;
  products: Product[];
  onSave: (data: Parameters<typeof createPromotion>[0]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(promotion?.name || '');
  const [description, setDescription] = useState(promotion?.description || '');
  const [type, setType] = useState<'combo' | 'discount'>(promotion?.type || 'combo');
  const [comboItems, setComboItems] = useState<{ productId: string; quantity: number }[]>(
    promotion?.items || []
  );
  const [comboPrice, setComboPrice] = useState(promotion?.comboPrice?.toString() || '');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    promotion?.discountType || 'percentage'
  );
  const [discountValue, setDiscountValue] = useState(promotion?.discountValue?.toString() || '');
  const [applicableProducts, setApplicableProducts] = useState<string[]>(
    promotion?.applicableProducts || []
  );
  const [maxOrders, setMaxOrders] = useState(promotion?.maxOrders?.toString() || '');
  const [expiresAt, setExpiresAt] = useState('');

  const addComboItem = () => {
    if (products.length === 0) return;
    setComboItems(prev => [...prev, { productId: products[0].id, quantity: 1 }]);
  };

  const updateComboItem = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    setComboItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: field === 'quantity' ? Number(value) : value };
    }));
  };

  const removeComboItem = (index: number) => {
    setComboItems(prev => prev.filter((_, i) => i !== index));
  };

  const toggleApplicableProduct = (productId: string) => {
    setApplicableProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const getOriginalPrice = () => {
    return comboItems.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Digite um nome para a promoção.');
      return;
    }
    if (type === 'combo') {
      if (comboItems.length === 0) {
        alert('Adicione pelo menos um item ao combo.');
        return;
      }
      if (!comboPrice || Number(comboPrice) <= 0) {
        alert('Digite um preço válido para o combo.');
        return;
      }
    }
    if (type === 'discount') {
      if (applicableProducts.length === 0) {
        alert('Selecione pelo menos um produto para o desconto.');
        return;
      }
      if (!discountValue || Number(discountValue) <= 0) {
        alert('Digite um valor de desconto válido.');
        return;
      }
    }

    const data: Parameters<typeof createPromotion>[0] = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxOrders: maxOrders ? Number(maxOrders) : undefined,
    };

    if (type === 'combo') {
      data.items = comboItems;
      data.comboPrice = Number(comboPrice);
    } else {
      data.discountType = discountType;
      data.discountValue = Number(discountValue);
      data.applicableProducts = applicableProducts;
    }

    onSave(data);
  };

  const originalPrice = getOriginalPrice();
  const savings = comboPrice ? originalPrice - Number(comboPrice) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {promotion ? 'Editar Promoção' : 'Nova Promoção'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome da promoção *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Combo Família, Super Desconto"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Descrição (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Leve 3, pague 2 em esfihas tradicionais"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de promoção *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setType('combo')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                    type === 'combo'
                      ? 'border-[#C75B48] bg-[#FFF8F5] text-[#C75B48]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Combo (kit de produtos)
                </button>
                <button
                  type="button"
                  onClick={() => setType('discount')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                    type === 'discount'
                      ? 'border-[#C75B48] bg-[#FFF8F5] text-[#C75B48]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Desconto (em produtos)
                </button>
              </div>
            </div>

            {type === 'combo' && (
              <>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Itens do combo *</label>
                    <button
                      type="button"
                      onClick={addComboItem}
                      className="text-sm text-[#C75B48] hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Adicionar item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {comboItems.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">
                        Nenhum item. Clique em "Adicionar item" para começar.
                      </p>
                    )}
                    {comboItems.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                          <select
                            value={item.productId}
                            onChange={e => updateComboItem(index, 'productId', e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateComboItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                              className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateComboItem(index, 'quantity', item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeComboItem(index)}
                            className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Preço do combo *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={comboPrice}
                      onChange={e => setComboPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Validade</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none"
                  />
                </div>

                {comboItems.length > 0 && (
                  <div className="col-span-2 bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Preço original:</span>
                      <span className="text-gray-800 font-medium">R$ {originalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-600">Preço do combo:</span>
                      <span className="text-green-600 font-bold">R$ {Number(comboPrice || 0).toFixed(2)}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-600">Economia:</span>
                        <span className="text-green-600 font-bold">-R$ {savings.toFixed(2)} ({Math.round((savings / originalPrice) * 100)}% OFF)</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {type === 'discount' && (
              <>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Produtos aplicáveis *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {products.filter(p => p.active).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleApplicableProduct(p.id)}
                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                          applicableProducts.includes(p.id)
                            ? 'border-[#C75B48] bg-[#FFF8F5] text-[#C75B48]'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de desconto</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium ${
                        discountType === 'percentage'
                          ? 'border-[#C75B48] bg-[#FFF8F5] text-[#C75B48]'
                          : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      Percentual (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium ${
                        discountType === 'fixed'
                          ? 'border-[#C75B48] bg-[#FFF8F5] text-[#C75B48]'
                          : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      Valor fixo (R$)
                    </button>
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Valor do desconto</label>
                  <div className="relative">
                    {discountType === 'percentage' && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    )}
                    {discountType === 'fixed' && (
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                    )}
                    <input
                      type="number"
                      step={discountType === 'percentage' ? '1' : '0.01'}
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'percentage' ? '10' : '5.00'}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none ${discountType === 'fixed' ? 'pl-12' : 'pr-10'}`}
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Validade</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Limite de pedidos (opcional)</label>
                  <input
                    type="number"
                    value={maxOrders}
                    onChange={e => setMaxOrders(e.target.value)}
                    placeholder="Ilimitado"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-[#C75B48] text-white rounded-xl font-medium hover:bg-[#A84838] transition-colors"
            >
              {promotion ? 'Salvar Alterações' : 'Criar Promoção'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PromotionsContent({
  promotions,
  products,
  loadingPromotions,
  onAddNew,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  promotions: Promotion[];
  products: Product[];
  loadingPromotions: boolean;
  onAddNew: () => void;
  onEdit: (promo: Promotion) => void;
  onToggleActive: (promo: Promotion) => void;
  onDelete: (promoId: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = promotions.filter(p => {
    if (filter === 'active') return p.active;
    if (filter === 'inactive') return !p.active;
    return true;
  });

  const activeCombos = promotions.filter(p => p.active && p.type === 'combo');
  const activeDiscounts = promotions.filter(p => p.active && p.type === 'discount');
  const totalUsed = promotions.reduce((sum, p) => sum + (p.usedCount || 0), 0);

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || productId;
  };

  const getComboItemsSummary = (items?: { productId: string; quantity: number }[]) => {
    if (!items) return '';
    return items.map(item => `${item.quantity}x ${getProductName(item.productId)}`).join(' + ');
  };

  const getComboOriginalPrice = (items?: { productId: string; quantity: number }[]) => {
    if (!items) return 0;
    return items.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#C75B48]/10 rounded-xl flex items-center justify-center">
              <PackageSearch size={20} className="text-[#C75B48]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{promotions.length}</p>
              <p className="text-sm text-gray-500">Total de promoções</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Percent size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{activeCombos.length + activeDiscounts.length}</p>
              <p className="text-sm text-gray-500">Ativas no momento</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalUsed}</p>
              <p className="text-sm text-gray-500">Vendas com promoções</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[#C75B48] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Inativas'}
            </button>
          ))}
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C75B48] text-white rounded-xl font-medium hover:bg-[#A84838] transition-colors"
        >
          <Plus size={18} />
          Nova Promoção
        </button>
      </div>

      {loadingPromotions ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[#C75B48]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <PackageSearch size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {filter === 'all' ? 'Nenhuma promoção cadastrada.' : `Nenhuma promoção ${filter === 'active' ? 'ativa' : 'inativa'}.`}
          </p>
          {filter === 'all' && (
            <button onClick={onAddNew} className="mt-4 text-[#C75B48] hover:underline">
              Criar a primeira promoção
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(promo => {
            const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
            return (
              <div
                key={promo.id}
                className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
                  !promo.active || isExpired ? 'border-gray-100 opacity-60' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        promo.type === 'combo'
                          ? 'bg-[#C75B48]/10 text-[#C75B48]'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {promo.type === 'combo' ? 'Combo' : 'Desconto'}
                      </span>
                      {(!promo.active || isExpired) && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Inativa
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-800">{promo.name}</h3>
                    {promo.description && (
                      <p className="text-sm text-gray-500 mt-1">{promo.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(promo)}
                      className="p-2 text-gray-400 hover:text-[#C75B48] hover:bg-[#FFF8F5] rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(promo.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {promo.type === 'combo' ? (
                  <div className="bg-[#FFF8F5] rounded-xl p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Itens do combo:</p>
                    <p className="text-sm text-gray-700 font-medium mb-2">
                      {getComboItemsSummary(promo.items)}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 line-through">
                            R$ {getComboOriginalPrice(promo.items).toFixed(2)}
                          </span>
                          <span className="text-lg font-bold text-[#C75B48]">
                            R$ {promo.comboPrice?.toFixed(2)}
                          </span>
                        </div>
                        {getComboOriginalPrice(promo.items) > 0 && (
                          <span className="text-xs text-green-600 font-medium">
                            Economia de R$ {(getComboOriginalPrice(promo.items) - (promo.comboPrice || 0)).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 rounded-xl p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Desconto:</p>
                    <p className="text-lg font-bold text-green-700">
                      {promo.discountType === 'percentage'
                        ? `${promo.discountValue}% OFF`
                        : `R$ ${promo.discountValue?.toFixed(2)} OFF`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Em: {promo.applicableProducts?.map(id => getProductName(id)).join(', ') || 'Todos os produtos'}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{promo.usedCount || 0} vendas</span>
                  {promo.expiresAt ? (
                    <span className={isExpired ? 'text-red-500' : ''}>
                      {isExpired ? 'Expirou' : `Validade: ${new Date(promo.expiresAt).toLocaleDateString('pt-BR')}`}
                    </span>
                  ) : (
                    <span>Sem validade</span>
                  )}
                </div>

                <button
                  onClick={() => onToggleActive(promo)}
                  className={`mt-3 w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                    promo.active
                      ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {promo.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
