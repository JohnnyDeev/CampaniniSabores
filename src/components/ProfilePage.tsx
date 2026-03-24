import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, LogOut, Star, Package, Pencil, Loader2, Clock, CheckCircle2, ChefHat, Truck } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { db, auth, collection, getDocs } from '../firebase';
import { Customer, Address, Order, Product } from '../types';
import { getCustomer, updateCustomer } from '../services/CustomerService';
import { getOrdersByCustomer } from '../services/OrderService';
import AddressManager from './AddressManager';
import { toDate } from '../types';

interface ProfilePageProps {
  user: FirebaseUser;
  onBack: () => void;
  onLogout: () => void;
}

const LOYALTY_TIERS = [
  { min: 100, label: 'Bronze', discount: 5 },
  { min: 200, label: 'Prata', discount: 10 },
  { min: 500, label: 'Ouro', discount: 25 },
];

function getTier(points: number) {
  return LOYALTY_TIERS.slice().reverse().find(t => points >= t.min) || LOYALTY_TIERS[0];
}

function getNextTier(points: number) {
  return LOYALTY_TIERS.find(t => points < t.min);
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  novo: { label: 'Novo', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
  producao: { label: 'Em Produção', icon: ChefHat, color: 'text-amber-600', bg: 'bg-amber-100' },
  saiu: { label: 'Saiu', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-100' },
  entregue: { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' }
};

export default function ProfilePage({ user, onBack, onLogout }: ProfilePageProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState('');

  useEffect(() => {
    loadCustomer();
  }, [user.uid]);

  const loadCustomer = async () => {
    setLoading(true);
    const [customerData, ordersData] = await Promise.all([
      getCustomer(user.uid),
      getOrdersByCustomer(user.uid)
    ]);
    setCustomer(customerData);
    setOrders(ordersData);
    
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    const products: Record<string, Product> = {};
    productsSnapshot.docs.forEach(doc => {
      products[doc.id] = { id: doc.id, ...doc.data() } as Product;
    });
    setProductsMap(products);
    
    if (customerData) {
      setEditName(customerData.name);
      setEditPhone(customerData.phone);
    }
    setLoading(false);
    setLoadingOrders(false);
  };

  const handleSaveEdit = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      await updateCustomer(user.uid, { name: editName, phone: editPhone });
      setCustomer({ ...customer, name: editName, phone: editPhone });
      setEditing(false);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    onLogout();
  };

  const handleRescuePoints = (discount: number, points: number) => {
    const couponCode = `FIDELIDADE${discount}`;
    navigator.clipboard.writeText(couponCode);
    setCopiedCoupon(couponCode);
    setTimeout(() => setCopiedCoupon(''), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF7F2] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-[#FF5C00]" />
      </div>
    );
  }

  const tier = getTier(customer?.loyaltyPoints || 0);
  const nextTier = getNextTier(customer?.loyaltyPoints || 0);
  const nextDiscount = LOYALTY_TIERS.find(t => t.min > (customer?.loyaltyPoints || 0));
  const pointsNeeded = nextDiscount ? nextDiscount.min - (customer?.loyaltyPoints || 0) : 0;
  const rescueOptions = LOYALTY_TIERS.filter(t => (customer?.loyaltyPoints || 0) >= t.min);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-[#FFF7F2] max-w-2xl mx-auto px-4 py-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-2.5 bg-white rounded-xl shadow-md text-[#5D4037] transition-all hover:shadow-lg"
        >
          <ArrowLeft size={24} />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-serif text-[#3D2A24]">Meu Perfil</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-[#8C7066] hover:text-red-500 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-md shadow-[#F0E4DF]/50 mb-6 border border-[#F0E4DF]">
        <div className="flex items-center gap-4 mb-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full border-2 border-[#F0E4DF]" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#FF5C00] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{(customer?.name || user.displayName || 'U')[0].toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#FF5C00]/30 outline-none text-[#3D2A24]"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#FF5C00]/30 outline-none text-[#3D2A24]"
                />
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-[#3D2A24]">{customer?.name || user.displayName}</h2>
                <p className="text-sm text-[#8C7066]">{user.email}</p>
                {customer?.phone && <p className="text-sm text-[#8C7066]">{customer.phone}</p>}
              </>
            )}
          </div>
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-sm text-[#8C7066] hover:underline">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={saving} className="text-sm text-[#FF5C00] font-semibold hover:underline disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="p-2 text-[#8C7066] hover:text-[#FF5C00] transition-colors">
              <Pencil size={18} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-[#F0E4DF]">
          <div>
            <p className="text-2xl font-bold text-[#FF5C00]">{customer?.orderCount || 0}</p>
            <p className="text-xs text-[#8C7066]">Pedidos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#3D2A24]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer?.totalSpent || 0)}
            </p>
            <p className="text-xs text-[#8C7066]">Total gasto</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#FFB800]">{customer?.loyaltyPoints || 0}</p>
            <p className="text-xs text-[#8C7066]">Pontos</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-md shadow-[#F0E4DF]/50 mb-6 border border-[#F0E4DF]">
        <div className="flex items-center gap-2 mb-4">
          <Star size={20} className="text-[#FFB800] fill-[#FFB800]" />
          <h3 className="text-lg font-bold text-[#3D2A24]">Programa de Fidelidade</h3>
        </div>

        <div className="bg-gradient-to-r from-[#FFF7F2] to-[#FFF3E0] rounded-xl p-4 mb-4 border border-[#F0E4DF]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#3D2A24]">{customer?.loyaltyPoints || 0} pontos</span>
              <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${
                tier.label === 'Ouro' ? 'bg-[#FFD700] text-[#3D2A24]' :
                tier.label === 'Prata' ? 'bg-[#C0C0C0] text-[#3D2A24]' :
                'bg-[#CD7F32] text-white'
              }`}>{tier.label}</span>
            </div>
            <span className="text-sm text-[#8C7066]">= {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((customer?.loyaltyPoints || 0) / 100)}</span>
          </div>
          {nextTier && (
            <div>
              <div className="h-2 bg-[#F0E4DF] rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((customer?.loyaltyPoints || 0) / nextTier.min) * 100}%` }}
                  className="h-full bg-gradient-to-r from-[#FFB800] to-[#FF5C00] rounded-full"
                />
              </div>
              <p className="text-xs text-[#8C7066]">Faltam {pointsNeeded} pontos para {nextTier.label} ({nextTier.discount}% OFF)</p>
            </div>
          )}
        </div>

        {rescueOptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#3D2A24]">Resgatar pontos:</p>
            {rescueOptions.map(t => {
              const couponCode = `FIDELIDADE${t.discount}`;
              const isCopied = copiedCoupon === couponCode;
              return (
                <div key={t.min} className="flex items-center justify-between bg-[#F1F8E9] rounded-xl p-3 border border-[#C8E6C9]">
                  <div>
                    <span className="font-bold text-[#3D2A24]">{t.min} pontos</span>
                    <span className="text-[#7BA05B] ml-2">→ R$ {t.discount.toFixed(2)} OFF</span>
                  </div>
                  <button
                    onClick={() => handleRescuePoints(t.discount, t.min)}
                    className="px-3 py-1.5 bg-[#7BA05B] text-white text-xs font-medium rounded-lg hover:bg-[#6B8E4A] transition-colors"
                  >
                    {isCopied ? 'Cupom copiado!' : 'Resgatar'}
                  </button>
                </div>
              );
            })}
            {copiedCoupon && (
              <div className="bg-[#7BA05B] text-white rounded-xl p-3 text-center">
                <p className="text-sm font-medium">Use o cupom <strong>{copiedCoupon}</strong> no checkout!</p>
              </div>
            )}
          </div>
        )}

        {rescueOptions.length === 0 && (
          <p className="text-sm text-[#8C7066] text-center py-2">
            Acumule {LOYALTY_TIERS[0].min} pontos para resgatar seu primeiro desconto!
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-md shadow-[#F0E4DF]/50 mb-6 border border-[#F0E4DF]">
        <AddressManager
          addresses={customer?.addresses || []}
          uid={user.uid}
          onUpdate={(addresses) => setCustomer(prev => prev ? { ...prev, addresses } : null)}
        />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-md shadow-[#F0E4DF]/50 border border-[#F0E4DF]">
        <div className="flex items-center gap-2 mb-4">
          <Package size={20} className="text-[#FF5C00]" />
          <h3 className="text-lg font-bold text-[#3D2A24]">Histórico de Pedidos</h3>
        </div>
        
        {loadingOrders ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[#FF5C00]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <Package size={32} className="mx-auto text-[#F0E4DF] mb-2" />
            <p className="text-[#8C7066] text-sm">Você ainda não fez nenhum pedido</p>
            <p className="text-xs text-[#8C7066] mt-1">Faça seu primeiro pedido pelo site</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status];
              const StatusIcon = statusConfig.icon;
              const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
              
              const getProductName = (productId: string) => {
                const product = productsMap[productId];
                return product?.name || productId;
              };
              
              return (
                <div key={order.id} className="bg-[#FFF7F2] rounded-xl p-4 border border-[#F0E4DF]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-[#F0E4DF] px-2 py-1 rounded text-[#3D2A24]">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon size={10} />
                        {statusConfig.label}
                      </span>
                    </div>
                    <span className="text-xs text-[#8C7066]">
                      {toDate(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#3D2A24]">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</p>
                      <p className="text-xs text-[#8C7066]">
                        {order.items.slice(0, 2).map((item, i) => (
                          <span key={i}>{item.quantity}x {getProductName(item.productId)}{i < Math.min(order.items.length, 2) - 1 ? ', ' : ''}</span>
                        ))}
                        {order.items.length > 2 && <span> +{order.items.length - 2} mais</span>}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-[#FF5C00]">
                      R$ {order.total.toFixed(2)}
                    </span>
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

