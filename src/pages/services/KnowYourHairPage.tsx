import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Waves, Zap, Sun, Wind, Camera, Sparkles, CheckCircle, Star, Heart, Shield, Droplets, Scissors, ShoppingBag, ExternalLink, Flag } from "lucide-react";
import { AndroidPageHeader } from "../../components/AndroidBackButton";
import { getAllHairProducts, HairProduct } from "@/services/hairService";
import { Browser } from "@capacitor/browser";
import ServiceReportModal from "../../components/ServiceReportModal";

const KnowYourHairPage = () => {
  const navigate = useNavigate();
  const [selectedHairType, setSelectedHairType] = useState<string | null>(null);
  const [showCareTips, setShowCareTips] = useState<string | null>(null);
  const [showShopView, setShowShopView] = useState(false);
  const [hairProducts, setHairProducts] = useState<Record<string, HairProduct[]>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  const hairTypes = [
    {
      id: "straight",
      type: "Straight",
      icon: Zap,
      emoji: "💫",
      color: "from-blue-400 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      description: "Smooth, silky texture with natural shine",
      characteristics: ["Smooth texture", "Natural shine", "Easy to manage", "Less volume"],
      careTips: [
        "Use lightweight, volumizing products",
        "Avoid heavy oils that can weigh hair down",
        "Regular trims every 6-8 weeks",
        "Use heat protectant when styling"
      ],
      products: ["Volumizing Shampoo", "Lightweight Conditioner", "Heat Protectant"]
    },
    {
      id: "wavy",
      type: "Wavy",
      icon: Waves,
      emoji: "🌊",
      color: "from-green-400 to-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      description: "S-shaped waves with natural body",
      characteristics: ["S-shaped waves", "Natural body", "Medium volume", "Versatile styling"],
      careTips: [
        "Use curl-enhancing products",
        "Scrunch hair when wet to enhance waves",
        "Avoid brushing when dry",
        "Use a diffuser for styling"
      ],
      products: ["Curl-Enhancing Cream", "Leave-in Conditioner", "Diffuser"]
    },
    {
      id: "curly",
      type: "Curly",
      icon: Sun,
      emoji: "🌀",
      color: "from-purple-400 to-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      description: "Spiral curls with lots of volume",
      characteristics: ["Spiral curls", "High volume", "Needs moisture", "Frizz-prone"],
      careTips: [
        "Deep condition weekly",
        "Use sulfate-free products",
        "Apply products to wet hair",
        "Sleep on silk pillowcases"
      ],
      products: ["Deep Conditioner", "Curl Cream", "Silk Pillowcase"]
    },
    {
      id: "coily",
      type: "Coily/Kinky",
      icon: Wind,
      emoji: "🌪️",
      color: "from-orange-400 to-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      description: "Tight coils with maximum volume",
      characteristics: ["Tight coils", "Maximum volume", "Very dry", "Needs extra care"],
      careTips: [
        "Moisturize daily with water-based products",
        "Use the LOC method (Liquid, Oil, Cream)",
        "Protective styles to minimize manipulation",
        "Regular protein treatments"
      ],
      products: ["Moisturizing Lotion", "Natural Oils", "Protein Treatment"]
    }
  ];

  // Fetch hair products from database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const grouped = await getAllHairProducts();
        setHairProducts(grouped);
      } catch (error) {
        console.error('Error fetching hair products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const handleProductClick = async (product: HairProduct) => {
    if (product.product_link) {
      try {
        await Browser.open({ url: product.product_link });
      } catch (error) {
        console.error('Error opening product link:', error);
      }
    }
  };

  // Get all products (no hair type filtering)
  const getAllProducts = (): HairProduct[] => {
    // Return all products from 'all' key (no categorization)
    return hairProducts['all'] || [];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Android Material Design Header */}
      <AndroidPageHeader
        title="Know Your Hair"
        subtitle="Discover your hair type & care routine"
        backTo="/"
        rightContent={
          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Report issue"
            title="Report issue"
          >
            <Flag className="w-5 h-5 text-gray-600" />
          </button>
        }
      />
      
      {/* Report Modal */}
      <ServiceReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        serviceName="know_your_hair"
      />

      <div className="max-w-md mx-auto px-4 py-6 sm:max-w-lg md:max-w-2xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-karma-gold rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Discover Your Hair Type</h2>
          <p className="text-gray-600">Learn about different hair types and get personalized care tips</p>
        </div>

        {/* Hair Types Grid */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          {hairTypes.map((hair) => (
            <div
              key={hair.id}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                selectedHairType === hair.id
                  ? 'border-karma-gold bg-karma-light-gold shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => setSelectedHairType(selectedHairType === hair.id ? null : hair.id)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${hair.color} rounded-full flex items-center justify-center text-2xl`}>
                      {hair.emoji}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{hair.type} Hair</h3>
                      <p className="text-sm text-gray-600">{hair.description}</p>
                    </div>
                  </div>
                  {selectedHairType === hair.id && (
                    <div className="w-8 h-8 bg-karma-gold rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Characteristics */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Key Characteristics:</h4>
                  <div className="flex flex-wrap gap-2">
                    {hair.characteristics.map((char, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Care Tips - Expandable */}
                {selectedHairType === hair.id && (
                  <div className="border-t pt-4 transition-all duration-300 ease-in-out">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">Care Tips</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCareTips(showCareTips === hair.id ? null : hair.id);
                        }}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        {showCareTips === hair.id ? 'Hide' : 'Show'} Tips
                      </button>
                    </div>
                    
                    {showCareTips === hair.id && (
                      <div className="space-y-2 transition-all duration-300 ease-in-out">
                        {hair.careTips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Star className="w-3 h-3 text-purple-600" />
                            </div>
                            <p className="text-sm text-gray-700">{tip}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommended Products - Show all products for all hair types */}
                    {selectedHairType === hair.id && (
                      <div className="mt-4">
                        <h5 className="font-semibold text-gray-800 mb-2">Recommended Products:</h5>
                        {loadingProducts ? (
                          <div className="text-sm text-gray-500">Loading products...</div>
                        ) : getAllProducts().length > 0 ? (
                          <div className="space-y-2">
                            {getAllProducts().map((product) => (
                              <div
                                key={product.id}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-colors"
                              >
                                <div className="flex-1">
                                  <h6 className="font-semibold text-gray-800 text-sm">{product.product_name}</h6>
                                  {product.product_description && (
                                    <p className="text-xs text-gray-600 mt-1">{product.product_description}</p>
                                  )}
                                </div>
                                {product.product_link && (
                                  <button
                                    onClick={() => handleProductClick(product)}
                                    className="ml-2 p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                                    title="View Product"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {hair.products.map((product, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                              >
                                {product}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">AI Hair Analysis</h3>
                <p className="text-white/80 text-sm">Get personalized hair analysis with photos</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/hair-analysis')}
              className="w-full bg-white text-karma-brown hover:bg-gray-100 font-semibold"
            >
              Start Hair Analysis
            </Button>
          </div>

          <div className="bg-karma-green rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Hair Care Products</h3>
                <p className="text-white/80 text-sm">Discover Karma Terra hair care solutions</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/ingredients')}
              className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold"
            >
              Explore Products
            </Button>
          </div>
        </div>

        {/* Quick Tips Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Hair Care Tips</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Droplets className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Stay Hydrated</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Protect from Heat</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Scissors className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Regular Trims</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <Star className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Quality Products</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowYourHairPage;
