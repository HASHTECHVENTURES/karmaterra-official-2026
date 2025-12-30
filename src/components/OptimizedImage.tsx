import { useState, useMemo } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  width?: number;
  height?: number;
  fallback?: string;
}

/**
 * Optimized image component with WebP support, responsive images, and error handling
 */
export const OptimizedImage = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  width,
  height,
  fallback = '/app-icon.png',
}: OptimizedImageProps) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Convert image URL to WebP if possible (for Supabase storage)
  const optimizedSrc = useMemo(() => {
    if (!src || error) return fallback;
    
    // If it's a Supabase storage URL, we can add transformations
    if (src.includes('supabase.co/storage')) {
      // Supabase supports image transformations via query params
      // Add format=webp if browser supports it
      const url = new URL(src);
      if (!url.searchParams.has('format')) {
        url.searchParams.set('format', 'webp');
      }
      // Add quality optimization
      if (!url.searchParams.has('quality')) {
        url.searchParams.set('quality', '80');
      }
      return url.toString();
    }
    
    return src;
  }, [src, error, fallback]);

  // Generate srcset for responsive images
  const srcSet = useMemo(() => {
    if (!src || error || src.includes('supabase.co/storage')) {
      // For Supabase, we can generate different sizes
      const sizes = [400, 800, 1200];
      return sizes
        .map((size) => {
          const url = new URL(optimizedSrc);
          url.searchParams.set('width', size.toString());
          return `${url.toString()} ${size}w`;
        })
        .join(', ');
    }
    return undefined;
  }, [optimizedSrc, src, error]);

  const handleError = () => {
    setError(true);
  };

  const handleLoad = () => {
    setLoaded(true);
  };

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading={loading}
        width={width}
        height={height}
        onError={handleError}
        onLoad={handleLoad}
        decoding="async"
      />
    </div>
  );
};






