import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Report } from '@/types';
import { SKIN_PARAMETERS } from '@/lib/constants';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AndroidPageHeader } from '@/components/AndroidBackButton';
import { getActiveParameters, getProductsForParameter, ParameterProduct } from '@/services/productService';
import { toast } from 'sonner';

// Development mode check for conditional logging
const isDev = import.meta.env.DEV;
const log = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Map old severity levels (from AI analysis) to new severity levels (in database)
 * Old: Mild, Moderate, Severe
 * New: Low, Medium, High
 */
const mapSeverityToDatabase = (severity: string): string => {
  const mapping: Record<string, string> = {
    'Mild': 'Low',
    'Moderate': 'Medium',
    'Severe': 'High',
    'Low': 'Low',
    'Medium': 'Medium',
    'High': 'High',
  };
  return mapping[severity] || severity;
};

/**
 * Map database severity levels back to display format
 */
const mapSeverityToDisplay = (severity: string): string => {
  const mapping: Record<string, string> = {
    'Low': 'Low',
    'Medium': 'Medium',
    'High': 'High',
    'Mild': 'Low',
    'Moderate': 'Medium',
    'Severe': 'High',
  };
  return mapping[severity] || severity;
};

// Memoized severity color function
const getSeverityColor = (severity: 'Mild' | 'Medium' | 'Severe' | 'Low' | 'High' | 'N/A') => {
  const normalizedSeverity = mapSeverityToDisplay(severity);
  switch (normalizedSeverity) {
    case 'Low':
    case 'Mild': return 'bg-green-400 text-green-800';
    case 'Medium':
    case 'Moderate': return 'bg-yellow-400 text-yellow-800';
    case 'High':
    case 'Severe': return 'bg-red-500 text-red-100';
    default: return 'bg-gray-400 text-gray-800';
  }
};

const getRatingColor = (rating: number) => {
  if (rating <= 3) return 'bg-green-500';
  if (rating <= 6) return 'bg-yellow-500';
  if (rating <= 8) return 'bg-orange-500';
  return 'bg-red-500';
};

// Optimized parameter matching with normalized name caching
const normalizeParameterName = (name: string): string => {
  return name.toLowerCase().trim().replace(/[&]/g, 'and');
};

const matchParameter = (
  analysisParam: string,
  dbParamName: string,
  dbCategory?: string | null
): boolean => {
  const normalizedAnalysis = normalizeParameterName(analysisParam);
  const normalizedParamName = normalizeParameterName(dbParamName);
  const normalizedCategory = dbCategory ? normalizeParameterName(dbCategory) : '';
  
  return (
    normalizedParamName === normalizedAnalysis ||
    normalizedCategory === normalizedAnalysis ||
    normalizedParamName.includes(normalizedAnalysis) ||
    normalizedAnalysis.includes(normalizedParamName)
  );
};

interface ProductWithParameters extends ParameterProduct {
  matchedParameters: Array<{ parameterName: string; severity: string }>;
}

// Skeleton loader component for products
const ProductSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl p-5 shadow-md border border-amber-100 animate-pulse">
    <div className="flex flex-col gap-4">
      <div className="w-full h-48 bg-gray-200 rounded-lg"></div>
      <div className="flex flex-col gap-2">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="flex gap-2 mt-2">
          <div className="h-10 bg-gray-200 rounded flex-1"></div>
          <div className="h-10 bg-gray-200 rounded flex-1"></div>
        </div>
      </div>
    </div>
  </div>
);

