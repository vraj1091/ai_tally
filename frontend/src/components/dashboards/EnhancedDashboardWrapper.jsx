import React, { useState, useCallback } from 'react';
import DrillDownPanel from '../common/DrillDownPanel';
import AIInsightsPanel from '../common/AIInsightsPanel';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';

/**
 * Enhanced Dashboard Wrapper
 * Adds drill-down and AI insights capabilities to any dashboard
 */
const EnhancedDashboardWrapper = ({ 
  children, 
  dashboardType,
  dashboardData,
  companyName,
  dataSource = 'live',
  showAIInsights = true
}) => {
  const [drillDown, setDrillDown] = useState({
    isOpen: false,
    title: '',
    dataType: '',
    filterValue: ''
  });
  const [aiPanelExpanded, setAIPanelExpanded] = useState(true);

  // Handler for chart/KPI clicks - to be passed to child dashboards
  const handleDrillDown = useCallback((type, filter, title) => {
    setDrillDown({
      isOpen: true,
      title: title || `${type} Details`,
      dataType: type,
      filterValue: filter
    });
  }, []);

  const closeDrillDown = () => {
    setDrillDown(prev => ({ ...prev, isOpen: false }));
  };

  // Clone children and inject drill-down handler
  const enhancedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onDrillDown: handleDrillDown
      });
    }
    return child;
  });

  return (
    <div className="space-y-6">
      {/* Main Dashboard Content */}
      <div className="relative">
        {enhancedChildren}
      </div>

      {/* AI Insights Section */}
      {showAIInsights && dashboardData && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              🤖 AI-Powered Business Insights
            </h3>
            <button
              onClick={() => setAIPanelExpanded(!aiPanelExpanded)}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {aiPanelExpanded ? (
                <>
                  <FiMinimize2 className="w-4 h-4" />
                  Collapse
                </>
              ) : (
                <>
                  <FiMaximize2 className="w-4 h-4" />
                  Expand
                </>
              )}
            </button>
          </div>
          
          {aiPanelExpanded && (
            <AIInsightsPanel
              companyName={companyName}
              dashboardType={dashboardType}
              dashboardData={dashboardData}
              dataSource={dataSource}
            />
          )}
        </div>
      )}

      {/* Drill-Down Panel */}
      <DrillDownPanel
        isOpen={drillDown.isOpen}
        onClose={closeDrillDown}
        title={drillDown.title}
        dataType={drillDown.dataType}
        filterValue={drillDown.filterValue}
        companyName={companyName}
        dataSource={dataSource}
      />
    </div>
  );
};

export default EnhancedDashboardWrapper;

