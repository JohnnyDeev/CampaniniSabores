import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { registerWithEmail, loginWithEmail, resetPassword, formatAuthError } from '../services/AuthService';
import { createCustomer, getCustomer } from '../services/CustomerService';
import { Customer } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: import('firebase/auth').User, customer?: Customer) => void;
  mode?: 'login' | 'register';
}

export default function LoginModal({ isOpen, onClose, onLogin, mode: initialMode = 'login' }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const switchMode = (newMode: 'login' | 'register' | 'reset') => {
    resetForm();
    setMode(newMode);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      let customer = await getCustomer(result.user.uid);
      if (!customer) {
        customer = await createCustomer(
          result.user.uid,
          result.user.displayName || '',
          result.user.email || '',
          ''
        );
      }
      onLogin(result.user, customer || undefined);
      onClose();
    } catch (err: any) {
      setError(formatAuthError(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await loginWithEmail(email, password);
      const customer = await getCustomer(user.uid);
      onLogin(user, customer || undefined);
      onClose();
    } catch (err: any) {
      setError(formatAuthError(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const user = await registerWithEmail(name, email, password);
      const customer = await createCustomer(user.uid, name, email, phone);
      onLogin(user, customer);
      onClose();
    } catch (err: any) {
      setError(formatAuthError(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setError('');
      alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
      switchMode('login');
    } catch (err: any) {
      setError(formatAuthError(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2A24]/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative border border-[#F0E4DF]"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-[#8C7066] hover:text-[#3D2A24] hover:bg-[#FFF7F2] rounded-lg transition-colors"
            >
              <X size={20} />
            </button>

            {mode === 'login' && (
              <>
                <h2 className="text-2xl font-bold font-serif text-[#3D2A24] mb-1">Entrar na minha conta</h2>
                <p className="text-sm text-[#8C7066] mb-6">Acesse seus pedidos, endereços e pontos</p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    {error}
                  </div>
                )}

                <form onSubmit={handleEmailLogin} className="space-y-3 mb-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-4 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all text-[#3D2A24]"
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-4 pr-12 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all text-[#3D2A24]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C7066]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#FF5C00] to-[#E65100] text-white py-4 rounded-xl font-handwritten font-semibold text-lg shadow-lg shadow-[#FF5C00]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Entrar'}
                  </button>
                </form>

                <button
                  onClick={() => switchMode('reset')}
                  className="w-full text-sm text-[#FF5C00] mb-4 hover:underline"
                >
                  Esqueci minha senha
                </button>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-[#F0E4DF]"></div>
                  <span className="text-sm text-[#8C7066]">ou</span>
                  <div className="flex-1 h-px bg-[#F0E4DF]"></div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white border-2 border-[#F0E4DF] rounded-xl py-4 px-6 font-medium text-[#3D2A24] hover:bg-[#FFF7F2] hover:border-[#FFB800] transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Entrar com Google
                </button>

                <p className="text-center text-sm text-[#8C7066] mt-4">
                  Não tem conta?{' '}
                  <button onClick={() => switchMode('register')} className="text-[#FF5C00] font-semibold hover:underline">
                    Criar conta
                  </button>
                </p>
              </>
            )}

            {mode === 'register' && (
              <>
                <h2 className="text-2xl font-bold font-serif text-[#3D2A24] mb-1">Criar minha conta</h2>
                <p className="text-sm text-[#8C7066] mb-6">Cadastre-se e ganhe benefícios</p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    {error}
                  </div>
                )}

                <form onSubmit={handleEmailRegister} className="space-y-3 mb-4">
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-4 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all text-[#3D2A24]"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-4 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all text-[#3D2A24]"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp (opcional)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-4 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all text-[#3D2A24]"
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-4 pr-12 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all text-[#3D2A24]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C7066]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-4 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all text-[#3D2A24]"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#FF5C00] to-[#E65100] text-white py-4 rounded-xl font-handwritten font-semibold text-lg shadow-lg shadow-[#FF5C00]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Criar conta'}
                  </button>
                </form>

                <div className="bg-[#FFF7F2] rounded-xl p-4 mb-4 border border-[#F0E4DF]">
                  <p className="text-sm text-[#5D4037] font-medium mb-2">Ao criar conta, você:</p>
                  <ul className="text-xs text-[#8C7066] space-y-1">
                    <li>✦ Acompanha seus pedidos em tempo real</li>
                    <li>✦ Salva endereços para checkout rápido</li>
                    <li>✦ Acumula pontos de fidelidade</li>
                  </ul>
                </div>

                <p className="text-center text-sm text-[#8C7066]">
                  Já tem conta?{' '}
                  <button onClick={() => switchMode('login')} className="text-[#FF5C00] font-semibold hover:underline">
                    Fazer login
                  </button>
                </p>
              </>
            )}

            {mode === 'reset' && (
              <>
                <h2 className="text-2xl font-bold font-serif text-[#3D2A24] mb-1">Recuperar senha</h2>
                <p className="text-sm text-[#8C7066] mb-6">Enviaremos um email para você redefinir sua senha</p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    {error}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-3 mb-4">
                  <input
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-xl p-4 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all text-[#3D2A24]"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#FF5C00] to-[#E65100] text-white py-4 rounded-xl font-handwritten font-semibold text-lg shadow-lg shadow-[#FF5C00]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Enviar email'}
                  </button>
                </form>

                <p className="text-center text-sm text-[#8C7066]">
                  Lembrou a senha?{' '}
                  <button onClick={() => switchMode('login')} className="text-[#FF5C00] font-semibold hover:underline">
                    Fazer login
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

