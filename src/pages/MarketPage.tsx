import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { Browser } from "@capacitor/browser";

const MarketPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    Browser.open({ url: "https://www.karmaterra.in/" }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-40 header-safe-area">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              aria-label="Go back to home"
              title="Go back to home"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-800">Karma Terra Store</h1>
              <p className="text-sm text-gray-500">Official Website</p>
            </div>
            <div className="w-10" />
          </div>
        </div>
      </div>
      <div className="p-6 text-center text-gray-600">
        <p className="mb-3">Opening the KarmaTerra store in your browser...</p>
        <button
          onClick={() => Browser.open({ url: "https://www.karmaterra.in/" })}
          className="px-4 py-2 rounded-lg bg-karma-gold hover:bg-karma-gold/90 text-white transition-colors"
        >
          Open Store
        </button>
      </div>
    </div>
  );
};

export default MarketPage;
