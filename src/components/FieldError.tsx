import React from 'react';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FieldErrorProps {
  error: string | null;
}

export default function FieldError({ error }: FieldErrorProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="flex items-center gap-1 mt-1 text-xs text-red-500"
        >
          <AlertCircle size={12} />
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
