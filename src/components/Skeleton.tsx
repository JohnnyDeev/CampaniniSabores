import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  borderRadius 
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]';
  
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
    borderRadius: borderRadius,
  };

  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-[#F0E4DF]">
      <Skeleton height="192px" />
      <div className="p-5 space-y-3">
        <Skeleton height="24px" width="70%" />
        <Skeleton height="48px" />
        <div className="flex justify-between items-center">
          <Skeleton height="32px" width="80px" />
          <Skeleton height="44px" width="120px" borderRadius="22px" />
        </div>
      </div>
    </div>
  );
}

export function ProductListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton width="200px" height="24px" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function BagItemSkeleton() {
  return (
    <div className="flex justify-between items-center border-b border-[#F0E4DF] pb-4">
      <div className="flex-1 space-y-2">
        <Skeleton height="20px" width="60%" />
        <Skeleton height="16px" width="30%" />
      </div>
      <Skeleton height="24px" width="60px" />
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-[#FFF8F5] rounded-xl p-4 border border-[#F0E4DF]">
      <div className="flex justify-between mb-3">
        <Skeleton height="20px" width="100px" />
        <Skeleton height="16px" width="60px" />
      </div>
      <div className="flex justify-between">
        <Skeleton height="16px" width="80px" />
        <Skeleton height="24px" width="60px" />
      </div>
    </div>
  );
}

export function ComboCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-[#FFF8F5] to-[#FFF3E0] rounded-2xl p-4 border border-[#E8A849]/30">
      <div className="flex justify-between mb-3">
        <Skeleton height="20px" width="70%" />
        <Skeleton height="24px" width="50px" />
      </div>
      <Skeleton height="16px" width="90%" className="mb-2" />
      <Skeleton height="16px" width="60%" className="mb-4" />
      <Skeleton height="44px" borderRadius="22px" />
    </div>
  );
}
