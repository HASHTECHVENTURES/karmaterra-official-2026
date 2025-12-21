import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, HelpCircle, Mail, Phone, ExternalLink } from "lucide-react";
import { AndroidPageHeader } from "../components/AndroidBackButton";
import { useAuth } from "../App";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { getErrorMessage, isNetworkError } from "../lib/apiHelper";
import { getAppConfigs } from "../services/appConfigService";

const HelpPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState<string>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    email: string | null;
    phone: string | null;
    supportUrl: string | null;
  }>({
    email: null,
    phone: null,
    supportUrl: null,
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      const config = await getAppConfigs();
      if (config) {
        setContactInfo({
          email: config.contact_email,
          phone: config.contact_phone,
          supportUrl: config.support_url,
        });
      }
    };
    fetchContactInfo();
  }, []);

  const categories = [
    { value: "general", label: "General Question" },
    { value: "technical", label: "Technical Issue" },
    { value: "account", label: "Account Help" },
    { value: "payment", label: "Payment Issue" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please log in to submit a help request");
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("help_requests")
        .insert({
          user_id: user.id,
          category: category,
          subject: subject.trim(),
          message: message.trim(),
          status: "open",
        });

      if (error) {
        console.error("Error submitting help request:", error);
        if (isNetworkError(error)) {
          toast.error("Network error. Please check your connection and try again.");
        } else {
          toast.error(getErrorMessage(error) || "Failed to submit help request. Please try again.");
        }
        return;
      }

      setSubmitted(true);
      toast.success("Help request submitted! We'll get back to you soon.");
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setSubject("");
        setMessage("");
        setCategory("general");
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error("Error submitting help request:", error);
      if (isNetworkError(error)) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error(getErrorMessage(error) || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <AndroidPageHeader title="Help" backTo="/" />
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your help request has been submitted. Our team will review it and get back to you soon.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-karma-gold text-white py-3 rounded-lg font-semibold hover:bg-karma-gold/90 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AndroidPageHeader title="Help & Support" backTo="/" />
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Need Help?</h2>
              <p className="text-gray-600 text-sm">We're here to assist you</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe your issue or question in detail..."
                rows={6}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="w-full bg-karma-gold text-white py-3 rounded-lg font-semibold hover:bg-karma-gold/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Help Request
                </>
              )}
            </button>
          </form>

          {/* Contact Information */}
          {(contactInfo.email || contactInfo.phone || contactInfo.supportUrl) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
              <div className="space-y-3">
                {contactInfo.email && (
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{contactInfo.email}</span>
                  </a>
                )}
                {contactInfo.phone && (
                  <a
                    href={`tel:${contactInfo.phone.replace(/\s+/g, '')}`}
                    className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{contactInfo.phone}</span>
                  </a>
                )}
                {contactInfo.supportUrl && (
                  <a
                    href={contactInfo.supportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Visit Support Center</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Quick Help Links */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate("/terms")}
                className="text-sm text-purple-600 hover:underline"
              >
                Terms & Conditions
              </button>
              <span className="text-gray-300 mx-2">•</span>
              <button
                onClick={() => navigate("/privacy")}
                className="text-sm text-purple-600 hover:underline"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
