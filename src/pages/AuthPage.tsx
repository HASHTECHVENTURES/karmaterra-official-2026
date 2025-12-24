import { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCountries, getStatesByCountry, getCitiesByState } from "@/lib/locationData";
import { getAppImageByName } from "@/services/appImagesService";

const AuthPage = () => {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appIconUrl, setAppIconUrl] = useState("/app-icon.png");
  const { login } = useAuth();

  // Fetch app icon from database
  useEffect(() => {
    const fetchAppIcon = async () => {
      try {
        const icon = await getAppImageByName('app-icon');
        if (icon) {
          setAppIconUrl(icon.image_url);
        }
      } catch (error) {
        console.error('Error fetching app icon:', error);
      }
    };
    fetchAppIcon();
  }, []);

  // Get location data
  const countries = getCountries();
  const states = country ? getStatesByCountry(country) : [];
  const cities = country && state ? getCitiesByState(country, state) : [];

  // Handle country change
  const handleCountryChange = (selectedCountry: string) => {
    setCountry(selectedCountry);
    setState(""); // Reset state when country changes
    setCity(""); // Reset city when country changes
  };

  // Handle state change
  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    setCity(""); // Reset city when state changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Phone number is required for both sign-in and sign-up
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN (numbers only)",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (isSignUp && !name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name for sign up",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (isSignUp && !email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email for sign up",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (isSignUp && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (isSignUp && !gender.trim()) {
      toast({
        title: "Gender Required",
        description: "Please select your gender for sign up",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (isSignUp && !birthdate.trim()) {
      toast({
        title: "Birthdate Required",
        description: "Please enter your birthdate for sign up",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (isSignUp && !country.trim()) {
      toast({
        title: "Country Required",
        description: "Please select your country for sign up",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (isSignUp && !state.trim()) {
      toast({
        title: "State Required",
        description: "Please select your state for sign up",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (isSignUp && !city.trim()) {
      toast({
        title: "City Required",
        description: "Please select your city for sign up",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      const result = await login(
        pin,
        phoneNumber.trim(),
        isSignUp ? name.trim() : undefined,
        isSignUp ? email.trim() : undefined,
        isSignUp ? gender.trim() : undefined,
        isSignUp ? birthdate.trim() : undefined,
        isSignUp ? country.trim() : undefined,
        isSignUp ? state.trim() : undefined,
        isSignUp ? city.trim() : undefined,
        isSignUp // Explicitly pass isSignUpMode flag
      );

      if (result.success) {
        toast({
          title: isSignUp ? "Account Created!" : "Welcome Back!",
          description: "Your personalized skincare journey begins now"
        });
      } else {
        toast({
          title: isSignUp ? "Sign Up Failed" : "Sign In Failed",
          description: result.error || "Please try again",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-all">
      {/* Main Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-white border-2 border-green-200 rounded-xl flex items-center justify-center p-2">
            <img 
              src={appIconUrl} 
              alt="Karma Terra Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = "/app-icon.png";
              }}
            />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-800 mb-2">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-gray-600 text-sm">
            {isSignUp ? "Sign up for your KarmaTerra account" : "Sign in to your KarmaTerra account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input - Only for Sign Up */}
          {isSignUp && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Your Name *
              </label>
              <Input
                type="text"
                inputMode="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 min-h-[48px] bg-gray-50 border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500"
                aria-label="Full name"
              />
            </div>
          )}

          {/* Email Input - Only for Sign Up */}
          {isSignUp && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Email Address *
              </label>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 min-h-[48px] bg-gray-50 border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500"
                aria-label="Email address"
              />
            </div>
          )}

          {/* Gender Input - Only for Sign Up */}
          {isSignUp && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Gender *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500 px-3"
              >
                <option key="gender-empty" value="">Select your gender</option>
                <option key="Male" value="Male">Male</option>
                <option key="Female" value="Female">Female</option>
                <option key="Other" value="Other">Other</option>
                <option key="Prefer not to say" value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          )}

          {/* Birthdate Input - Only for Sign Up */}
          {isSignUp && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Birthdate *
              </label>
              <Input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full h-12 bg-gray-50 border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500"
                aria-label="Birthdate"
              />
              <p className="text-xs text-gray-500 mt-2">
                Select your date of birth (YYYY-MM-DD format)
              </p>
            </div>
          )}

          {/* Country Input - Only for Sign Up */}
          {isSignUp && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Country *
              </label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500 px-3"
              >
                <option key="country-empty" value="">Select your country</option>
                {countries.map((countryOption) => (
                  <option key={countryOption.code} value={countryOption.name}>
                    {countryOption.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* State Input - Only for Sign Up */}
          {isSignUp && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                State *
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                disabled={!country}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option key="state-empty" value="">{country ? "Select your state" : "Select country first"}</option>
                {states.map((stateOption, index) => (
                  <option key={`state-${index}`} value={stateOption}>
                    {stateOption}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* City Input - Only for Sign Up */}
          {isSignUp && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                City *
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!state}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option key="city-empty" value="">{state ? "Select your city" : "Select state first"}</option>
                {cities.map((cityOption, index) => (
                  <option key={`city-${index}`} value={cityOption}>
                    {cityOption}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Phone Number - Required for both Sign In and Sign Up */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Phone Number *
            </label>
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              className="w-full h-12 min-h-[48px] bg-gray-50 border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500"
              aria-label="Phone number"
            />
            <p className="text-xs text-gray-500 mt-2">
              Your phone number is your unique identifier for your account
            </p>
          </div>

          {/* PIN Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              4-Digit PIN *
            </label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="1234"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full h-12 min-h-[48px] bg-gray-50 border-gray-200 rounded-lg text-center text-lg tracking-widest focus:border-green-500 focus:ring-green-500"
                maxLength={4}
                aria-label="4-digit PIN"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              PIN must be exactly 4 digits (numbers only).
            </p>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-karma-gold hover:bg-karma-gold/90 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {isSignUp ? "Creating Account..." : "Signing In..."}
              </div>
            ) : (
              isSignUp ? "Create Account" : "Sign In"
            )}
          </Button>
        </form>

        {/* Toggle Sign Up/Sign In */}
        <div className="text-center mt-6">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-green-600 hover:text-green-700 text-sm"
          >
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <span className="font-medium">{isSignUp ? "Sign in" : "Sign up"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;