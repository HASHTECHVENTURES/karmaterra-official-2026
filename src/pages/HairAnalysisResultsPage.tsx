import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Report } from '../types';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { HairAnalysisResult } from '../services/geminiServiceEdge';
import { AndroidPageHeader } from '../components/AndroidBackButton';
import { getAllHairProductsList, HairProduct } from '../services/hairService';

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
  const [recommendedProducts, setRecommendedProducts] = useState<HairProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [hairImages, setHairImages] = useState<string[]>([]);

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

  // Fetch products from database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const products = await getAllHairProductsList();
        setRecommendedProducts(products);
        console.log('✅ Fetched hair products from database:', products);
      } catch (error) {
        console.error('❌ Error fetching hair products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    if (report) {
      fetchProducts();
    }
  }, [report]);

  if (!report) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading report...</p>
      </div>
    );
  }

  const { result, userData, date } = report;

  // Get hair conditions/issues that triggered product recommendation
  const getHairConditions = () => {
    if (!fullHairResult) return [];
    const conditions: Array<{ name: string; severity: string }> = [];
    
    Object.entries(fullHairResult.hair_analysis).forEach(([key, value]: [string, any]) => {
      if (value.severity && value.severity !== 'N/A' && value.severity !== 'Mild') {
        conditions.push({
          name: key.replace(/^\d+\.\s*/, ''), // Remove leading number
          severity: value.severity
        });
      }
    });
    
    return conditions;
  };

  const hairConditions = getHairConditions();

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

        {/* Detailed Analysis */}
        {fullHairResult && (
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
            
            {/* Show which hair conditions triggered products */}
            {hairConditions.length > 0 && (
              <div className="mb-4 p-3 bg-purple-100 rounded-lg border border-purple-200">
                <p className="text-sm font-semibold text-purple-900 mb-2">Recommended based on:</p>
                <div className="flex flex-wrap gap-2">
                  {hairConditions.map((condition, idx) => (
                    <span 
                      key={idx}
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getSeverityColor(condition.severity as any)}`}
                    >
                      {condition.name} ({condition.severity})
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
                      </div>
                      
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
        ) : (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl shadow-lg border-2 border-purple-200">
            <div className="text-center py-8">
              <p className="text-purple-700">No products found for your hair analysis.</p>
              <p className="text-sm text-purple-600 mt-2">Please configure products in Admin Panel → Know Your Hair → Products tab</p>
            </div>
          </div>
        )}

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
