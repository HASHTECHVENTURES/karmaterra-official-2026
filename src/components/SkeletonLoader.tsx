interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'rect';
  width?: string;
  height?: string;
  lines?: number;
}

export const SkeletonLoader = ({ 
  className = '', 
  variant = 'rect',
  width,
  height,
  lines = 1
}: SkeletonLoaderProps) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variantClasses = {
    text: 'h-4',
    card: 'h-48',
    circle: 'rounded-full',
    rect: 'h-20'
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses.text} mb-2`}
            style={{ 
              width: i === lines - 1 ? '60%' : width || '100%',
              height: height || undefined
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width: width || undefined, height: height || undefined }}
    />
  );
};

// Card skeleton for blog posts, services, etc.
export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
    <SkeletonLoader variant="rect" className="w-full h-48 mb-4" />
    <SkeletonLoader variant="text" lines={2} className="mb-2" />
    <SkeletonLoader variant="text" width="60%" />
  </div>
);

// List skeleton for loading states
export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <SkeletonLoader variant="circle" width="48px" height="48px" />
        <div className="flex-1">
          <SkeletonLoader variant="text" className="mb-2" />
          <SkeletonLoader variant="text" width="70%" />
        </div>
      </div>
    ))}
  </div>
);


