import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Tag, Check, X, Loader2, Percent, Banknote } from 'lucide-react';
import { validateCoupon } from '../services/CouponService';
import type { Coupon } from '../types';

interface CouponInputProps {
  orderTotal: number;
  customerId?: string;
  customerEmail?: string;
  appliedCoupon: Coupon | null;
  appliedDiscount: number;
  onApply: (coupon: Coupon, discount: number) => void;
  onRemove: () => void;
}

export default function CouponInput({
  orderTotal,
  customerId,
  customerEmail,
  appliedCoupon,
  appliedDiscount,
  onApply,
  onRemove
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApply = async () => {
    if (loading) return;
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await validateCoupon(code, orderTotal, customerId, customerEmail);

    setLoading(false);

    if (!result.valid) {
      setError(result.error || 'Cupom inválido.');
      return;
    }

    setSuccess(`Cupom válido! Você ganha ${result.coupon!.type === 'percentage' ? `${result.coupon!.value}% OFF` : `R$ ${result.discount!.toFixed(2)} de desconto`}.`);
    onApply(result.coupon!, result.discount!);
  };

  const handleRemove = () => {
    setCode('');
    setError('');
    setSuccess('');
    onRemove();
  };

  if (appliedCoupon) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-3 bg-[#F1F8E9] rounded-xl border border-[#C8E6C9]"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#7BA05B] rounded-lg flex items-center justify-center">
            <Check size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#3D2A24]">{appliedCoupon.code}</p>
            <p className="text-xs text-[#7BA05B]">
              -{appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : `R$ ${appliedDiscount.toFixed(2)}`} de desconto
            </p>
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="p-1.5 text-[#8C7066] hover:text-red-500 transition-colors"
        >
          <X size={16} />
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7066]" />
          <input
            type="text"
            placeholder="Tem cupom? Digite aqui"
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase());
              setError('');
              setSuccess('');
            }}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
            disabled={loading}
            className="w-full pl-9 pr-3 py-3 bg-white border border-[#F0E4DF] rounded-xl text-sm text-[#3D2A24] placeholder:text-[#8C7066] focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all uppercase disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={!code.trim() || loading}
          className="px-4 py-3 bg-[#FF5C00] text-white text-sm font-medium rounded-xl hover:bg-[#E65100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-2 text-sm text-red-600"
        >
          <X size={14} />
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-2 text-sm text-[#7BA05B] font-medium"
        >
          <Check size={14} />
          {success}
        </motion.div>
      )}
    </div>
  );
}

