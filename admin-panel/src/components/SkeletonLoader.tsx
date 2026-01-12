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

// Table skeleton for admin pages
export const TableSkeleton = ({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
    <div className="p-4 border-b border-gray-200">
      <SkeletonLoader variant="text" width="200px" />
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonLoader key={j} variant="text" width={j === 0 ? "150px" : "100px"} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Card skeleton for admin pages
export const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
    <SkeletonLoader variant="rect" className="w-full h-48 mb-4" />
    <SkeletonLoader variant="text" lines={2} className="mb-2" />
    <SkeletonLoader variant="text" width="60%" />
  </div>
);







