import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <SEOHead 
        title="404 - Page Not Found | KarmaTerra"
        description="The page you're looking for doesn't exist."
      />
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-32 h-32 bg-karma-light-gold rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-16 h-16 text-karma-gold" />
            </div>
            <h1 className="text-6xl font-bold text-karma-brown mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Page Not Found
            </h2>
            <p className="text-gray-600 mb-8">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-karma-gold hover:bg-karma-gold/90 text-white"
              size="lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Go to Home
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Popular Pages:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/know-your-skin')}
              >
                Know Your Skin
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/know-your-hair')}
              >
                Know Your Hair
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ask-karma')}
              >
                Ask Karma
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/blogs')}
              >
                Blogs
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