// Memoized Product Card component to prevent unnecessary re-renders
const ProductCard = memo<ProductWithParameters>((product) => {
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=Product+Image';
  }, []);

  return (
    <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-amber-100">
      <div className="flex flex-col gap-4">
        {/* Product Image with lazy loading */}
        {product.product_image && (
          <div className="w-full h-48 bg-gray-50 rounded-lg shadow-md flex items-center justify-center overflow-hidden">
            <img 
              src={product.product_image} 
              alt={product.product_name}
              className="max-w-full max-h-full object-contain rounded-lg"
              loading="lazy"
              onError={handleImageError}
            />
          </div>
        )}
        
        {/* Product Details */}
        <div className="flex flex-col flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-800">{product.product_name}</h3>
            {product.is_primary && (
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ml-2">
                Perfect Match
              </span>
            )}
          </div>
          
          {/* Show which parameters triggered this product */}
          {product.matchedParameters && product.matchedParameters.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-amber-700 mb-1">Recommended for:</p>
              <div className="flex flex-wrap gap-1">
                {product.matchedParameters.map((match, idx) => (
                  <span 
                    key={idx}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${getSeverityColor(match.severity as any)}`}
                  >
                    {match.parameterName} ({match.severity})
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {product.product_description && (
            <p className="text-slate-700 text-sm leading-relaxed mb-3 line-clamp-2">
              {product.product_description}
            </p>
          )}
          
          {product.product_link && (
            <div className="flex gap-2 mt-auto">
              <a
                href={product.product_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition-colors text-sm"
              >
                Shop Now
              </a>
              <a
                href={product.product_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border-2 border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-2 px-4 rounded-lg text-center transition-colors text-sm"
              >
                Learn More
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

const EnhancedSkinAnalysisResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [isDownloading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<ProductWithParameters[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (location.state && location.state.report) {
      const reportData = location.state.report;
      log('📸 Report loaded:', {
        hasFaceImages: !!reportData.faceImages,
        faceImagesLength: reportData.faceImages?.length,
      });
      setReport(reportData);
    } else {
      navigate('/know-your-skin');
    }
  }, [location.state, navigate]);

  // Fetch products based on analysis parameters and track which parameters matched
  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      if (!report?.result?.parameters) {
        setLoadingProducts(false);
        return;
      }

      try {
        setLoadingProducts(true);
        
        // Get all active parameters from database
        const allParameters = await getActiveParameters();
        log('📋 All parameters from database:', allParameters.length);
        
        // Map to track which products came from which parameters
        const productMap = new Map<string, ProductWithParameters>();
        
        // Prepare all parameter matches and product fetch promises in parallel
        const fetchPromises: Array<Promise<void>> = [];
        
        for (const analysisParam of report.result.parameters) {
          // Skip if severity is N/A
          if (analysisParam.severity === 'N/A') {
            log(`⏭️ Skipping ${analysisParam.category} - severity is N/A`);
            continue;
          }
          
          // Find matching parameter using optimized matching function
          const dbParameter = allParameters.find(p => 
            matchParameter(analysisParam.category, p.parameter_name, p.category)
          );
          
          if (dbParameter) {
            log(`✅ Found parameter match: ${analysisParam.category} → ${dbParameter.parameter_name}`);
            
            // Map severity from analysis format to database format
            const mappedSeverity = mapSeverityToDatabase(analysisParam.severity);
            
            // Create promise for parallel fetching
            const fetchPromise = getProductsForParameter(dbParameter.id, mappedSeverity)
              .then(products => {
                log(`📦 Found ${products.length} products for ${dbParameter.parameter_name} (${mappedSeverity})`);
                
                // Add products to map, tracking which parameters matched
                for (const product of products) {
                  const existing = productMap.get(product.id);
                  if (existing) {
                    // Product already exists, add this parameter to the list
                    existing.matchedParameters.push({
                      parameterName: analysisParam.category,
                      severity: mapSeverityToDisplay(analysisParam.severity)
                    });
                  } else {
                    // New product, create entry with parameter info
                    productMap.set(product.id, {
                      ...product,
                      matchedParameters: [{
                        parameterName: analysisParam.category,
                        severity: mapSeverityToDisplay(analysisParam.severity)
                      }]
                    });
                  }
                }
              })
              .catch(error => {
                log(`❌ Error fetching products for ${dbParameter.parameter_name}:`, error);
              });
            
            fetchPromises.push(fetchPromise);
          } else {
            log(`❌ No parameter match found for: ${analysisParam.category}`);
          }
        }
        
        // Wait for all product fetches to complete in parallel
        await Promise.all(fetchPromises);
        
        // Convert map to array and sort by primary first, then display order
        const productsArray = Array.from(productMap.values()).sort((a, b) => {
          if (a.is_primary !== b.is_primary) {
            return a.is_primary ? -1 : 1;
          }
          return a.display_order - b.display_order;
        });
        
        log(`✅ Total products found: ${productsArray.length}`);
        
        // If no products found, try fallback (fetch for any severity level)
        if (productsArray.length === 0) {
          log('⚠️ No products found with exact matches, trying fallback...');
          
          const fallbackPromises: Array<Promise<void>> = [];
          
          for (const analysisParam of report.result.parameters) {
            if (analysisParam.severity === 'N/A') continue;
            
            const dbParameter = allParameters.find(p => 
              matchParameter(analysisParam.category, p.parameter_name, p.category)
            );
            
            if (dbParameter?.severity_levels?.length) {
              // Try all severity levels for this parameter
              for (const severity of dbParameter.severity_levels) {
                const fallbackPromise = getProductsForParameter(dbParameter.id, severity)
                  .then(fallbackProducts => {
                    for (const product of fallbackProducts) {
                      if (!productMap.has(product.id)) {
                        productMap.set(product.id, {
                          ...product,
                          matchedParameters: [{
                            parameterName: analysisParam.category,
                            severity: mapSeverityToDisplay(severity)
                          }]
                        });
                      }
                    }
                  })
                  .catch(error => {
                    log(`❌ Error in fallback fetch:`, error);
                  });
                
                fallbackPromises.push(fallbackPromise);
              }
            }
          }
          
          await Promise.all(fallbackPromises);
          
          const fallbackProducts = Array.from(productMap.values()).sort((a, b) => {
            if (a.is_primary !== b.is_primary) {
              return a.is_primary ? -1 : 1;
            }
            return a.display_order - b.display_order;
          });
          
          log(`🔄 Fallback found ${fallbackProducts.length} products`);
          setRecommendedProducts(fallbackProducts);
        } else {
          setRecommendedProducts(productsArray);
        }
      } catch (error) {
        console.error('❌ Error fetching recommended products:', error);
        toast.error('Failed to load recommended products. Please try again.');
      } finally {
        setLoadingProducts(false);
      }
    };

    if (report) {
      fetchRecommendedProducts();
    }
  }, [report]);

  // Extract report data safely (hooks must be called before early returns)
  const result = report?.result;
  const userData = report?.userData;
  const date = report?.date;
  const faceImages = report?.faceImages;
  
  // Memoize faceImages to prevent unnecessary re-renders (must be before early return)
  const memoizedFaceImages = useMemo(() => faceImages || [], [faceImages]);
  
  const handleStartNew = useCallback(() => {
    navigate('/know-your-skin');
  }, [navigate]);
  
  // Memoize sorted products to prevent unnecessary re-sorts (must be before early return)
  const sortedProducts = useMemo(() => {
    return [...recommendedProducts].sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1;
      }
      return a.display_order - b.display_order;
    });
  }, [recommendedProducts]);

  // Early return AFTER all hooks
  if (!report || !result || !userData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading report...</p>
      </div>
    );
  }
  
  log('📸 Displaying images:', {
    length: memoizedFaceImages?.length,
    isArray: Array.isArray(memoizedFaceImages)
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Android Material Design Header */}
      <AndroidPageHeader
        title="Skin Analysis Report"
        subtitle={`For: ${userData.name} | ${date}`}
        onBack={() => navigate(-1)}
      />
      
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">

        {/* Face Images - MOVED TO TOP */}
        {memoizedFaceImages && memoizedFaceImages.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Analysis Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memoizedFaceImages.map((image, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden shadow-md">
                  <img 
                    src={image} 
                    alt={`Analysis image ${index + 1}`}
                    className="w-full h-64 object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Summary */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className={`inline-block text-sm font-bold px-3 py-1 rounded-full mb-4 ${getSeverityColor(result.overallSeverity as any)}`}>
            Overall Concern: {mapSeverityToDisplay(result.overallSeverity)}
          </div>
          <p className="text-slate-600 leading-relaxed">{result.summary}</p>
        </div>

        {/* Parameters Analysis */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Detailed Analysis</h2>
          <div className="space-y-4">
            {SKIN_PARAMETERS.map((paramName) => {
              const paramData = result.parameters.find(p => p.category === paramName);
              if (!paramData) return null;

              return (
                <div key={paramName} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">{paramName}</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Rating:</span>
                        <div className={`w-12 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${getRatingColor(paramData.rating)}`}>
                          {paramData.rating}/10
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${getSeverityColor(paramData.severity as any)}`}>
                        {mapSeverityToDisplay(paramData.severity)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{paramData.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommended Products with Parameter Mapping */}
        {loadingProducts ? (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl shadow-lg border-2 border-amber-200">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <h2 className="text-2xl font-bold text-slate-800">Recommended Products for You</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl shadow-lg border-2 border-amber-200">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <h2 className="text-2xl font-bold text-slate-800">Recommended Products for You</h2>
              <span className="text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl shadow-lg border-2 border-amber-200">
            <div className="text-center py-8">
              <p className="text-amber-700">No products found for your analysis parameters.</p>
              <p className="text-sm text-amber-600 mt-2">Please configure products in Admin Panel → Know Your Skin → Products tab</p>
            </div>
          </div>
        )}

        {/* Routine */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Recommended Routine</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="text-amber-500">☀️</span> Morning Routine
              </h3>
              <ul className="space-y-2 text-slate-600">
                {result.routine.morning.map((step, i) => <li key={i} className="flex items-start gap-2"><span className="text-amber-500 mt-1">•</span><span>{step}</span></li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="text-indigo-500">🌙</span> Evening Routine
              </h3>
              <ul className="space-y-2 text-slate-600">
                {result.routine.evening.map((step, i) => <li key={i} className="flex items-start gap-2"><span className="text-indigo-500 mt-1">•</span><span>{step}</span></li>)}
              </ul>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Important Disclaimer</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                This analysis is based on AI-powered image analysis and questionnaire responses. 
                It is not a substitute for professional dermatological advice. 
                For serious skin concerns, please consult a qualified dermatologist.
              </p>
              <button
                onClick={() => setShowDisclaimer(!showDisclaimer)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                {showDisclaimer ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Learn More
                  </>
                )}
              </button>
              {showDisclaimer && (
                <div className="mt-3 text-sm text-blue-700 space-y-2">
                  <p>
                    The AI analysis considers visual patterns, user-reported concerns, and environmental factors. 
                    Results may vary based on lighting, image quality, and individual skin variations.
                  </p>
                  <p>
                    Product recommendations are suggestions based on your analysis. 
                    Always patch test new products and consult with a dermatologist if you have sensitive skin or allergies.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center pt-4 space-y-4">
          <button 
            onClick={handleStartNew}
            className="bg-karma-gold hover:bg-karma-gold/90 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-all transform hover:scale-105"
          >
            Start New Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSkinAnalysisResultsPage;
