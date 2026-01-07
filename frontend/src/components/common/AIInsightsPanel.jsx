import React, { useState, useEffect } from 'react';
import { FiCpu, FiAlertTriangle, FiTrendingUp, FiShield, FiRefreshCw, FiChevronDown, FiChevronUp, FiStar } from 'react-icons/fi';
import apiClient from '../../api/client';

/**
 * AI Insights Panel Component
 * Displays AI-generated business suggestions with safety scores
 * Uses Ollama for real AI generation - not fabricated data
 */
const AIInsightsPanel = ({ 
  companyName, 
  dashboardType, 
  dashboardData, 
  dataSource = 'live' 
}) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Don't auto-load - let user click to generate
  // This prevents timeouts on page load
  useEffect(() => {
    // Only set initial state, don't auto-generate
    if (!companyName || !dashboardData) {
      setInsights(null);
    }
  }, [companyName, dashboardType]);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/ai/generate-insights', {
        company_name: companyName,
        dashboard_type: dashboardType,
        dashboard_data: dashboardData,
        source: dataSource
      }, {
        timeout: 200000 // 3+ minutes for AI generation with phi4:14b
      });
      
      setInsights(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('AI Insights error:', err);
      setError('Failed to generate AI insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSafetyColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getSafetyLabel = (score) => {
    if (score >= 80) return 'High Confidence';
    if (score >= 60) return 'Medium Confidence';
    if (score >= 40) return 'Low Confidence';
    return 'Needs Verification';
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'growth': return FiTrendingUp;
      case 'risk': return FiAlertTriangle;
      case 'efficiency': return FiCpu;
      case 'compliance': return FiShield;
      default: return FiStar;
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg border border-purple-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FiCpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Business Insights</h3>
              <p className="text-sm opacity-80">Powered by Phi-4 AI Analysis</p>
            </div>
          </div>
          <button 
            onClick={generateInsights}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
        {lastUpdated && (
          <p className="text-xs opacity-60 mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-purple-200 rounded-full" />
              <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <FiCpu className="absolute inset-0 m-auto w-6 h-6 text-purple-600" />
            </div>
            <p className="mt-4 text-gray-600 font-medium">AI is analyzing your data...</p>
            <p className="text-sm text-gray-500 mt-1">This may take 30-60 seconds</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <FiAlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button 
              onClick={generateInsights}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !insights && !loading ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCpu className="w-10 h-10 text-purple-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">AI Business Insights</h4>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Get personalized business recommendations powered by AI analysis of your Tally data
            </p>
            <button
              onClick={generateInsights}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-medium"
            >
              🤖 Generate AI Insights
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Takes 30-60 seconds • Powered by Phi-4 AI
            </p>
          </div>
        ) : insights ? (
          <div className="space-y-6">
            {/* Overall Health Score */}
            {insights.health_score !== undefined && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Business Health Score</h4>
                  <div className={`px-4 py-2 rounded-full font-bold ${getSafetyColor(insights.health_score)}`}>
                    {insights.health_score}/100
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      insights.health_score >= 80 ? 'bg-green-500' :
                      insights.health_score >= 60 ? 'bg-yellow-500' :
                      insights.health_score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${insights.health_score}%` }}
                  />
                </div>
                {insights.health_summary && (
                  <p className="mt-3 text-sm text-gray-600">{insights.health_summary}</p>
                )}
              </div>
            )}

            {/* Key Recommendations */}
            {insights.recommendations && insights.recommendations.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Key Recommendations ({insights.recommendations.length})
                </h4>
                <div className="space-y-4">
                  {insights.recommendations.map((rec, idx) => {
                    const Icon = getCategoryIcon(rec.category);
                    const isExpanded = expandedInsight === idx;
                    
                    return (
                      <div 
                        key={idx}
                        className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <button
                          onClick={() => setExpandedInsight(isExpanded ? null : idx)}
                          className="w-full px-5 py-4 flex items-start gap-4 text-left"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            rec.category === 'growth' ? 'bg-green-100 text-green-600' :
                            rec.category === 'risk' ? 'bg-red-100 text-red-600' :
                            rec.category === 'efficiency' ? 'bg-blue-100 text-blue-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h5 className="font-semibold text-gray-900">{rec.title}</h5>
                              <span className={`w-2 h-2 rounded-full ${getPriorityColor(rec.priority)}`} />
                              <span className="text-xs text-gray-500 capitalize">{rec.priority} Priority</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{rec.summary}</p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSafetyColor(rec.safety_score)}`}>
                              <FiShield className="inline w-3 h-3 mr-1" />
                              {rec.safety_score}%
                            </div>
                            {isExpanded ? <FiChevronUp className="w-5 h-5 text-gray-400" /> : <FiChevronDown className="w-5 h-5 text-gray-400" />}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-gray-100">
                            <div className="pt-4 space-y-4">
                              {/* Detailed Analysis */}
                              <div>
                                <h6 className="text-sm font-semibold text-gray-700 mb-2">Detailed Analysis</h6>
                                <p className="text-sm text-gray-600">{rec.detailed_analysis}</p>
                              </div>
                              
                              {/* Action Steps */}
                              {rec.action_steps && rec.action_steps.length > 0 && (
                                <div>
                                  <h6 className="text-sm font-semibold text-gray-700 mb-2">Recommended Actions</h6>
                                  <ul className="space-y-2">
                                    {rec.action_steps.map((step, stepIdx) => (
                                      <li key={stepIdx} className="flex items-start gap-2 text-sm text-gray-600">
                                        <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium shrink-0">
                                          {stepIdx + 1}
                                        </span>
                                        {step}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Expected Impact */}
                              {rec.expected_impact && (
                                <div className="bg-green-50 rounded-lg p-4">
                                  <h6 className="text-sm font-semibold text-green-800 mb-1">Expected Impact</h6>
                                  <p className="text-sm text-green-700">{rec.expected_impact}</p>
                                </div>
                              )}
                              
                              {/* Safety Note */}
                              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                                <FiShield className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div>
                                  <p className="text-xs font-medium text-gray-700">
                                    {getSafetyLabel(rec.safety_score)} Recommendation
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    AI-generated with {rec.safety_score}% confidence based on your data patterns
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Risk Alerts */}
            {insights.risk_alerts && insights.risk_alerts.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiAlertTriangle className="w-5 h-5 text-red-500" />
                  Risk Alerts ({insights.risk_alerts.length})
                </h4>
                <div className="space-y-3">
                  {insights.risk_alerts.map((alert, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <FiAlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-red-900">{alert.title}</p>
                        <p className="text-sm text-red-700 mt-1">{alert.description}</p>
                        {alert.mitigation && (
                          <p className="text-sm text-red-600 mt-2 italic">
                            Suggested action: {alert.mitigation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Disclaimer */}
            <div className="flex items-start gap-3 p-4 bg-gray-100 rounded-xl text-sm">
              <FiCpu className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-700">AI-Generated Insights</p>
                <p className="text-gray-500 mt-1">
                  These recommendations are generated by Phi-4 AI based on your Tally data. 
                  Always verify critical business decisions with a financial advisor.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FiCpu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Click "Refresh" to generate AI-powered insights for your business
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsightsPanel;

