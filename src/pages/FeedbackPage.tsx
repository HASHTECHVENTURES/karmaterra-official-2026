import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Send, CheckCircle } from "lucide-react";
import { AndroidPageHeader } from "../components/AndroidBackButton";
import { useAuth } from "../App";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { getErrorMessage, isNetworkError } from "../lib/apiHelper";

const FeedbackPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState<string>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const feedbackTypes = [
    { value: "general", label: "General Feedback" },
    { value: "bug", label: "Bug Report" },
    { value: "feature", label: "Feature Request" },
    { value: "improvement", label: "Improvement Suggestion" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please log in to submit feedback");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter your feedback message");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("user_feedback")
        .insert({
          user_id: user.id,
          feedback_type: feedbackType,
          subject: subject.trim() || null,
          message: message.trim(),
          rating: rating || null,
          status: "pending",
        });

      if (error) {
        console.error("Error submitting feedback:", error);
        if (isNetworkError(error)) {
          toast.error("Network error. Please check your connection and try again.");
        } else {
          toast.error(getErrorMessage(error) || "Failed to submit feedback. Please try again.");
        }
        return;
      }

      setSubmitted(true);
      toast.success("Thank you for your feedback!");
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setSubject("");
        setMessage("");
        setRating(null);
        setFeedbackType("general");
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
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
        <AndroidPageHeader title="Feedback" backTo="/" />
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Your feedback has been submitted successfully. We appreciate your input!
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
      <AndroidPageHeader title="Feedback" backTo="/" />
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Share Your Feedback</h2>
          <p className="text-gray-600 mb-6">
            We'd love to hear from you! Your feedback helps us improve.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback Type
              </label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {feedbackTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject (Optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your feedback"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating (Optional)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-2 rounded-lg transition ${
                      rating && star <= rating
                        ? "bg-yellow-100 text-yellow-500"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        rating && star <= rating ? "fill-current" : ""
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think..."
                rows={6}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !message.trim()}
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
                  Submit Feedback
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
