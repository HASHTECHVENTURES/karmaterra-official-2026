import { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, Calendar, BarChart3, Image, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUserAnalysisHistory, generateProgressReport } from '../services/ProgressTrackingService';
import type { AnalysisHistoryRecord, ProgressReport } from '../services/ProgressTrackingService';


const ProgressTrackingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryRecord[]>([]);
  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUser = localStorage.getItem('karma-terra-user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        await loadAnalysisData(userData.id);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAnalysisData = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Load analysis history
      const history = await getUserAnalysisHistory(userId, 20);
      setAnalysisHistory(history);
      
      // Generate progress report
      const report = await generateProgressReport(userId);
      setProgressReport(report);
      
    } catch (error) {
      console.error('Error loading analysis data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50';
      case 'declining':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-40 header-safe-area">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/know-your-skin')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-800">Your Skin Story</h1>
              <p className="text-sm text-gray-500">Track your progress over time</p>
            </div>
            <div className="w-10" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Not Enough Data Message */}
        {!progressReport?.hasEnoughData && analysisHistory.length === 1 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6 text-center">
            <BarChart3 className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-blue-800 mb-2">Need More Data</h3>
            <p className="text-sm text-blue-700 mb-4">
              You have 1 analysis. Complete at least 2 analyses to see your progress comparison and trends.
            </p>
            <button
              onClick={() => navigate('/know-your-skin')}
              className="px-6 py-2 bg-karma-gold text-white rounded-full font-semibold hover:bg-karma-gold/90 transition-all"
            >
              Take Another Analysis
            </button>
          </div>
        )}

        {/* Progress Overview */}
        {progressReport?.hasEnoughData && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Progress Overview</h2>
                <p className="text-sm text-gray-600">
                  {analysisHistory.length} analyses completed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-gray-800">
                  {progressReport.comparison?.score_change && progressReport.comparison.score_change > 0 ? '+' : ''}
                  {progressReport.comparison?.score_change || 0}
                </div>
                <div className="text-sm text-gray-600">Score Change</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-center gap-2">
                  {progressReport.comparison?.overall_trend && getTrendIcon(progressReport.comparison.overall_trend)}
                  <span className="text-lg font-bold capitalize">
                    {progressReport.comparison?.overall_trend || 'stable'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Trend</div>
              </div>
            </div>

            {/* Improvements */}
            {progressReport.comparison?.improvements?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Improvements
                </h3>
                <div className="space-y-1">
                  {progressReport.comparison.improvements.map((improvement: string, index: number) => (
                    <div key={index} className="text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                      • {improvement}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Concerns */}
            {progressReport.comparison?.concerns?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Areas to Watch
                </h3>
                <div className="space-y-1">
                  {progressReport.comparison.concerns.map((concern: string, index: number) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                      • {concern}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {progressReport.comparison?.recommendations?.length > 0 && (
              <div>
                <h3 className="font-semibold text-blue-700 mb-2">Recommendations</h3>
                <div className="space-y-1">
                  {progressReport.comparison.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
                      • {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analysis History */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Analysis History</h2>
              <p className="text-sm text-gray-600">Your skin journey timeline</p>
            </div>
          </div>

          {analysisHistory.length === 0 ? (
            <div className="text-center py-8">
              <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No analyses yet</p>
              <p className="text-sm text-gray-500">Start your skin journey with your first analysis</p>
              <button
                onClick={() => navigate('/know-your-skin')}
                className="mt-4 px-6 py-2 bg-karma-gold hover:bg-karma-gold/90 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Start Analysis
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {analysisHistory.map((analysis, index) => {
                const severity = analysis.analysis_result?.result?.overallSeverity || 'N/A';
                const getSeverityBadgeColor = (sev: string) => {
                  switch (sev) {
                    case 'Mild': return 'bg-green-100 text-green-700 border border-green-300';
                    case 'Medium': return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
                    case 'Severe': return 'bg-red-100 text-red-700 border border-red-300';
                    default: return 'bg-gray-100 text-gray-700 border border-gray-300';
                  }
                };
                
                return (
                  <div key={analysis.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityBadgeColor(severity)}`}>
                        {severity}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="capitalize">AI Skin Analysis</span>
                      <span>{new Date(analysis.created_at).toLocaleTimeString()}</span>
                    </div>

                    {index === 0 && (
                      <div className="mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full inline-block">
                        Latest Analysis
                      </div>
                    )}
                  
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => navigate('/skin-analysis-results', {
                        state: {
                          report: analysis.analysis_result
                        }
                      })}
                      className="flex-1 bg-karma-green hover:bg-karma-dark-green text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Report
                    </button>
                    {/* The compare functionality can be built out later */}
                    {/* {index === 0 && (
                      <button
                        onClick={() => {
                          // Placeholder for comparison logic
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Compare Analysis
                      </button>
                    )} */}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => navigate('/know-your-skin')}
            className="p-4 bg-karma-gold hover:bg-karma-gold/90 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            New Analysis
          </button>
        </div>

        {/* Progress Tips */}
        {analysisHistory.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Progress Tips</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Consistency is Key</p>
                  <p className="text-xs text-gray-600">Regular analysis helps track real progress</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Track Daily Habits</p>
                  <p className="text-xs text-gray-600">Monitor your skincare routine daily</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Monitor Trends</p>
                  <p className="text-xs text-gray-600">Look for patterns in your skin health</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTrackingPage;

