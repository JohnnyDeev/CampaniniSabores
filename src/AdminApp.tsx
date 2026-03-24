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
  PackageSearch,
  Save,
  Flame,
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
import { checkIsAdmin, addAdmin, removeAdmin, getAllAdmins, getAdminCount, createUserMapping, type Admin } from './services/AdminService';
import { getReminders, createReminder, deleteReminder, markReminderAsCompleted, markAllRemindersAsRead } from './services/ReminderService';
import { getReportStats, getSalesByDateRange, getTopProducts, getMonthlyRevenue, getDateRange, exportToCSV, type SalesData, type ProductSales, type ReportStats } from './services/ReportService';
import { uploadProductImage, validateImageFile, formatFileSize, type UploadProgress } from './services/ImageUploadService';
import { getBanners, addBanner, updateBanner, deleteBanner, toggleBannerStatus } from './services/BannerService';
import ProductionManager from './components/ProductionManager';
import NutritionCalculator from './components/NutritionCalculator';
import type { Banner, Reminder } from './types';

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

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { id: 'products', label: 'Produtos', icon: ShoppingBag },
  { id: 'production', label: 'Produção', icon: Package },
  { id: 'coupons', label: 'Cupons', icon: Ticket },
  { id: 'promotions', label: 'Promoções', icon: PackageSearch },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'ratings', label: 'Avaliações', icon: Star },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'reminders', label: 'Lembretes', icon: Bell },
  { id: 'banners', label: 'Banners', icon: ImageIcon },
  { id: 'finance', label: 'Financeiro', icon: DollarSign },
  { id: 'nutrition', label: 'Calculadora Nutricional', icon: Flame },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Package; color: string; bg: string }> = {
  novo: { label: 'Novo', icon: Package, color: 'text-[#FF5C00]', bg: 'bg-blue-100' },
  producao: { label: 'Em Produção', icon: ChefHat, color: 'text-amber-600', bg: 'bg-amber-100' },
  saiu: { label: 'Saiu', icon: Truck, color: 'text-[#FF5C00]', bg: 'bg-purple-100' },
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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

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
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
  const [highlightReminderId, setHighlightReminderId] = useState<string | null>(null);

  const [ratings, setRatings] = useState<import('./types').Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

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

  // Financeiro
  const [overdueReceivables, setOverdueReceivables] = useState<any[]>([]);
  const [dueSoonReceivables, setDueSoonReceivables] = useState<any[]>([]);

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
    if (activeTab === 'reminders') {
      loadReminders();
    }
    if (activeTab === 'banners') {
      loadBanners();
    }
  }, [activeTab]);

  useEffect(() => {
    loadReminders();
    loadOrders();
    loadFinancialNotifications();

    const interval = setInterval(() => {
      loadReminders();
      loadOrders();
      loadFinancialNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const notificationCount = newOrdersCount +
    reminders.filter(r => {
      const reminderDate = toDate(r.reminderDate);
      return !r.isCompleted && reminderDate <= new Date();
    }).length +
    overdueReceivables.length +
    dueSoonReceivables.length +
    orders.filter(o => {
      // Pedidos com entrega marcada para hoje (na manhã do dia da entrega)
      if (!o.deliveryDate || o.status === 'entregue') return false;
      const deliveryDate = o.deliveryDate instanceof Date ? o.deliveryDate : toDate(o.deliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deliveryDay = new Date(deliveryDate);
      deliveryDay.setHours(0, 0, 0, 0);
      // Notifica na manhã do dia da entrega (antes das 12h)
      const isToday = deliveryDay.getTime() === today.getTime();
      const isMorning = new Date().getHours() < 12;
      return isToday && isMorning;
    }).length;

  const handleNotificationClick = (type: 'order' | 'reminder', id: string) => {
    if (type === 'order') {
      setActiveTab('orders');
      setHighlightOrderId(id);
    } else {
      setActiveTab('reminders');
      setHighlightReminderId(id);
    }
    setShowNotifications(false);
  };

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

  const loadFinancialNotifications = async () => {
    try {
      const { getReceivables } = await import('./services/FinanceService');
      const receivables = await getReceivables();

      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Contas vencidas
      const overdue = receivables.filter(r => {
        const dueDate = new Date(r.dueDate);
        return r.status === 'pending' && dueDate < now;
      });

      // Contas que vencem em 3 dias
      const dueSoon = receivables.filter(r => {
        const dueDate = new Date(r.dueDate);
        return r.status === 'pending' && dueDate >= now && dueDate <= threeDaysFromNow;
      });

      setOverdueReceivables(overdue);
      setDueSoonReceivables(dueSoon);
    } catch (error) {
      console.error('Erro ao carregar notificações financeiras:', error);
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
      let imageUrl = productData.image || '';
      let imagePath = '';

      if (imageFile) {
        setUploadingImage(true);
        const uploadProgress = (progress: UploadProgress) => {
          setUploadProgress(progress);
        };

        const result = await uploadProductImage(
          imageFile,
          editingProduct?.id,
          uploadProgress
        );
        imageUrl = result.url;
        imagePath = result.path;
        setUploadingImage(false);
        setUploadProgress(null);
      }

      if (editingProduct) {
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, {
          ...productData,
          image: imageUrl || null
        });
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          ...productData,
          image: imageUrl || null,
          createdAt: serverTimestamp()
        });
      }

      await loadProducts();
      setShowProductModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      setUploadingImage(false);
      setUploadProgress(null);
      alert(error instanceof Error ? error.message : 'Erro ao salvar produto. Tente novamente.');
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

  const handleSaveManualOrder = async (orderData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerObs: string;
    items: { productId: string; quantity: number }[];
    total: number;
    paymentMethod: 'pix' | 'dinheiro' | 'cartao' | 'permuta' | 'outro';
    deliveryDate?: string;
  }) => {
    try {
      // Gerar número sequencial do pedido
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('orderNumber', 'desc'));
      const snapshot = await getDocs(q);
      const lastOrderNumber = snapshot.empty ? 0 : (snapshot.docs[0].data().orderNumber || 0);
      const newOrderNumber = lastOrderNumber + 1;

      const newOrder = {
        orderNumber: newOrderNumber,
        customerId: undefined,
        customerName: orderData.customerName,
        customerEmail: '',
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        customerAddressStructured: undefined,
        customerObs: orderData.customerObs || '',
        deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : null,
        items: orderData.items,
        total: orderData.total,
        subtotal: orderData.total,
        status: 'novo' as Order['status'],
        paid: false,
        paidAt: undefined,
        paymentMethod: orderData.paymentMethod,
        createdAt: serverTimestamp(),
        whatsappSent: false,
        couponCode: undefined,
        couponDiscount: undefined,
        loyaltyPointsEarned: undefined,
        source: 'manual',
      };

      await addDoc(ordersRef, newOrder);
      await loadOrders();
      setShowManualOrderModal(false);
      alert('Pedido registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar pedido manual:', error);
      alert('Erro ao registrar pedido. Tente novamente.');
    }
  };

  const handleUpdateDeliveryDate = async (orderId: string, deliveryDate: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        deliveryDate: new Date(deliveryDate),
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, deliveryDate: new Date(deliveryDate) } : o));
    } catch (error) {
      console.error('Erro ao atualizar data de entrega:', error);
      alert('Erro ao atualizar data de entrega. Tente novamente.');
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

  const loadReminders = async () => {
    try {
      setLoadingReminders(true);
      const data = await getReminders();
      setReminders(data);
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleCreateReminder = async (data: { title: string; description: string; reminderDate: Date }) => {
    try {
      await createReminder(data);
      await loadReminders();
      setShowReminderModal(false);
    } catch (error) {
      console.error('Erro ao criar lembrete:', error);
      alert('Erro ao criar lembrete. Tente novamente.');
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return;
    try {
      await deleteReminder(reminderId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error);
    }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    try {
      await markReminderAsCompleted(reminderId);
      setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, isCompleted: true } : r));
    } catch (error) {
      console.error('Erro ao concluir lembrete:', error);
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

  const loadBanners = async () => {
    try {
      setLoadingBanners(true);
      const data = await getBanners();
      setBanners(data);
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
    } finally {
      setLoadingBanners(false);
    }
  };

  const handleSaveBanner = async (data: Omit<Banner, 'id' | 'createdAt'>, imageFile?: File) => {
    try {
      if (editingBanner) {
        await updateBanner(editingBanner.id, data, imageFile);
      } else {
        await addBanner(data, imageFile);
      }
      await loadBanners();
      setShowBannerModal(false);
      setEditingBanner(null);
    } catch (error) {
      console.error('Erro ao salvar banner:', error);
      alert(`Erro ao salvar banner: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;
    try {
      await deleteBanner(bannerId);
      await loadBanners();
    } catch (error) {
      console.error('Erro ao excluir banner:', error);
    }
  };

  const handleToggleBannerStatus = async (banner: Banner) => {
    try {
      await toggleBannerStatus(banner.id, !banner.active);
      await loadBanners();
    } catch (error) {
      console.error('Erro ao atualizar status do banner:', error);
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
        <Loader2 size={48} className="animate-spin text-[#FF5C00]" />
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
          <div className="w-24 h-24 bg-gradient-to-br from-[#FF5C00] to-[#E65100] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Settings size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Painel Admin</h1>
          <p className="text-gray-500 mb-8">Campanini Sabores</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border-2 border-gray-200 rounded-2xl py-4 px-6 font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
        className="bg-gray-900 text-white flex flex-col fixed h-full z-20 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800 flex items-center gap-4 flex-shrink-0">
          <div className="w-12 h-12 bg-[#FF5C00] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-[#FF5C00]/20 flex-shrink-0">
            C
          </div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-bold text-lg tracking-tight uppercase leading-tight">CAMPANINI<br />SABORES</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Admin</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                ? 'bg-[#FF5C00] text-white shadow-lg shadow-[#FF5C00]/30'
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
                {activeTab === 'banners' && 'Gerenciar banners do site'}
                {activeTab === 'settings' && 'Configurações da loja'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell size={22} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {notificationCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-96 overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-gray-100">
                        <h4 className="font-semibold text-gray-800">Notificações</h4>
                      </div>

                      <div className="overflow-y-auto flex-1">
                        {orders.filter(o => o.status === 'novo').length > 0 && (
                          <div className="p-3 border-b border-gray-100">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Pedidos Novos</p>
                            {orders.filter(o => o.status === 'novo').slice(0, 5).map(order => (
                              <button
                                key={order.id}
                                onClick={() => handleNotificationClick('order', order.id)}
                                className="w-full text-left p-2 hover:bg-gray-50 rounded-lg flex items-center gap-3"
                              >
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#FF5C00] flex items-center justify-center">
                                  <ShoppingCart size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{order.customerName}</p>
                                  <p className="text-xs text-gray-500">R$ {order.total.toFixed(2)}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {reminders.filter(r => {
                          const reminderDate = toDate(r.reminderDate);
                          return !r.isCompleted && reminderDate <= new Date();
                        }).length > 0 && (
                            <div className="p-3">
                              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Lembretes</p>
                              {reminders.filter(r => {
                                const reminderDate = toDate(r.reminderDate);
                                return !r.isCompleted && reminderDate <= new Date();
                              }).slice(0, 5).map(reminder => (
                                <button
                                  key={reminder.id}
                                  onClick={() => handleNotificationClick('reminder', reminder.id)}
                                  className="w-full text-left p-2 hover:bg-gray-50 rounded-lg flex items-center gap-3"
                                >
                                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                    <Clock size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{reminder.title}</p>
                                    <p className="text-xs text-gray-500">{toDate(reminder.reminderDate).toLocaleString('pt-BR')}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                        {/* Entregas do Dia */}
                        {orders.filter(o => {
                          if (!o.deliveryDate || o.status === 'entregue') return false;
                          const deliveryDate = o.deliveryDate instanceof Date ? o.deliveryDate : toDate(o.deliveryDate);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const deliveryDay = new Date(deliveryDate);
                          deliveryDay.setHours(0, 0, 0, 0);
                          const isToday = deliveryDay.getTime() === today.getTime();
                          const isMorning = new Date().getHours() < 12;
                          return isToday && isMorning;
                        }).length > 0 && (
                            <div className="p-3 border-t border-gray-100 bg-[#FFF7F2]">
                              <p className="text-xs font-medium text-[#FF5C00] uppercase mb-2 flex items-center gap-1">
                                <Truck size={12} />
                                Entregas do Dia ({orders.filter(o => {
                                  if (!o.deliveryDate || o.status === 'entregue') return false;
                                  const deliveryDate = o.deliveryDate instanceof Date ? o.deliveryDate : toDate(o.deliveryDate);
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const deliveryDay = new Date(deliveryDate);
                                  deliveryDay.setHours(0, 0, 0, 0);
                                  const isToday = deliveryDay.getTime() === today.getTime();
                                  const isMorning = new Date().getHours() < 12;
                                  return isToday && isMorning;
                                }).length})
                              </p>
                              {orders.filter(o => {
                                if (!o.deliveryDate || o.status === 'entregue') return false;
                                const deliveryDate = o.deliveryDate instanceof Date ? o.deliveryDate : toDate(o.deliveryDate);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const deliveryDay = new Date(deliveryDate);
                                deliveryDay.setHours(0, 0, 0, 0);
                                const isToday = deliveryDay.getTime() === today.getTime();
                                const isMorning = new Date().getHours() < 12;
                                return isToday && isMorning;
                              }).slice(0, 5).map(order => (
                                <button
                                  key={order.id}
                                  onClick={() => handleNotificationClick('order', order.id)}
                                  className="w-full text-left p-2 hover:bg-orange-50 rounded-lg flex items-center gap-3"
                                >
                                  <div className="w-8 h-8 rounded-full bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center">
                                    <Truck size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{order.customerName}</p>
                                    <p className="text-xs text-gray-500">
                                      {order.deliveryDate instanceof Date
                                        ? order.deliveryDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                        : toDate(order.deliveryDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                      } • R$ {order.total.toFixed(2)}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                        {notificationCount === 0 && (
                          <div className="p-8 text-center text-gray-400">
                            <Bell size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhuma notificação</p>
                          </div>
                        )}

                        {/* Contas Vencidas */}
                        {overdueReceivables.length > 0 && (
                          <div className="p-3 border-t border-gray-100 bg-red-50">
                            <p className="text-xs font-medium text-red-700 uppercase mb-2 flex items-center gap-1">
                              <AlertCircle size={12} />
                              Contas Vencidas ({overdueReceivables.length})
                            </p>
                            {overdueReceivables.slice(0, 3).map(rec => (
                              <div
                                key={rec.id}
                                className="w-full p-2 hover:bg-red-100 rounded-lg flex items-center gap-3 cursor-pointer"
                                onClick={() => {
                                  setActiveTab('finance');
                                  setShowNotifications(false);
                                }}
                              >
                                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                  <DollarSign size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-red-800 truncate">{rec.customerName}</p>
                                  <p className="text-xs text-red-600">
                                    Vencido em {new Date(rec.dueDate).toLocaleDateString('pt-BR')} • R$ {rec.amount.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Contas para Vencer */}
                        {dueSoonReceivables.length > 0 && (
                          <div className="p-3 border-t border-gray-100 bg-amber-50">
                            <p className="text-xs font-medium text-amber-700 uppercase mb-2 flex items-center gap-1">
                              <AlertCircle size={12} />
                              Para Vencer ({dueSoonReceivables.length})
                            </p>
                            {dueSoonReceivables.slice(0, 3).map(rec => (
                              <div
                                key={rec.id}
                                className="w-full p-2 hover:bg-amber-100 rounded-lg flex items-center gap-3 cursor-pointer"
                                onClick={() => {
                                  setActiveTab('finance');
                                  setShowNotifications(false);
                                }}
                              >
                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                  <DollarSign size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-amber-800 truncate">{rec.customerName}</p>
                                  <p className="text-xs text-amber-600">
                                    Vence em {new Date(rec.dueDate).toLocaleDateString('pt-BR')} • R$ {rec.amount.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <a
                href="/"
                target="_blank"
                className="text-sm text-[#FF5C00] hover:underline flex items-center gap-1"
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
              highlightId={highlightOrderId}
              onAddManualOrder={() => setShowManualOrderModal(true)}
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

          {/* Production */}
          {activeTab === 'production' && (
            <ProductionManager />
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

          {/* Reminders */}
          {activeTab === 'reminders' && (
            <RemindersContent
              reminders={reminders}
              loading={loadingReminders}
              onCreate={() => setShowReminderModal(true)}
              onDelete={handleDeleteReminder}
              onComplete={handleCompleteReminder}
              highlightId={highlightReminderId}
            />
          )}

          {/* Finance */}
          {activeTab === 'finance' && (
            <FinanceContent />
          )}

          {/* Nutrition Calculator */}
          {activeTab === 'nutrition' && (
            <NutritionCalculator />
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <SettingsContent user={user} />
          )}

          {/* Banners */}
          {activeTab === 'banners' && (
            <BannersContent
              banners={banners}
              loading={loadingBanners}
              onAddNew={() => {
                setEditingBanner(null);
                setShowBannerModal(true);
              }}
              onEdit={(banner) => {
                setEditingBanner(banner);
                setShowBannerModal(true);
              }}
              onDelete={handleDeleteBanner}
              onToggleActive={handleToggleBannerStatus}
            />
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
        {showBannerModal && (
          <BannerModal
            banner={editingBanner}
            onSave={handleSaveBanner}
            onClose={() => {
              setShowBannerModal(false);
              setEditingBanner(null);
            }}
          />
        )}
        {showManualOrderModal && (
          <ManualOrderModal
            products={products}
            onSave={handleSaveManualOrder}
            onClose={() => setShowManualOrderModal(false)}
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
        <Loader2 size={32} className="animate-spin text-[#FF5C00]" />
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
              <ShoppingCart size={24} className="text-[#FF5C00]" />
            </div>
            <span className="text-xs text-[#FF5C00] font-medium flex items-center gap-1">
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
              <Package size={24} className="text-[#FF5C00]" />
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
            <h3 className="font-semibold text-gray-800">Pedidos por Dia (Últimos 7 dias)</h3>
          </div>
          {(() => {
            // Calcula pedidos dos últimos 7 dias
            const last7Days = Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              date.setHours(0, 0, 0, 0);
              return date;
            });

            const ordersByDay = last7Days.map(date => {
              const dayOrders = recentOrders.filter(order => {
                const orderDate = toDate(order.createdAt);
                return orderDate.toDateString() === date.toDateString();
              });
              return {
                date,
                count: dayOrders.length,
                dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' })
              };
            });

            const maxCount = Math.max(...ordersByDay.map(d => d.count), 1);

            return (
              <div className="h-64 flex items-end justify-between gap-2">
                {ordersByDay.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-[#FF5C00] to-[#FFB800] rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${(day.count / maxCount) * 180}px` }}
                      title={`${day.count} pedidos`}
                    />
                    <span className="text-xs text-gray-400 capitalize">
                      {day.dayName.replace('.', '')}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
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
          <button className="text-sm text-[#FF5C00] hover:underline">
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
                  <p className="font-bold text-[#FF5C00]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}</p>
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

function OrdersContent({ orders, loadingOrders, products, onStatusChange, onTogglePaid, highlightId, onAddManualOrder }: {
  orders: Order[];
  loadingOrders: boolean;
  products: Product[];
  onStatusChange: (orderId: string, status: Order['status']) => Promise<void>;
  onTogglePaid: (order: Order) => Promise<void>;
  highlightId?: string | null;
  onAddManualOrder: () => void;
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
          <p className="text-2xl font-bold text-[#FF5C00]">{formatCurrency(totalToday)}</p>
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
            <button
              onClick={onAddManualOrder}
              className="px-4 py-2 bg-[#FF5C00] text-white rounded-lg font-medium hover:bg-[#E65100] transition-colors flex items-center gap-2 text-sm"
            >
              <Plus size={18} />
              Adicionar Pedido Manual
            </button>
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === values[i]
                    ? 'bg-[#FF5C00] text-white'
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
                className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors cursor-pointer ${order.status === 'novo' ? 'bg-blue-50/50' : ''
                  } ${highlightId === order.id ? 'ring-2 ring-[#FF5C00] ring-offset-2 bg-orange-50' : ''}`}
                onClick={() => setSelectedOrder(order)}
                ref={highlightId === order.id ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined}
              >
                <div className="col-span-1 flex flex-col">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{order.id.slice(0, 6).toUpperCase()}</span>
                  {order.whatsappSent && <MessageCircle size={14} className="text-green-600 ml-1" />}
                  {order.deliveryDate && order.status !== 'entregue' && (
                    <div className="flex items-center gap-1 text-[#FF5C00] mt-1">
                      <Calendar size={12} />
                      <span className="text-xs">
                        {order.deliveryDate instanceof Date
                          ? order.deliveryDate.toLocaleDateString('pt-BR', { day: '2digit', month: '2-digit' })
                          : toDate(order.deliveryDate).toLocaleDateString('pt-BR', { day: '2digit', month: '2-digit' })
                        }
                      </span>
                    </div>
                  )}
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
                        {item.comboId ? <span className="text-[#FFB800] font-medium">[COMBO]</span> : null}
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
                  <p className="font-bold text-[#FF5C00]">{formatCurrency(order.total)}</p>
                </div>

                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePaid(order);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${order.paid
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
            <Loader2 size={32} className="animate-spin text-[#FF5C00]" />
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
            onUpdateDeliveryDate={handleUpdateDeliveryDate}
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
  onUpdateDeliveryDate,
}: {
  order: Order;
  notes: string;
  onNotesChange: (notes: string) => void;
  onTogglePaid: () => void;
  onClose: () => void;
  onCopy: () => void;
  products: Product[];
  onStatusChange: (orderId: string, status: Order['status']) => Promise<void>;
  onUpdateDeliveryDate: (orderId: string, deliveryDate: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(order.status);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedNextStatus, setSelectedNextStatus] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(order.paid);
  const [deliveryDate, setDeliveryDate] = useState(
    order.deliveryDate
      ? new Date(order.deliveryDate).toISOString().slice(0, 16)
      : ''
  );
  const [savingDeliveryDate, setSavingDeliveryDate] = useState(false);

  const handleTogglePaid = async () => {
    setIsPaid(!isPaid);
    await onTogglePaid();
  };

  const handleDeliveryDateChange = async (value: string) => {
    setDeliveryDate(value);
    if (value) {
      setSavingDeliveryDate(true);
      await onUpdateDeliveryDate(order.id, value);
      setSavingDeliveryDate(false);
    }
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
                className="text-xs text-[#FF5C00] hover:underline flex items-center gap-1"
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
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 bg-[#FFF7F2] rounded-lg px-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 bg-[#FFB800] text-white rounded text-xs font-bold">COMBO</span>
                          <p className="text-gray-800 font-medium">{item.quantity}x {item.comboName || 'Combo'}</p>
                        </div>
                        {item.comboItems?.map((ci: any, ciIdx: number) => (
                          <p key={ciIdx} className="text-xs text-gray-500 ml-4">
                            {ci.quantity}x {getProductName(ci.productId)}
                          </p>
                        ))}
                        <p className="text-xs text-[#FF5C00] mt-1 font-medium">
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
              <span className="text-xl font-bold text-[#FF5C00]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}</span>
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
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${isPaid
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
            >
              {isPaid ? '✅ Recebido' : 'Marcar como Pago'}
            </button>
          </div>

          {/* Delivery Date */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Data de Entrega</h4>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <input
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => handleDeliveryDateChange(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
              />
              {deliveryDate && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-[#FF5C00]" />
                  <span className="text-gray-600">
                    Entrega programada para:{' '}
                    <span className="font-medium text-gray-800">
                      {new Date(deliveryDate).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </span>
                </div>
              )}
              {savingDeliveryDate && (
                <div className="mt-2 flex items-center gap-2 text-xs text-[#FF5C00]">
                  <Loader2 size={14} className="animate-spin" />
                  Salvando...
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              📌 A notificação aparecerá no sininho na manhã do dia da entrega
            </p>
          </div>

          {/* Status */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Status do Pedido</h4>
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`w-full p-4 rounded-2xl font-medium flex items-center justify-between transition-colors ${status === 'novo' ? 'bg-blue-100 text-blue-700' :
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
                      className={`w-full p-3 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors ${STATUS_CONFIG[nextStatus].bg
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
              className="w-full p-4 border border-gray-200 rounded-2xl resize-none focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
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
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'tradicional' | 'fit'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Filtrar e ordenar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && product.active) ||
      (statusFilter === 'inactive' && !product.active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'date':
        const dateA = toDate(a.createdAt).getTime();
        const dateB = toDate(b.createdAt).getTime();
        comparison = dateA - dateB;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSortChange = (field: 'name' | 'price' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'price' | 'date') => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Cabeçalho e Busca */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Produtos</h3>
            <p className="text-sm text-gray-500">Gerencie seu cardápio, preços e disponibilidade</p>
          </div>
          <button
            onClick={onAddNew}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#FF5C00] text-white rounded-xl hover:bg-[#E65200] transition-all font-bold shadow-lg shadow-[#FF5C00]/20 active:scale-95"
          >
            <Plus size={20} />
            <span>Adicionar Novo Produto</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar produtos por nome ou descrição..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {/* Categoria */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as typeof categoryFilter)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
            >
              <option value="all">Todas Categorias</option>
              <option value="tradicional">Tradicional</option>
              <option value="fit">Fit</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
            >
              <option value="all">Todos Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            {/* Ordenação */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={e => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as typeof sortBy);
                setSortOrder(order as typeof sortOrder);
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
            >
              <option value="name-asc">Nome (A-Z)</option>
              <option value="name-desc">Nome (Z-A)</option>
              <option value="price-asc">Preço (menor-maior)</option>
              <option value="price-desc">Preço (maior-menor)</option>
              <option value="date-desc">Mais recentes</option>
              <option value="date-asc">Mais antigos</option>
            </select>

            {/* Toggle View */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2.5 transition-colors ${viewMode === 'grid' ? 'bg-[#FF5C00] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="Visualização em Grid"
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2.5 transition-colors ${viewMode === 'list' ? 'bg-[#FF5C00] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="Visualização em Lista"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Mostrando <span className="font-semibold text-gray-800">{sortedProducts.length}</span> de{' '}
            <span className="font-semibold text-gray-800">{products.length}</span> produtos
            {searchTerm && <span> para "<span className="text-[#FF5C00]">{searchTerm}</span>"</span>}
          </p>
          {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className="text-sm text-[#FF5C00] hover:underline flex items-center gap-1"
            >
              <RefreshCw size={14} /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista/Grid de Produtos */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loadingProducts ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-[#FF5C00]" />
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={64} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 mb-2">Nenhum produto encontrado</p>
            <p className="text-sm text-gray-400">Tente ajustar os filtros ou busque por outro termo</p>
            {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-4 text-[#FF5C00] hover:underline text-sm font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          /* Visualização em Lista (Tabela) */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
                  <th
                    className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSortChange('price')}
                  >
                    Preço {getSortIcon('price')}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FFF7F2] rounded-lg flex items-center justify-center overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={20} className="text-[#FF5C00]" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{product.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.category === 'tradicional'
                        ? 'bg-[#FF5C00]/10 text-[#FF5C00]'
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
                    <td className="px-6 py-4 text-gray-600 font-medium">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onToggleActive(product)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${product.active
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
                          className="p-2 text-gray-400 hover:text-[#FF5C00] hover:bg-gray-100 rounded-lg transition-colors"
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
        ) : (
          /* Visualização em Grid */
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-[#FF5C00]/20 transition-all group"
                >
                  {/* Imagem */}
                  <div className="relative h-40 bg-[#FFF7F2] overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={40} className="text-[#FF5C00]/40" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(product)}
                        className="p-1.5 bg-white rounded-lg shadow text-gray-600 hover:text-[#FF5C00] transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(product.id)}
                        className="p-1.5 bg-white rounded-lg shadow text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800 truncate flex-1">{product.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${product.category === 'tradicional'
                        ? 'bg-[#FF5C00]/10 text-[#FF5C00]'
                        : 'bg-green-100 text-green-700'
                        }`}>
                        {product.category === 'tradicional' ? 'Tradicional' : 'Fit'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>

                    {product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white text-gray-600 rounded text-xs border border-gray-200">
                            {tag}
                          </span>
                        ))}
                        {product.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-gray-400 text-xs">+{product.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-[#FF5C00]">{formatCurrency(product.price)}</span>
                      <button
                        onClick={() => onToggleActive(product)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${product.active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                      >
                        {product.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${subTab === 'list'
                  ? 'bg-[#FF5C00] text-white'
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                Lista de Clientes
              </button>
              <button
                onClick={() => onSubTabChange('loyalty')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${subTab === 'loyalty'
                  ? 'bg-[#FF5C00] text-white'
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
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-64 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-[#FF5C00]">{customers.length}</p>
              <p className="text-sm text-[#FF5C00]">Total de Clientes</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(customers.reduce((acc, c) => acc + c.totalSpent, 0))}</p>
              <p className="text-sm text-green-600">Receita Total</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-[#FF5C00]">
                {customers.length > 0 ? Math.round(customers.reduce((acc, c) => acc + c.orderCount, 0) / customers.length) : 0}
              </p>
              <p className="text-sm text-[#FF5C00]">Média de Pedidos</p>
            </div>
          </div>
        </div>

        {subTab === 'list' && (
          <div className="overflow-x-auto">
            {loadingCustomers ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={48} className="animate-spin text-[#FF5C00]" />
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
                              <div className="w-10 h-10 bg-[#FF5C00] rounded-full flex items-center justify-center text-white font-medium text-sm">
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
                            <span className="text-sm font-bold text-[#FFB800]">{customer.loyaltyPoints}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-gray-400 hover:text-[#FF5C00] hover:bg-gray-100 rounded-lg transition-colors">
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
            <Star size={32} fill="#FFB800" className="text-[#FFB800]" />
          </div>
          <p className="text-4xl font-bold text-gray-800 mb-1">{avgRating}</p>
          <p className="text-gray-500">Avaliação Média</p>
          <div className="flex justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={18} fill={i <= Math.round(Number(avgRating)) ? "#FFB800" : "none"} className={i <= Math.round(Number(avgRating)) ? "text-[#FFB800]" : "text-gray-300"} />
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
            <Loader2 size={32} className="animate-spin text-[#FF5C00]" />
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
                    <div className="w-10 h-10 bg-[#FF5C00] rounded-full flex items-center justify-center text-white font-medium">
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
                          fill={i <= rating.score ? "#FFB800" : "none"}
                          className={i <= rating.score ? "text-[#FFB800]" : "text-gray-300"}
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
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear'>('last30days');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number; orders: number }[]>([]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const loadReports = async () => {
    setLoading(true);
    try {
      const range = getDateRange(dateRange);

      const [statsData, sales, topProds, monthly] = await Promise.all([
        getReportStats(range.start, range.end),
        getSalesByDateRange(range.start, range.end),
        getTopProducts(range.start, range.end, 10),
        getMonthlyRevenue(new Date().getFullYear())
      ]);

      setStats(statsData);
      setSalesData(sales);
      setTopProducts(topProds);
      setMonthlyRevenue(monthly);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const handleExportCSV = () => {
    const range = getDateRange(dateRange);
    const exportData = salesData.map(day => ({
      data: new Date(day.date).toLocaleDateString('pt-BR'),
      total_vendido: day.total.toFixed(2),
      pedidos: day.orders
    }));
    exportToCSV(exportData, `relatorio_vendas_${dateRange}`);
  };

  const maxSale = Math.max(...salesData.map(d => d.total), 1);
  const maxMonthly = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header com filtros */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={20} className="text-gray-400" />
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as typeof dateRange)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
          >
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="last7days">Últimos 7 dias</option>
            <option value="last30days">Últimos 30 dias</option>
            <option value="thisMonth">Este mês</option>
            <option value="lastMonth">Mês passado</option>
            <option value="thisYear">Este ano</option>
          </select>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF5C00] text-white rounded-xl text-sm font-medium hover:bg-[#E65100] transition-colors"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={48} className="animate-spin text-[#FF5C00]" />
        </div>
      ) : (
        <>
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Receita Total</p>
                  <p className="text-xl font-bold text-gray-800">{stats ? formatCurrency(stats.totalRevenue) : 'R$ 0,00'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp size={12} />
                <span>Período selecionado</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={24} className="text-[#FF5C00]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total de Pedidos</p>
                  <p className="text-xl font-bold text-gray-800">{stats?.totalOrders || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#FF5C00]">
                <CheckCircle2 size={12} />
                <span>Pedidos pagos</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Tag size={24} className="text-[#FF5C00]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Ticket Médio</p>
                  <p className="text-xl font-bold text-gray-800">{stats ? formatCurrency(stats.avgTicket) : 'R$ 0,00'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#FF5C00]">
                <BarChart3 size={12} />
                <span>Por pedido</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Star size={24} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Melhor Dia</p>
                  <p className="text-xl font-bold text-gray-800">{stats?.bestDay || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <DollarSign size={12} />
                <span>{stats ? formatCurrency(stats.bestDayRevenue) : 'R$ 0,00'}</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Vendas por Dia */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#FF5C00]" />
                  Vendas por Dia
                </h3>
                <span className="text-xs text-gray-500">{getDateRange(dateRange).label}</span>
              </div>
              {salesData.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart3 size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem dados no período</p>
                </div>
              ) : (
                <div className="h-64 flex items-end justify-between gap-2">
                  {salesData.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-gradient-to-t from-[#FF5C00] to-[#FFB800] rounded-t-lg transition-all hover:opacity-80"
                        style={{ height: `${Math.max((day.total / maxSale) * 200, day.total > 0 ? 8 : 0)}px` }}
                        title={`${formatCurrency(day.total)} - ${day.orders} pedidos`}
                      />
                      <span className="text-xs text-gray-500 rotate-0">
                        {new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Produtos Mais Vendidos */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#FF5C00]" />
                  Produtos Mais Vendidos
                </h3>
                <span className="text-xs text-gray-500">Top 10</span>
              </div>
              {topProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingBag size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem vendas de produtos</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {topProducts.map((product, idx) => (
                    <div key={product.productId} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-700' :
                          idx === 2 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-50 text-gray-500'
                        }`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{product.productName}</p>
                        <p className="text-xs text-gray-500">{product.quantity} unidades • {formatCurrency(product.revenue)}</p>
                      </div>
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FF5C00] to-[#FFB800] rounded-full"
                          style={{ width: `${Math.min((product.quantity / topProducts[0].quantity) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Receita Mensal */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Calendar size={18} className="text-[#FF5C00]" />
                Receita Mensal - {new Date().getFullYear()}
              </h3>
            </div>
            <div className="h-48 flex items-end justify-between gap-2">
              {monthlyRevenue.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-[#7BA05B] to-[#8BC34A] rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${Math.max((month.revenue / maxMonthly) * 140, month.revenue > 0 ? 8 : 0)}px` }}
                    title={`${formatCurrency(month.revenue)} - ${month.orders} pedidos`}
                  />
                  <span className="text-xs text-gray-500 font-medium">{month.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de Vendas Diárias */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <List size={18} className="text-[#FF5C00]" />
                Detalhamento das Vendas
              </h3>
              <span className="text-xs text-gray-500">{salesData.length} dias</span>
            </div>
            {salesData.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package size={40} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma venda no período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium text-right">Total Vendido</th>
                      <th className="pb-3 font-medium text-center">Pedidos</th>
                      <th className="pb-3 font-medium text-right">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.filter(d => d.orders > 0).map((day, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-gray-800 font-medium">
                          {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="py-3 text-right font-bold text-[#FF5C00]">
                          {formatCurrency(day.total)}
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-1 bg-blue-50 text-[#FF5C00] rounded-full text-xs font-medium">
                            {day.orders}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-600">
                          {formatCurrency(day.orders > 0 ? day.total / day.orders : 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {salesData.filter(d => d.orders > 0).length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">
                    Nenhuma venda registrada neste período
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

function RemindersContent({
  reminders,
  loading,
  onCreate,
  onDelete,
  onComplete,
  highlightId
}: {
  reminders: Reminder[];
  loading: boolean;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  highlightId?: string | null;
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showModal, setShowModal] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', description: '', reminderDate: '' });
  const [saving, setSaving] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const now = new Date();

  const filteredReminders = reminders.filter(r => {
    if (filter === 'pending') return !r.isCompleted;
    if (filter === 'completed') return r.isCompleted;
    return true;
  });

  const unreadCount = reminders.filter(r => !r.isRead && !r.isCompleted).length;

  const handleSave = async () => {
    if (!newReminder.title.trim() || !newReminder.reminderDate) {
      alert('Preencha o título e a data/hora do lembrete.');
      return;
    }

    setSaving(true);
    try {
      await createReminder({
        title: newReminder.title,
        description: newReminder.description,
        reminderDate: new Date(newReminder.reminderDate),
      });
      setNewReminder({ title: '', description: '', reminderDate: '' });
      setShowModal(false);
    } catch (error: any) {
      console.error('Erro ao criar lembrete:', error);
      alert('Erro ao criar lembrete: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    setMarkingAll(true);
    try {
      await markAllRemindersAsRead();
    } catch (error) {
      console.error('Erro ao marcar como lidos:', error);
      alert('Erro ao marcar lembretes como lidos');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">Lembretes</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-[#FF5C00] text-white text-xs font-bold rounded-full">
                {unreadCount} novo{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {markingAll ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Marcar todos como lidos
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-[#FF5C00] text-white rounded-lg font-medium hover:bg-[#E65100] transition-colors flex items-center gap-2"
            >
              <Plus size={18} /> Criar Lembrete
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 flex gap-2">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                ? 'bg-[#FF5C00] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Concluídos'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#FF5C00]" />
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Bell size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum lembrete encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReminders.map(reminder => {
              const reminderDate = toDate(reminder.reminderDate);
              const isOverdue = !reminder.isCompleted && reminderDate < now;

              return (
                <div
                  key={reminder.id}
                  className={`p-4 flex items-start gap-4 hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''} ${highlightId === reminder.id ? 'ring-2 ring-[#FF5C00] ring-offset-2 bg-orange-50' : ''}`}
                  ref={highlightId === reminder.id ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${reminder.isCompleted
                    ? 'bg-green-100 text-green-600'
                    : isOverdue
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-600'
                    }`}>
                    {reminder.isCompleted ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{reminder.title}</h4>
                    {reminder.description && (
                      <p className="text-sm text-gray-500 mt-1">{reminder.description}</p>
                    )}
                    <p className={`text-xs mt-2 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                      {isOverdue && 'ATRASADO - '}
                      {reminderDate.toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!reminder.isCompleted && (
                      <button
                        onClick={() => onComplete(reminder.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Marcar como concluído"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(reminder.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Novo Lembrete</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                <input
                  type="text"
                  placeholder="Ex: Verificar estoque de esfihas"
                  value={newReminder.title}
                  onChange={e => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <textarea
                  placeholder="Detalhes adicionais..."
                  value={newReminder.description}
                  onChange={e => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data e Hora *</label>
                <input
                  type="datetime-local"
                  value={newReminder.reminderDate}
                  onChange={e => setNewReminder(prev => ({ ...prev, reminderDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-[#FF5C00] text-white rounded-lg font-medium hover:bg-[#E65100] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                Salvar Lembrete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function FinanceContent() {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables' | 'summary'>('summary');
  const [financialSummary, setFinancialSummary] = useState<{
    totalReceivable: number;
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
    totalPayable: number;
    totalPaid: number;
    balance: number;
  } | null>(null);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReceivable, setShowAddReceivable] = useState(false);
  const [showAddPayable, setShowAddPayable] = useState(false);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summary, receivablesData, payablesData] = await Promise.all([
        import('./services/FinanceService').then(m => m.getFinancialSummary()),
        import('./services/FinanceService').then(m => m.getReceivables()),
        import('./services/FinanceService').then(m => m.getPayables())
      ]);

      setFinancialSummary(summary);
      setReceivables(receivablesData);
      setPayables(payablesData);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkReceivableAsPaid = async (id: string) => {
    try {
      const { markReceivableAsPaid } = await import('./services/FinanceService');
      await markReceivableAsPaid(id);
      await loadData();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      alert('Erro ao marcar conta como paga');
    }
  };

  const handleMarkPayableAsPaid = async (id: string) => {
    try {
      const { markPayableAsPaid } = await import('./services/FinanceService');
      await markPayableAsPaid(id);
      await loadData();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      alert('Erro ao marcar conta como paga');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={48} className="animate-spin text-[#FF5C00]" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'summary'
            ? 'bg-[#FF5C00] text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('receivables')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'receivables'
            ? 'bg-[#FF5C00] text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          Contas a Receber
        </button>
        <button
          onClick={() => setActiveTab('payables')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === 'payables'
            ? 'bg-[#FF5C00] text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          Contas a Pagar
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Receber */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Contas a Receber</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(financialSummary?.totalReceivable || 0)}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Recebido: {formatCurrency(financialSummary?.totalReceived || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-600">Pendente: {formatCurrency(financialSummary?.totalPending || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Atrasado: {formatCurrency(financialSummary?.totalOverdue || 0)}</span>
              </div>
            </div>
          </div>

          {/* Pagar */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Contas a Pagar</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(financialSummary?.totalPayable || 0)}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Pago: {formatCurrency(financialSummary?.totalPaid || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-600">Pendente: {formatCurrency((financialSummary?.totalPayable || 0) - (financialSummary?.totalPaid || 0))}</span>
              </div>
            </div>
          </div>

          {/* Saldo */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Saldo do Caixa</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Saldo Atual</p>
                <p className={`text-2xl font-bold ${(financialSummary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {formatCurrency(financialSummary?.balance || 0)}
                </p>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Recebido - Pago</p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(financialSummary?.totalReceived || 0)} - {formatCurrency(financialSummary?.totalPaid || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Últimas Movimentações */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 md:col-span-3">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Últimas Contas a Receber</h3>
            {receivables.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma conta a receber</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-3 font-medium">Pedido</th>
                      <th className="pb-3 font-medium">Cliente</th>
                      <th className="pb-3 font-medium">Vencimento</th>
                      <th className="pb-3 font-medium">Valor</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivables.slice(0, 5).map(rec => (
                      <tr key={rec.id} className="border-b border-gray-50">
                        <td className="py-3 text-gray-600">#{rec.orderNumber}</td>
                        <td className="py-3 text-gray-800 font-medium">{rec.customerName}</td>
                        <td className="py-3 text-gray-600">{new Date(rec.dueDate).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 text-right font-bold text-[#FF5C00]">{formatCurrency(rec.amount)}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${rec.status === 'paid' ? 'bg-green-100 text-green-700' :
                            rec.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                            {rec.status === 'paid' ? 'Pago' : rec.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {rec.status === 'pending' && (
                            <button
                              onClick={() => handleMarkReceivableAsPaid(rec.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                            >
                              Marcar como Pago
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receivables Tab */}
      {activeTab === 'receivables' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Contas a Receber</h3>
            <button
              onClick={() => setShowAddReceivable(true)}
              className="flex items-center gap-2 bg-[#FF5C00] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#E65100]"
            >
              <Plus size={18} /> Nova Conta
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-4 font-medium">Pedido</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Vencimento</th>
                  <th className="px-6 py-4 font-medium">Valor</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map(rec => (
                  <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">#{rec.orderNumber}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{rec.customerName}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(rec.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-right font-bold text-[#FF5C00]">{formatCurrency(rec.amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${rec.status === 'paid' ? 'bg-green-100 text-green-700' :
                        rec.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {rec.status === 'paid' ? 'Pago' : rec.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {rec.status === 'pending' && (
                        <button
                          onClick={() => handleMarkReceivableAsPaid(rec.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                        >
                          Marcar como Pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payables Tab */}
      {activeTab === 'payables' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Contas a Pagar</h3>
            <button
              onClick={() => setShowAddPayable(true)}
              className="flex items-center gap-2 bg-[#FF5C00] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#E65100]"
            >
              <Plus size={18} /> Nova Conta
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-4 font-medium">Descrição</th>
                  <th className="px-6 py-4 font-medium">Categoria</th>
                  <th className="px-6 py-4 font-medium">Vencimento</th>
                  <th className="px-6 py-4 font-medium">Valor</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {payables.map(pay => (
                  <tr key={pay.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-800 font-medium">{pay.description}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                        {pay.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{new Date(pay.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-right font-bold text-[#FF5C00]">{formatCurrency(pay.amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${pay.status === 'paid' ? 'bg-green-100 text-green-700' :
                        pay.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {pay.status === 'paid' ? 'Pago' : pay.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {pay.status === 'pending' && (
                        <button
                          onClick={() => handleMarkPayableAsPaid(pay.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                        >
                          Marcar como Pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Adicionar Conta a Receber */}
      {showAddReceivable && (
        <AddReceivableModal
          onClose={() => setShowAddReceivable(false)}
          onSave={async (data) => {
            try {
              const { createReceivable } = await import('./services/FinanceService');
              await createReceivable(data);
              setShowAddReceivable(false);
              await loadData();
            } catch (error) {
              alert('Erro ao criar conta a receber: ' + (error as Error).message);
            }
          }}
        />
      )}

      {/* Modal Adicionar Conta a Pagar */}
      {showAddPayable && (
        <AddPayableModal
          onClose={() => setShowAddPayable(false)}
          onSave={async (data) => {
            try {
              const { createPayable } = await import('./services/FinanceService');
              await createPayable(data);
              setShowAddPayable(false);
              await loadData();
            } catch (error) {
              alert('Erro ao criar conta a pagar: ' + (error as Error).message);
            }
          }}
        />
      )}
    </motion.div>
  );
}

// =====================
// MODAL ADICIONAR CONTA A RECEBER
// =====================

function AddReceivableModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao' | 'permuta' | 'outro'>('pix');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      orderId,
      orderNumber: parseInt(orderNumber) || 0,
      customerName,
      customerEmail,
      amount: parseFloat(amount) || 0,
      dueDate: new Date(dueDate),
      paymentMethod,
      description,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">Nova Conta a Receber</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Número do Pedido *</label>
              <input
                type="number"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="123"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ID do Pedido</label>
              <input
                type="text"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                placeholder="opcional"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Cliente *</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="João da Silva"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email do Cliente</label>
              <input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="joao@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vencimento *</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento *</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none bg-white"
              >
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="permuta">Permuta</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Observações sobre esta conta..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// =====================
// MODAL ADICIONAR CONTA A PAGAR
// =====================

function AddPayableModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'ingredientes' | 'embalagem' | 'fixo' | 'variavel' | 'servicos' | 'outros'>('ingredientes');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      description,
      category,
      amount: parseFloat(amount) || 0,
      dueDate: new Date(dueDate),
      supplier,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">Nova Conta a Pagar</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Compra de farinha - Fornecedor Silva"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none bg-white"
              >
                <option value="ingredientes">Ingredientes</option>
                <option value="embalagem">Embalagem</option>
                <option value="fixo">Custo Fixo</option>
                <option value="variavel">Custo Variável</option>
                <option value="servicos">Serviços</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fornecedor</label>
              <input
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="Ex: Distribuidora Silva"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vencimento *</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observações sobre esta conta..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SettingsContent({ user }: { user: FirebaseUser }) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAdmins = async () => {
    setLoadingAdmins(true);
    const data = await getAllAdmins();
    setAdmins(data);
    setLoadingAdmins(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAddAdmin = async () => {
    setError('');
    setSuccess('');

    if (!newAdminEmail.trim()) {
      setError('Digite o email do administrador.');
      return;
    }

    if (!newAdminEmail.includes('@')) {
      setError('Digite um email válido.');
      return;
    }

    setSaving(true);
    try {
      // Busca todos os admins e verifica se email já existe
      const allAdmins = await getAllAdmins();
      const existingAdmin = allAdmins.find(a => a.email.toLowerCase() === newAdminEmail.toLowerCase());

      if (existingAdmin) {
        setError('Este email já é administrador.');
        setSaving(false);
        return;
      }

      // Nota: Para adicionar um novo admin, a pessoa precisa:
      // 1. Fazer login no site pela primeira vez
      // 2. O sistema automaticamente cria o mapeamento via checkIsAdmin
      // 3. Volta aqui e adiciona como admin
      setError(
        'Para adicionar um novo administrador:\n\n' +
        '1. A pessoa deve fazer login no site primeiro\n' +
        '2. Após o login, o sistema registra automaticamente\n' +
        '3. Volte aqui em Configurações > Administradores\n' +
        '4. Adicione o email como administrador\n\n' +
        'OU\n\n' +
        'Use o Console do Firebase para encontrar o UID do usuário ' +
        'e adicione manualmente na coleção "admins"'
      );
    } catch (err) {
      console.error('Erro ao verificar admin:', err);
      setError('Erro ao verificar administrador. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = async (admin: Admin) => {
    // Impedir remover último admin
    if (admins.length === 1) {
      setError('Não é possível remover o último administrador.');
      return;
    }

    if (!confirm(`Tem certeza que deseja remover ${admin.email} dos administradores?`)) {
      return;
    }

    try {
      await removeAdmin(admin.id);
      setSuccess('Administrador removido com sucesso!');
      await loadAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erro ao remover admin:', err);
      setError('Erro ao remover administrador. Tente novamente.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Informações da Loja */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-6">Informações da Loja</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Loja</label>
                <input
                  type="text"
                  defaultValue="Campanini Sabores"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                <input
                  type="text"
                  defaultValue="+55 11 99193-8761"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Funcionamento</label>
                <input
                  type="text"
                  defaultValue="Seg - Sáb: 8h às 18h"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Gerenciamento de Administradores */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-800">Administradores</h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-[#FF5C00] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#E65100] transition-colors"
              >
                <Plus size={18} /> Adicionar Admin
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm whitespace-pre-line">
                {error}
                <button onClick={() => setError('')} className="ml-2 underline">Fechar</button>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm">
                {success}
              </div>
            )}

            {loadingAdmins ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-[#FF5C00]" />
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={40} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum administrador encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {admins.map(admin => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FF5C00]/10 rounded-full flex items-center justify-center">
                        <User size={20} className="text-[#FF5C00]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{admin.email}</p>
                        <p className="text-xs text-gray-500">
                          Adicionado em {admin.addedAt.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin)}
                      disabled={admins.length === 1}
                      className={`p-2 rounded-lg transition-colors ${admins.length === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                      title={admins.length === 1 ? 'Último admin não pode ser removido' : 'Remover admin'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-700">
                <strong className="block mb-1">Como adicionar um admin:</strong>
                1. A pessoa deve fazer login no site pela primeira vez (com Google)<br />
                2. Após o login, o usuário será criado no Firebase Auth<br />
                3. Volte aqui e clique em "Adicionar Admin"<br />
                4. Digite o email da pessoa e confirme
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Programas */}
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
                    <p className="text-xs text-gray-500">1 ponto por R$ 1,00</p>
                  </div>
                </div>
                <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bell size={20} className="text-[#FF5C00]" />
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

          {/* Integrações */}
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
                <button className="text-sm text-[#FF5C00] hover:underline">Gerenciar</button>
              </div>
            </div>
          </div>

          {/* Zona de Perigo */}
          <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
            <h3 className="font-semibold text-red-700 mb-4">Zona de Perigo</h3>
            <p className="text-sm text-red-600 mb-4">Estas ações são irreversíveis.</p>
            <button
              onClick={() => exportToCSV([], 'backup_dados')}
              className="w-full py-2 px-4 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Exportar Todos os Dados
            </button>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Admin */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Adicionar Administrador</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError('');
                  setNewAdminEmail('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email do Administrador *
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-700">
                  <strong>Importante:</strong> O usuário precisa ter feito login no site pelo menos uma vez para ser adicionado como admin.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError('');
                  setNewAdminEmail('');
                }}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddAdmin}
                disabled={saving || !newAdminEmail.trim()}
                className="flex-1 py-3 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {saving ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [imageError, setImageError] = useState('');
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
    setImageError('');
    setUploadProgress(null);
    const file = e.target.files?.[0];

    if (file) {
      // Validar arquivo
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setImageError(validation.error || 'Arquivo inválido');
        return;
      }

      setImageFile(file);

      // Preview
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
      image: image || ''
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
              className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-[#FF5C00] transition-colors"
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
                      setImageError('');
                      setUploadProgress(null);
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
                  <p className="text-xs mt-1 text-gray-400">JPG, PNG ou WebP (máx. 5MB)</p>
                </div>
              )}
            </div>

            {/* Informações do arquivo selecionado */}
            {imageFile && !uploading && (
              <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Check size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Imagem pronta para upload</p>
                    <p className="text-xs text-green-600">{formatFileSize(imageFile.size)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Barra de progresso do upload */}
            {uploading && uploadProgress && (
              <div className="mt-3 p-3 bg-[#FF5C00]/5 border border-[#FF5C00]/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#FF5C00]">Enviando imagem...</p>
                  <p className="text-xs font-bold text-[#FF5C00]">{uploadProgress.percentage}%</p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF5C00] to-[#FFB800] rounded-full transition-all"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Mensagem de erro */}
            {imageError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle size={16} />
                {imageError}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={uploading}
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o produto..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all resize-none"
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'tradicional' | 'fit')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all bg-white"
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
                  className="px-3 py-1 bg-[#FFF7F2] text-[#FF5C00] rounded-full text-sm flex items-center gap-1"
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
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
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
              className="flex-1 py-3 px-4 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono uppercase focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de desconto</label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setType('percentage')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${type === 'percentage' ? 'bg-[#FF5C00] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setType('fixed')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${type === 'fixed' ? 'bg-[#FF5C00] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
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
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
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
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
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
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Limite de usos</label>
              <select
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all bg-white"
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
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all bg-white"
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
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none transition-all"
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
              className="flex-1 py-3 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
          <p className="text-2xl font-bold text-[#FF5C00]">{activeCoupons.length}</p>
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[#FF5C00] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF5C00] text-white text-xs font-medium rounded-lg hover:bg-[#E65100] transition-colors"
            >
              <Plus size={14} />
              Novo Cupom
            </button>
          </div>
        </div>

        {loadingCoupons ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-[#FF5C00]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Ticket size={64} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500">Nenhum cupom {filter === 'active' ? 'ativo' : filter === 'inactive' ? 'inativo' : ''}</p>
            <button onClick={onAddNew} className="mt-4 text-[#FF5C00] hover:underline font-medium">
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${!coupon.active ? 'bg-gray-100 text-gray-500' :
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
                      className="p-2 text-gray-400 hover:text-[#FF5C00] hover:bg-gray-100 rounded-lg transition-colors"
                      title="Ver relatório"
                    >
                      <BarChart3 size={16} />
                    </button>
                    <button
                      onClick={() => onToggleActive(coupon)}
                      className={`p-2 rounded-lg transition-colors ${coupon.active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      title={coupon.active ? 'Desativar' : 'Ativar'}
                    >
                      {coupon.active ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    </button>
                    <button
                      onClick={() => onEdit(coupon)}
                      className="p-2 text-gray-400 hover:text-[#FF5C00] hover:bg-gray-100 rounded-lg transition-colors"
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
        <div className="bg-gradient-to-br from-[#FFF7F2] to-[#FFF3E0] rounded-2xl p-5 border border-[#FFB800]/20">
          <p className="text-sm text-[#8C7066] mb-1">Pontos em Circulação</p>
          <p className="text-2xl font-bold text-[#FFB800]">{stats.totalPointsActive.toLocaleString()}</p>
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
          <p className="text-sm text-[#FF5C00] mb-1">Clientes Ativos</p>
          <p className="text-2xl font-bold text-[#FF5C00]">{stats.customersWithPoints}</p>
          <p className="text-xs text-blue-500 mt-1">com pontos acumulados</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
          <p className="text-sm text-[#FF5C00] mb-1">Total de Pedidos</p>
          <p className="text-2xl font-bold text-[#FF5C00]">{stats.totalOrders}</p>
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
                    <div className="w-10 h-10 rounded-full bg-[#FFF7F2] flex items-center justify-center text-[#FF5C00] font-bold text-sm">
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
                          <span className="text-[#FF5C00]">+{customer.pointsToNextTier} pts para {nextTier.label}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#FFB800]">{customer.loyaltyPoints}</p>
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
                <div key={tier.label} className="bg-[#FFF7F2] border border-[#FFB800]/20 rounded-xl p-3">
                  <p className="text-sm font-medium text-[#3D2A24]">
                    {nearCustomers.length} cliente{nearCustomers.length > 1 ? 's' : ''} faltando até {tier.label}
                  </p>
                  <div className="mt-1 space-y-1">
                    {nearCustomers.slice(0, 3).map(c => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate">{c.name || c.email}</span>
                        <span className="text-[#FF5C00] font-bold flex-shrink-0 ml-2">
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

      <div className="bg-gradient-to-r from-[#FFF7F2] to-[#FFF3E0] rounded-2xl p-6 border border-[#FFB800]/20">
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Descrição (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Leve 3, pague 2 em esfihas tradicionais"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de promoção *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setType('combo')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${type === 'combo'
                    ? 'border-[#FF5C00] bg-[#FFF7F2] text-[#FF5C00]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                >
                  Combo (kit de produtos)
                </button>
                <button
                  type="button"
                  onClick={() => setType('discount')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${type === 'discount'
                    ? 'border-[#FF5C00] bg-[#FFF7F2] text-[#FF5C00]'
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
                      className="text-sm text-[#FF5C00] hover:underline flex items-center gap-1"
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
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
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
                      className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Validade</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
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
                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${applicableProducts.includes(p.id)
                          ? 'border-[#FF5C00] bg-[#FFF7F2] text-[#FF5C00]'
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
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium ${discountType === 'percentage'
                        ? 'border-[#FF5C00] bg-[#FFF7F2] text-[#FF5C00]'
                        : 'border-gray-200 text-gray-500'
                        }`}
                    >
                      Percentual (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium ${discountType === 'fixed'
                        ? 'border-[#FF5C00] bg-[#FFF7F2] text-[#FF5C00]'
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
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none ${discountType === 'fixed' ? 'pl-12' : 'pr-10'}`}
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Validade</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Limite de pedidos (opcional)</label>
                  <input
                    type="number"
                    value={maxOrders}
                    onChange={e => setMaxOrders(e.target.value)}
                    placeholder="Ilimitado"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
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
              className="flex-1 py-3 px-4 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] transition-colors"
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
            <div className="w-10 h-10 bg-[#FF5C00]/10 rounded-xl flex items-center justify-center">
              <PackageSearch size={20} className="text-[#FF5C00]" />
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
              <TrendingUp size={20} className="text-[#FF5C00]" />
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
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f
                ? 'bg-[#FF5C00] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Inativas'}
            </button>
          ))}
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] transition-colors"
        >
          <Plus size={18} />
          Nova Promoção
        </button>
      </div>

      {loadingPromotions ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[#FF5C00]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <PackageSearch size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {filter === 'all' ? 'Nenhuma promoção cadastrada.' : `Nenhuma promoção ${filter === 'active' ? 'ativa' : 'inativa'}.`}
          </p>
          {filter === 'all' && (
            <button onClick={onAddNew} className="mt-4 text-[#FF5C00] hover:underline">
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
                className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${!promo.active || isExpired ? 'border-gray-100 opacity-60' : 'border-gray-200'
                  }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${promo.type === 'combo'
                        ? 'bg-[#FF5C00]/10 text-[#FF5C00]'
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
                      className="p-2 text-gray-400 hover:text-[#FF5C00] hover:bg-[#FFF7F2] rounded-lg transition-colors"
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
                  <div className="bg-[#FFF7F2] rounded-xl p-3 mb-3">
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
                          <span className="text-lg font-bold text-[#FF5C00]">
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
                  className={`mt-3 w-full py-2 rounded-xl text-sm font-medium transition-colors ${promo.active
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

// --- Banners Content ---
function BannersContent({
  banners,
  loading,
  onAddNew,
  onEdit,
  onDelete,
  onToggleActive
}: {
  banners: Banner[];
  loading: boolean;
  onAddNew: () => void;
  onEdit: (banner: Banner) => void;
  onDelete: (id: string) => void;
  onToggleActive: (banner: Banner) => void;
}) {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Banners Rotativos</h3>
          <p className="text-sm text-gray-500">Gerencie os banners que aparecem no topo do cardápio</p>
        </div>
        <button
          onClick={onAddNew}
          className="bg-[#FF5C00] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#FF5C00]/20 hover:scale-105 transition-transform"
        >
          <Plus size={20} />
          Novo Banner
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-[#FF5C00]" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-3xl overflow-hidden shadow-sm border-2 transition-all ${banner.active ? 'border-transparent' : 'border-gray-100 grayscale'
                }`}
            >
              <div className="relative h-48 bg-gray-100">
                <img
                  src={banner.image}
                  alt={banner.title || 'Banner'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => onToggleActive(banner)}
                    className={`p-2 rounded-xl shadow-lg transition-colors ${banner.active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                      }`}
                    title={banner.active ? 'Desativar' : 'Ativar'}
                  >
                    {banner.active ? <Check size={18} /> : <X size={18} />}
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-gray-800 line-clamp-1">
                      {banner.title || 'Sem título'}
                    </h4>
                    {banner.subtitle && (
                      <p className="text-sm text-gray-500 line-clamp-1">{banner.subtitle}</p>
                    )}
                    <p className="text-sm text-gray-400">Ordem: {banner.order}</p>
                  </div>
                </div>
                {banner.link && (
                  <p className="text-xs text-[#FF5C00] mb-4 truncate">
                    Link: {banner.link}
                  </p>
                )}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => onEdit(banner)}
                    className="flex-1 bg-gray-50 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit size={18} />
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(banner.id)}
                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {banners.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon size={40} className="text-gray-300" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">Nenhum banner encontrado</h4>
              <p className="text-gray-500">Comece adicionando seu primeiro banner rotativo.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Banner Modal ---
function BannerModal({
  banner,
  onSave,
  onClose
}: {
  banner: Banner | null;
  onSave: (data: Omit<Banner, 'id' | 'createdAt'>, file?: File) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    tag: banner?.tag || '',
    link: banner?.link || '',
    order: banner?.order || 0,
    active: banner?.active ?? true,
    image: banner?.image || ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(banner?.image || null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      alert('Por favor, selecione uma imagem.');
      return;
    }
    onSave(formData as any, imageFile || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full p-8 md:p-12 my-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
            {banner ? 'Editar Banner' : 'Novo Banner'}
          </h2>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Título (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-50 border-0 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#FF5C00] transition-all"
                  placeholder="Ex: Promoção de Verão"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Tag (Opcional - Ex: EXCLUSIVO CAMPANINI)
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="w-full bg-gray-50 border-0 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#FF5C00] transition-all"
                  placeholder="Ex: EXCLUSIVO CAMPANINI"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Link (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full bg-gray-50 border-0 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#FF5C00] transition-all"
                  placeholder="Ex: /category/fit"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Subtítulo (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full bg-gray-50 border-0 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#FF5C00] transition-all"
                  placeholder="Ex: Aproveite nossa oferta especial"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Ordem
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border-0 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#FF5C00] transition-all"
                    required
                  />
                </div>
                <div className="flex items-end pb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-6 h-6 rounded-lg text-[#FF5C00] focus:ring-[#FF5C00] border-gray-300"
                    />
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Ativo</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Imagem do Banner
              </label>
              <div
                onClick={() => document.getElementById('banner-image-upload')?.click()}
                className="aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] overflow-hidden cursor-pointer hover:border-[#FF5C00]/50 hover:bg-[#FF5C00]/5 transition-all flex flex-col items-center justify-center group relative"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white font-bold flex items-center gap-2">
                        <Camera size={20} /> Alterar Imagem
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                      <Camera size={32} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-500 text-center px-6">
                      Clique para selecionar<br />ou arraste a imagem
                    </p>
                  </>
                )}
                <input
                  id="banner-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center font-medium uppercase tracking-widest">
                Recomendado: 1200x400px (3:1)
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-50 text-gray-600 py-5 rounded-[24px] font-bold hover:bg-gray-100 transition-all border border-transparent active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] bg-gradient-to-r from-[#FF5C00] to-[#E65100] text-white py-5 rounded-[24px] font-bold shadow-xl shadow-[#FF5C00]/30 hover:shadow-[#FF5C00]/40 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Check size={24} />
              {banner ? 'Salvar Alterações' : 'Criar Banner'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ManualOrderModal({
  products,
  onSave,
  onClose,
}: {
  products: Product[];
  onSave: (data: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerObs: string;
    items: { productId: string; quantity: number }[];
    total: number;
    paymentMethod: 'pix' | 'dinheiro' | 'cartao' | 'permuta' | 'outro';
    deliveryDate?: string;
  }) => void;
  onClose: () => void;
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerObs, setCustomerObs] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao' | 'permuta' | 'outro'>('pix');
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getProductName = (productId: string) =>
    products.find(p => p.id === productId)?.name || 'Produto';

  const getProductPrice = (productId: string) =>
    products.find(p => p.id === productId)?.price || 0;

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return;

    const existingItemIndex = orderItems.findIndex(item => item.productId === selectedProduct);
    if (existingItemIndex >= 0) {
      const newItems = [...orderItems];
      newItems[existingItemIndex].quantity += quantity;
      setOrderItems(newItems);
    } else {
      setOrderItems([...orderItems, { productId: selectedProduct, quantity }]);
    }
    setSelectedProduct('');
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      return total + (getProductPrice(item.productId) * item.quantity);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    if (orderItems.length === 0) {
      alert('Adicione pelo menos um item ao pedido.');
      return;
    }

    onSave({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      customerObs: customerObs.trim(),
      items: orderItems,
      total: calculateTotal(),
      paymentMethod,
      deliveryDate: deliveryDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Novo Pedido Manual</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dados do Cliente */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <User size={18} />
              Dados do Cliente
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Cliente *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Telefone/WhatsApp *</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Endereço de Entrega *</label>
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Ex: Rua das Flores, 123 - Centro"
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
              <textarea
                value={customerObs}
                onChange={(e) => setCustomerObs(e.target.value)}
                placeholder="Ex: Sem cebola, entregar na portaria..."
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none resize-none"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data de Entrega</label>
                <input
                  type="datetime-local"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none bg-white"
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="permuta">Permuta</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <ShoppingBag size={18} />
              Itens do Pedido
            </h4>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Produto</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none bg-white"
                >
                  <option value="">Selecione um produto</option>
                  {products.filter(p => p.active).map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-2">Qtd</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedProduct}
                className="px-4 py-3 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={18} />
                Adicionar
              </button>
            </div>

            {/* Lista de Itens */}
            {orderItems.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-4">
                  <div className="col-span-6">Produto</div>
                  <div className="col-span-2 text-center">Qtd</div>
                  <div className="col-span-2 text-right">Preço</div>
                  <div className="col-span-2 text-center">Ações</div>
                </div>
                <div className="divide-y divide-gray-100">
                  {orderItems.map((item, index) => (
                    <div key={index} className="px-4 py-3 grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-6 text-gray-800">{getProductName(item.productId)}</div>
                      <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
                      <div className="col-span-2 text-right font-medium text-[#FF5C00]">
                        {formatCurrency(getProductPrice(item.productId) * item.quantity)}
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Total do Pedido:</span>
                  <span className="text-xl font-bold text-[#FF5C00]">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#FF5C00] text-white rounded-xl font-medium hover:bg-[#E65100] transition-colors flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Registrar Pedido
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
