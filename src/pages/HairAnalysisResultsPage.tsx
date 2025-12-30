import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Report } from '../types';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { HairAnalysisResult } from '../services/geminiServiceEdge';
import { AndroidPageHeader } from '../components/AndroidBackButton';
import { 
  getAllHairProductsList, 
  HairProduct,
  getActiveHairParameters,
  getHairProductsForParameter,
  HairParameterProduct
} from '../services/hairService';
import { toast } from 'sonner';

const getSeverityColor = (severity: 'Mild' | 'Medium' | 'Severe' | 'N/A') => {
  switch (severity) {
    case 'Mild': return 'bg-green-100 text-green-700 border-green-300';
    case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'Severe': return 'bg-red-100 text-red-700 border-red-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const getRatingColor = (rating: number) => {
  if (rating <= 3) return 'bg-green-500';
  if (rating <= 6) return 'bg-yellow-500';
  if (rating <= 8) return 'bg-orange-500';
  return 'bg-red-500';
};

const HairAnalysisResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [fullHairResult, setFullHairResult] = useState<HairAnalysisResult | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<Array<HairParameterProduct & { matchedParameters: Array<{ parameterName: string; severity: string }> }>>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [hairImages, setHairImages] = useState<string[]>([]);
  const [adminParameters, setAdminParameters] = useState<any[]>([]);

  useEffect(() => {
    if (location.state && location.state.report) {
      setReport(location.state.report);
      if (location.state.fullHairResult) {
        setFullHairResult(location.state.fullHairResult);
      }
      // Get hair images if available
      if (location.state.hairImages) {
        setHairImages(location.state.hairImages);
      } else if (location.state.report?.hairImages) {
        setHairImages(location.state.report.hairImages);
      } else if (location.state.report?.faceImages) {
        // Fallback to faceImages (used for both skin and hair)
        setHairImages(location.state.report.faceImages);
      }
    } else {
      navigate('/hair-analysis');
    }
  }, [location.state, navigate]);

  // Map severity from AI format to database format
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

  // Map database severity levels back to display format
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

  // Map hair analysis results to configured parameters
  const mapHairAnalysisToParameters = (hairAnalysis: any): Array<{ parameterName: string; severity: string; rating?: number }> => {
    const parameters: Array<{ parameterName: string; severity: string; rating?: number }> = [];
    
    // Map AI analysis sections to configured parameters
    const potentialIssues = hairAnalysis?.["4. Potential Issues"];
    const scalpHealth = hairAnalysis?.["2. Scalp Health and Condition"];
    const hairTexture = hairAnalysis?.["3. Hair Texture and Quality"];
    
    // Dandruff
    if (potentialIssues?.dandruff && potentialIssues?.severity && potentialIssues.severity !== 'N/A') {
      parameters.push({
        parameterName: 'Dandruff',
        severity: potentialIssues.severity,
        rating: potentialIssues.rating
      });
    }
    
    // Frizzy Hair (from texture/quality)
    if (hairTexture?.severity && hairTexture.severity !== 'N/A') {
      // Check if texture indicates frizz
      const textureLower = (hairTexture.texture || '').toLowerCase();
      const qualityLower = (hairTexture.quality || '').toLowerCase();
      if (textureLower.includes('frizz') || qualityLower.includes('frizz') || 
          textureLower.includes('unruly') || qualityLower.includes('unruly')) {
        parameters.push({
          parameterName: 'Frizzy Hair',
          severity: hairTexture.severity,
          rating: hairTexture.rating
        });
      }
    }
    
    // Dry and Damaged Scalp
    if (scalpHealth?.dryness_or_oiliness || potentialIssues?.damage) {
      const hasDryness = (scalpHealth?.dryness_or_oiliness || '').toLowerCase().includes('dry');
      const hasDamage = potentialIssues?.damage;
      if (hasDryness || hasDamage) {
        const severity = scalpHealth?.severity || potentialIssues?.severity || 'Medium';
        if (severity !== 'N/A') {
          parameters.push({
            parameterName: 'Dry and Damaged Scalp',
            severity: severity,
            rating: scalpHealth?.rating || potentialIssues?.rating
          });
        }
      }
    }
    
    // Oily Scalp
    if (scalpHealth?.dryness_or_oiliness) {
      const oiliness = (scalpHealth.dryness_or_oiliness || '').toLowerCase();
      if (oiliness.includes('oily') || oiliness.includes('greasy')) {
        if (scalpHealth.severity && scalpHealth.severity !== 'N/A') {
          parameters.push({
            parameterName: 'Oily Scalp',
            severity: scalpHealth.severity,
            rating: scalpHealth.rating
          });
        }
      }
    }
    
    // Itchy Scalp (from redness/irritation)
    if (scalpHealth?.redness_or_irritation) {
      const irritation = (scalpHealth.redness_or_irritation || '').toLowerCase();
      if (irritation.includes('itch') || irritation.includes('irritat') || irritation.includes('redness')) {
        if (scalpHealth.severity && scalpHealth.severity !== 'N/A') {
          parameters.push({
            parameterName: 'Itchy Scalp',
            severity: scalpHealth.severity,
            rating: scalpHealth.rating
          });
        }
      }
    }
    
    return parameters;
  };

  // Fetch admin-configured parameters
  useEffect(() => {
    const fetchParameters = async () => {
      try {
        const params = await getActiveHairParameters();
        setAdminParameters(params);
        console.log('📋 Loaded admin parameters:', params.length);
      } catch (error) {
        console.error('❌ Error fetching admin parameters:', error);
      }
    };
    fetchParameters();
  }, []);

  // Fetch products based on analysis parameters
  useEffect(() => {
    const fetchProducts = async () => {
      if (!fullHairResult?.hair_analysis) {
        // Fallback to old method if no hair analysis data
        try {
          setLoadingProducts(true);
          const products = await getAllHairProductsList();
          setRecommendedProducts(products.map(p => ({ ...p, matchedParameters: [] })));
        } catch (error) {
          console.error('❌ Error fetching hair products:', error);
        } finally {
          setLoadingProducts(false);
        }
        return;
      }

      try {
        setLoadingProducts(true);
        
        // Get all active parameters from database
        const allParameters = await getActiveHairParameters();
        console.log('📋 All hair parameters from database:', allParameters.length);
        
        // Map hair analysis to configured parameters
        const analysisParameters = mapHairAnalysisToParameters(fullHairResult.hair_analysis);
        console.log('🔍 Mapped analysis parameters:', analysisParameters);
        
        // Map to track which products came from which parameters
        const productMap = new Map<string, HairParameterProduct & { matchedParameters: Array<{ parameterName: string; severity: string }> }>();
        
        // Fetch products for each parameter
        const fetchPromises: Array<Promise<void>> = [];
        
        for (const analysisParam of analysisParameters) {
          // Find matching parameter in database
          const dbParameter = allParameters.find(p => 
            p.parameter_name.toLowerCase() === analysisParam.parameterName.toLowerCase()
          );
          
          if (dbParameter) {
            console.log(`✅ Found parameter match: ${analysisParam.parameterName} → ${dbParameter.parameter_name}`);
            
            // Map severity from analysis format to database format
            const mappedSeverity = mapSeverityToDatabase(analysisParam.severity);
            
            // Fetch products for this parameter and severity
            const fetchPromise = getHairProductsForParameter(dbParameter.id, mappedSeverity)
              .then(products => {
                console.log(`📦 Found ${products.length} products for ${dbParameter.parameter_name} (${mappedSeverity})`);
                
                // Add products to map, tracking which parameters matched
                for (const product of products) {
                  const existing = productMap.get(product.id);
                  if (existing) {
                    // Product already exists, add this parameter to the list
                    existing.matchedParameters.push({
                      parameterName: analysisParam.parameterName,
                      severity: mapSeverityToDisplay(analysisParam.severity)
                    });
                  } else {
                    // New product, create entry with parameter info
                    productMap.set(product.id, {
                      ...product,
                      matchedParameters: [{
                        parameterName: analysisParam.parameterName,
                        severity: mapSeverityToDisplay(analysisParam.severity)
                      }]
                    });
                  }
                }
              })
              .catch(error => {
                console.error(`❌ Error fetching products for ${dbParameter.parameter_name}:`, error);
              });
            
            fetchPromises.push(fetchPromise);
          } else {
            console.log(`❌ No parameter match found for: ${analysisParam.parameterName}`);
          }
        }
        
        // Wait for all product fetches to complete
        await Promise.all(fetchPromises);
        
        // Convert map to array and sort by primary first, then display order
        const productsArray = Array.from(productMap.values()).sort((a, b) => {
          if (a.is_primary !== b.is_primary) {
            return a.is_primary ? -1 : 1;
          }
          return a.display_order - b.display_order;
        });
        
        console.log(`✅ Total products found: ${productsArray.length}`);
        
        // If no products found, try fallback (fetch for any severity level)
        if (productsArray.length === 0) {
          console.log('⚠️ No products found with exact matches, trying fallback...');
          
          const fallbackPromises: Array<Promise<void>> = [];
          
          for (const analysisParam of analysisParameters) {
            const dbParameter = allParameters.find(p => 
              p.parameter_name.toLowerCase() === analysisParam.parameterName.toLowerCase()
            );
            
            if (dbParameter?.severity_levels?.length) {
              // Try all severity levels for this parameter
              for (const severity of dbParameter.severity_levels) {
                const fallbackPromise = getHairProductsForParameter(dbParameter.id, severity)
                  .then(fallbackProducts => {
                    for (const product of fallbackProducts) {
                      if (!productMap.has(product.id)) {
                        productMap.set(product.id, {
                          ...product,
                          matchedParameters: [{
                            parameterName: analysisParam.parameterName,
                            severity: mapSeverityToDisplay(severity)
                          }]
                        });
                      }
                    }
                  })
                  .catch(error => {
                    console.error(`❌ Error in fallback fetch:`, error);
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
          
          console.log(`🔄 Fallback found ${fallbackProducts.length} products`);
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

    if (report && fullHairResult) {
      fetchProducts();
    }
  }, [report, fullHairResult]);

  if (!report) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading report...</p>
      </div>
    );
  }

  const { result, userData, date } = report;

  // Get mapped parameters that triggered product recommendations
  const getMappedParameters = () => {
    if (!fullHairResult?.hair_analysis) return [];
    return mapHairAnalysisToParameters(fullHairResult.hair_analysis);
  };

  const mappedParameters = getMappedParameters();

  return (
    <div className="min-h-screen bg-gray-50">
      <AndroidPageHeader
        title="Hair Analysis Report"
        subtitle={`For: ${userData.name} | ${date}`}
        onBack={() => navigate(-1)}
      />
      
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">

        {/* Hair Images - MOVED TO TOP */}
        {hairImages && hairImages.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Analysis Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hairImages.map((image, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden shadow-md">
                  <img 
                    src={image} 
                    alt={`Hair analysis image ${index + 1}`}
                    className="w-full h-64 object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Summary */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          {fullHairResult && (
            <>
              <div className={`inline-block text-sm font-bold px-3 py-1 rounded-full mb-4 ${getSeverityColor(fullHairResult.overallSeverity)}`}>
                Overall Concern: {fullHairResult.overallSeverity}
              </div>
              <p className="text-slate-600 leading-relaxed">{fullHairResult.summary}</p>
            </>
          )}
        </div>

        {/* Detailed Analysis - Use admin-configured parameters */}
        {fullHairResult && adminParameters.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Detailed Analysis</h2>
            <div className="space-y-6">
              {adminParameters
                .filter(param => param.is_active)
                .sort((a, b) => a.display_order - b.display_order)
                .map((param) => {
                  // Try to find matching data from AI analysis
                  const paramNameLower = param.parameter_name.toLowerCase();
                  let analysisData: any = null;
                  let rating = 5;
                  let severity: 'Mild' | 'Medium' | 'Severe' = 'Medium';
                  let description = 'Analysis pending';
                  
                  // Map admin parameter to AI analysis sections
                  if (paramNameLower.includes('dandruff')) {
                    analysisData = fullHairResult.hair_analysis["4. Potential Issues"];
                    if (analysisData?.dandruff) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = analysisData.dandruff || analysisData.notes || '';
                    }
                  } else if (paramNameLower.includes('frizz')) {
                    analysisData = fullHairResult.hair_analysis["3. Hair Texture and Quality"];
                    if (analysisData) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = analysisData.notes || '';
                    }
                  } else if (paramNameLower.includes('dry') && paramNameLower.includes('damage')) {
                    const scalpData = fullHairResult.hair_analysis["2. Scalp Health and Condition"];
                    const issuesData = fullHairResult.hair_analysis["4. Potential Issues"];
                    analysisData = scalpData || issuesData;
                    if (analysisData) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = analysisData.notes || issuesData?.damage || scalpData?.dryness_or_oiliness || '';
                    }
                  } else if (paramNameLower.includes('oily')) {
                    analysisData = fullHairResult.hair_analysis["2. Scalp Health and Condition"];
                    if (analysisData?.dryness_or_oiliness) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = analysisData.dryness_or_oiliness || analysisData.notes || '';
                    }
                  } else if (paramNameLower.includes('itch')) {
                    analysisData = fullHairResult.hair_analysis["2. Scalp Health and Condition"];
                    if (analysisData?.redness_or_irritation) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = analysisData.redness_or_irritation || analysisData.notes || '';
                    }
                  } else if (paramNameLower.includes('hair loss') || paramNameLower.includes('hairloss')) {
                    analysisData = fullHairResult.hair_analysis["4. Potential Issues"];
                    if (analysisData?.hair_loss) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = analysisData.hair_loss || analysisData.notes || '';
                    }
                  } else if (paramNameLower.includes('density') || paramNameLower.includes('thickness')) {
                    analysisData = fullHairResult.hair_analysis["1. Hair Density and Thickness"];
                    if (analysisData) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = `${analysisData.density || ''} ${analysisData.thickness || ''}`.trim() || analysisData.notes || '';
                    }
                  } else if (paramNameLower.includes('scalp') && paramNameLower.includes('health')) {
                    analysisData = fullHairResult.hair_analysis["2. Scalp Health and Condition"];
                    if (analysisData) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = analysisData.condition || analysisData.notes || '';
                    }
                  } else if (paramNameLower.includes('texture') || paramNameLower.includes('quality')) {
                    analysisData = fullHairResult.hair_analysis["3. Hair Texture and Quality"];
                    if (analysisData) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = `${analysisData.texture || ''} ${analysisData.quality || ''}`.trim() || analysisData.notes || '';
                    }
                  } else if (paramNameLower.includes('growth')) {
                    analysisData = fullHairResult.hair_analysis["5. Hair Growth Patterns"];
                    if (analysisData) {
                      rating = analysisData.rating || 5;
                      severity = analysisData.severity || 'Medium';
                      description = analysisData.general_growth || analysisData.notes || '';
                    }
                  }
                  
                  // If no specific match found, use mapped parameters
                  if (!analysisData) {
                    const mappedParam = mappedParameters.find(p => 
                      p.parameterName.toLowerCase() === paramNameLower
                    );
                    if (mappedParam) {
                      rating = mappedParam.rating || 5;
                      severity = mappedParam.severity as 'Mild' | 'Medium' | 'Severe' || 'Medium';
                      description = `Analysis based on ${mappedParam.parameterName}`;
                    }
                  }
                  
                  return (
                    <div key={param.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-800">{param.parameter_name}</h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Rating:</span>
                            <div className={`w-12 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${getRatingColor(rating)}`}>
                              {rating}/10
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getSeverityColor(severity)}`}>
                            {severity}
                          </span>
                        </div>
                      </div>
                      {description && (
                        <p className="text-sm text-slate-600 mt-2">{description}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        
        {/* Fallback to original display if no admin parameters */}
        {fullHairResult && adminParameters.length === 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Detailed Analysis</h2>
            <div className="space-y-6">
              {Object.entries(fullHairResult.hair_analysis).map(([key, value]: [string, any]) => (
                <div key={key} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">{key}</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Rating:</span>
                        <div className={`w-12 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${getRatingColor(value.rating)}`}>
                          {value.rating}/10
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${getSeverityColor(value.severity)}`}>
                        {value.severity}
                      </span>
                    </div>
                  </div>
                  {value.notes && (
                    <p className="text-sm text-slate-600 mt-2">{value.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Products with Condition Mapping */}
        {loadingProducts ? (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl shadow-lg border-2 border-purple-200">
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-purple-700">Loading recommended products...</p>
            </div>
          </div>
        ) : recommendedProducts.length > 0 ? (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl shadow-lg border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <h2 className="text-2xl font-bold text-slate-800">Recommended Products for You</h2>
              <span className="text-sm text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                {recommendedProducts.length} product{recommendedProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Show which parameters triggered products */}
            {mappedParameters.length > 0 && (
              <div className="mb-4 p-3 bg-purple-100 rounded-lg border border-purple-200">
                <p className="text-sm font-semibold text-purple-900 mb-2">Recommended based on:</p>
                <div className="flex flex-wrap gap-2">
                  {mappedParameters.map((param, idx) => (
                    <span 
                      key={idx}
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getSeverityColor(param.severity as any)}`}
                    >
                      {param.parameterName} ({mapSeverityToDisplay(param.severity)})
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-purple-100">
                  <div className="flex flex-col gap-4">
                    {/* Product Image */}
                    {product.product_image && (
                      <div className="w-full h-48 bg-gray-50 rounded-lg shadow-md flex items-center justify-center overflow-hidden">
                        <img 
                          src={product.product_image} 
                          alt={product.product_name}
                          className="max-w-full max-h-full object-contain rounded-lg"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=Product+Image';
                          }}
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
                          <p className="text-xs text-purple-700 mb-1">Recommended for:</p>
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
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition-colors text-sm"
                          >
                            Shop Now
                          </a>
                          <a
                            href={product.product_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-semibold py-2 px-4 rounded-lg text-center transition-colors text-sm"
                          >
                            Learn More
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Important Disclaimer</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                This analysis is based on AI-powered image analysis and questionnaire responses. 
                It is not a substitute for professional dermatological advice. 
                For serious hair concerns, please consult a qualified trichologist or dermatologist.
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
                    Results may vary based on lighting, image quality, and individual hair variations.
                  </p>
                  <p>
                    Product recommendations are suggestions based on your analysis. 
                    Always patch test new products and consult with a professional if you have sensitive scalp or allergies.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center pt-4 space-y-4">
          <button 
            onClick={() => navigate('/hair-analysis')} 
            className="bg-karma-gold hover:bg-karma-gold/90 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-all transform hover:scale-105"
          >
            Start New Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default HairAnalysisResultsPage;
