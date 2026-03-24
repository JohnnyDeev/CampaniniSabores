import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Loader2, Send } from 'lucide-react';
import { Rating } from '../types';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (score: number, comment: string) => Promise<void>;
  productName: string;
}

export default function RatingModal({ isOpen, onClose, onSubmit, productName }: RatingModalProps) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredScore, setHoveredScore] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === 0) return;
    
    setLoading(true);
    try {
      await onSubmit(score, comment);
      onClose();
      // Reset form
      setScore(5);
      setComment('');
    } catch (error) {
      console.error('Error submitting rating:', error);
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

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FFF7F2] rounded-2xl mb-4">
                <Star size={32} className="text-[#FFB800] fill-[#FFB800]" />
              </div>
              <h2 className="text-2xl font-bold font-serif text-[#3D2A24] mb-1">Avaliar Produto</h2>
              <p className="text-sm text-[#8C7066]">O que você achou do {productName}?</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Estrelas */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHoveredScore(s)}
                    onMouseLeave={() => setHoveredScore(0)}
                    onClick={() => setScore(s)}
                    className="transition-transform active:scale-90"
                  >
                    <Star
                      size={40}
                      className={`transition-colors ${
                        (hoveredScore || score) >= s
                          ? 'text-[#FFB800] fill-[#FFB800]'
                          : 'text-[#F0E4DF] fill-none'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comentário */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#5D4037] ml-1">
                  Seu comentário (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Conte-nos sua experiência..."
                  rows={4}
                  className="w-full bg-[#FFF7F2] border border-[#F0E4DF] rounded-2xl p-4 focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] outline-none transition-all text-[#3D2A24] placeholder:text-[#8C7066]/50 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || score === 0}
                className="w-full bg-gradient-to-r from-[#FF5C00] to-[#E65100] text-white py-4 rounded-xl font-handwritten font-semibold text-lg shadow-lg shadow-[#FF5C00]/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    <Send size={20} />
                    Enviar Avaliação
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
