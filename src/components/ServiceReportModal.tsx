import { useState } from "react";
import { X, Send, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../App";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { getErrorMessage, isNetworkError } from "../lib/apiHelper";

interface ServiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
}

const ServiceReportModal = ({ isOpen, onClose, serviceName }: ServiceReportModalProps) => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<string>("issue");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reportTypes = [
    { value: "issue", label: "Issue" },
    { value: "bug", label: "Bug" },
    { value: "error", label: "Error" },
    { value: "suggestion", label: "Suggestion" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please log in to submit a report");
      return;
    }

    if (!description.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    setSubmitting(true);

    try {
      // Get device info if available
      const deviceInfo: any = {};
      if (typeof window !== 'undefined') {
        deviceInfo.userAgent = navigator.userAgent;
        deviceInfo.platform = navigator.platform;
        deviceInfo.screenWidth = window.screen.width;
        deviceInfo.screenHeight = window.screen.height;
      }

      const { error } = await supabase
        .from("service_reports")
        .insert({
          user_id: user.id,
          service_name: serviceName,
          report_type: reportType,
          title: description.trim().substring(0, 100) || `Report from ${serviceName.replace(/_/g, ' ')}`,
          description: description.trim(),
          device_info: deviceInfo,
          status: "pending",
        });

      if (error) {
        console.error("Error submitting report:", error);
        if (isNetworkError(error)) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (error.code === 'PGRST205') {
          toast.error("Service reports feature is not available. Please contact support.");
        } else {
          toast.error(getErrorMessage(error) || "Failed to submit report. Please try again.");
        }
        return;
      }

      setSubmitted(true);
      toast.success("Report submitted! Thank you for helping us improve.");
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setDescription("");
        setReportType("issue");
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error submitting report:", error);
      if (isNetworkError(error)) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error(getErrorMessage(error) || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Report Issue</h2>
              <p className="text-sm text-gray-500">{serviceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Thank You!</h3>
              <p className="text-gray-600">
                Your report has been submitted successfully. We'll review it soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  rows={5}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>

              {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || !description.trim()}
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
                    Submit Report
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceReportModal;

