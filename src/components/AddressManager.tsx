import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Pencil, Trash2, Star, MapPin, X, Check, Loader2 } from 'lucide-react';
import { Address } from '../types';
import { addAddress, updateAddress, removeAddress } from '../services/CustomerService';

interface AddressManagerProps {
  addresses: Address[];
  uid: string;
  onUpdate: (addresses: Address[]) => void;
}

export default function AddressManager({ addresses, uid, onUpdate }: AddressManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Omit<Address, 'id'>>({
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Santo André',
    state: 'SP',
    zipCode: '',
    isDefault: addresses.length === 0,
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      label: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: 'Santo André',
      state: 'SP',
      zipCode: '',
      isDefault: addresses.length === 0,
    });
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditingId(addr.id);
    setForm({
      label: addr.label,
      street: addr.street,
      number: addr.number,
      complement: addr.complement,
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      isDefault: addr.isDefault,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.street || !form.number || !form.neighborhood) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateAddress(uid, editingId, form);
        onUpdate(addresses.map(a => a.id === editingId ? { ...a, ...form } : a));
      } else {
        await addAddress(uid, form);
        const newAddr: Address = { ...form, id: `addr_${Date.now()}` };
        onUpdate([...addresses, newAddr]);
      }
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar endereço.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addrId: string) => {
    if (!confirm('Remover este endereço?')) return;
    try {
      await removeAddress(uid, addrId);
      onUpdate(addresses.filter(a => a.id !== addrId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (addr: Address) => {
    const updated = addresses.map(a => ({ ...a, isDefault: a.id === addr.id }));
    try {
      for (const a of updated) {
        await updateAddress(uid, a.id, { isDefault: a.isDefault });
      }
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#3D2A24]">Meus Endereços</h3>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-sm text-[#C75B48] font-medium hover:underline"
        >
          <Plus size={16} />
          Novo endereço
        </button>
      </div>

      {addresses.length === 0 && !showForm && (
        <div className="text-center py-8 bg-[#FFF8F5] rounded-2xl border border-[#F0E4DF]">
          <MapPin size={32} className="mx-auto text-[#F0E4DF] mb-2" />
          <p className="text-[#8C7066] text-sm">Nenhum endereço cadastrado</p>
          <button onClick={openNew} className="mt-2 text-[#C75B48] text-sm font-medium hover:underline">
            Adicionar primeiro endereço
          </button>
        </div>
      )}

      <div className="space-y-3">
        {addresses.map(addr => (
          <motion.div
            key={addr.id}
            layout
            className="bg-white rounded-xl p-4 border border-[#F0E4DF] shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {addr.isDefault ? (
                    <Star size={16} className="text-[#E8A849] fill-[#E8A849]" />
                  ) : (
                    <MapPin size={16} className="text-[#8C7066]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#3D2A24]">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-xs bg-[#FFF8F5] text-[#C75B48] px-2 py-0.5 rounded-full">Principal</span>
                    )}
                  </div>
                  <p className="text-sm text-[#8C7066] mt-0.5">
                    {addr.street}, {addr.number}
                    {addr.complement && `, ${addr.complement}`}
                  </p>
                  <p className="text-sm text-[#8C7066]">
                    {addr.neighborhood} — {addr.city}, {addr.state}
                  </p>
                  {addr.zipCode && (
                    <p className="text-xs text-[#8C7066] mt-0.5">CEP: {addr.zipCode}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr)}
                    className="p-1.5 text-[#8C7066] hover:text-[#E8A849] transition-colors"
                    title="Definir como principal"
                  >
                    <Star size={16} />
                  </button>
                )}
                <button
                  onClick={() => openEdit(addr)}
                  className="p-1.5 text-[#8C7066] hover:text-[#C75B48] transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="p-1.5 text-[#8C7066] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2A24]/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-[#F0E4DF] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold font-serif text-[#3D2A24]">
                  {editingId ? 'Editar Endereço' : 'Novo Endereço'}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 text-[#8C7066] hover:text-[#3D2A24]">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#8C7066] mb-1 block">Nome/Etiqueta *</label>
                  <input
                    type="text"
                    placeholder="Ex: Casa, Trabalho..."
                    value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })}
                    required
                    className="w-full bg-[#FFF8F5] border border-[#F0E4DF] rounded-xl p-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none text-sm text-[#3D2A24]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-[#8C7066] mb-1 block">Rua / Avenida *</label>
                    <input
                      type="text"
                      placeholder="Rua das Flores"
                      value={form.street}
                      onChange={e => setForm({ ...form, street: e.target.value })}
                      required
                      className="w-full bg-[#FFF8F5] border border-[#F0E4DF] rounded-xl p-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none text-sm text-[#3D2A24]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#8C7066] mb-1 block">Nº *</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={form.number}
                      onChange={e => setForm({ ...form, number: e.target.value })}
                      required
                      className="w-full bg-[#FFF8F5] border border-[#F0E4DF] rounded-xl p-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none text-sm text-[#3D2A24]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[#8C7066] mb-1 block">Complemento</label>
                    <input
                      type="text"
                      placeholder="Apto, Bloco..."
                      value={form.complement}
                      onChange={e => setForm({ ...form, complement: e.target.value })}
                      className="w-full bg-[#FFF8F5] border border-[#F0E4DF] rounded-xl p-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none text-sm text-[#3D2A24]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#8C7066] mb-1 block">CEP</label>
                    <input
                      type="text"
                      placeholder="09100-000"
                      value={form.zipCode}
                      onChange={e => setForm({ ...form, zipCode: e.target.value })}
                      className="w-full bg-[#FFF8F5] border border-[#F0E4DF] rounded-xl p-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none text-sm text-[#3D2A24]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[#8C7066] mb-1 block">Bairro *</label>
                    <input
                      type="text"
                      placeholder="Jardim Primavera"
                      value={form.neighborhood}
                      onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                      required
                      className="w-full bg-[#FFF8F5] border border-[#F0E4DF] rounded-xl p-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none text-sm text-[#3D2A24]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#8C7066] mb-1 block">Cidade</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })}
                      className="w-full bg-[#FFF8F5] border border-[#F0E4DF] rounded-xl p-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none text-sm text-[#3D2A24]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[#8C7066] mb-1 block">Estado</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={e => setForm({ ...form, state: e.target.value })}
                      maxLength={2}
                      className="w-full bg-[#FFF8F5] border border-[#F0E4DF] rounded-xl p-3 focus:ring-2 focus:ring-[#C75B48]/30 focus:border-[#C75B48] outline-none text-sm text-[#3D2A24]"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isDefault}
                        onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                        className="w-4 h-4 accent-[#C75B48]"
                      />
                      <span className="text-sm text-[#3D2A24]">Endereço principal</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#C75B48] to-[#A84838] text-white py-3 rounded-xl font-handwritten font-semibold text-lg shadow-lg shadow-[#C75B48]/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {editingId ? 'Salvar alterações' : 'Adicionar endereço'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
