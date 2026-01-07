import React, { useState } from 'react';
import { FiBarChart2, FiTrendingUp, FiPieChart, FiActivity, FiGrid, FiLayers } from 'react-icons/fi';
import ChartLibrary from './AdvancedChartLibrary';

const CHART_CATEGORIES = {
  'Bar Charts': [
    { id: 'VerticalBarChart', name: 'Vertical Bar', icon: FiBarChart2 },
    { id: 'HorizontalBarChart', name: 'Horizontal Bar', icon: FiBarChart2 },
    { id: 'StackedBarChart', name: 'Stacked Bar', icon: FiLayers },
    { id: 'GroupedBarChart', name: 'Grouped Bar', icon: FiGrid },
    { id: 'BarChartWithLabels', name: 'Bar with Labels', icon: FiBarChart2 }
  ],
  'Line Charts': [
    { id: 'SimpleLineChart', name: 'Simple Line', icon: FiTrendingUp },
    { id: 'MultiLineChart', name: 'Multi Line', icon: FiTrendingUp },
    { id: 'DashedLineChart', name: 'Dashed Line', icon: FiTrendingUp },
    { id: 'StepLineChart', name: 'Step Line', icon: FiTrendingUp },
    { id: 'CurvedLineChart', name: 'Curved Line', icon: FiTrendingUp }
  ],
  'Area Charts': [
    { id: 'SimpleAreaChart', name: 'Simple Area', icon: FiActivity },
    { id: 'StackedAreaChart', name: 'Stacked Area', icon: FiActivity },
    { id: 'PercentageAreaChart', name: 'Percentage Area', icon: FiActivity },
    { id: 'GradientAreaChart', name: 'Gradient Area', icon: FiActivity },
    { id: 'MultiAreaChart', name: 'Multi Area', icon: FiActivity }
  ],
  'Pie & Donut': [
    { id: 'SimplePieChart', name: 'Simple Pie', icon: FiPieChart },
    { id: 'DonutChart', name: 'Donut', icon: FiPieChart },
    { id: 'SemiCirclePieChart', name: 'Semi-Circle', icon: FiPieChart },
    { id: 'TwoLevelPieChart', name: 'Two-Level Pie', icon: FiPieChart },
    { id: 'PieChartWithCustomLabel', name: 'Pie with Labels', icon: FiPieChart }
  ],
  'Radar & Radial': [
    { id: 'SimpleRadarChart', name: 'Radar', icon: FiActivity },
    { id: 'RadialBarChartSimple', name: 'Radial Bar', icon: FiPieChart },
    { id: 'FullCircleRadialBar', name: 'Full Circle', icon: FiPieChart },
    { id: 'MultiRadarChart', name: 'Multi Radar', icon: FiActivity },
    { id: 'GaugeChart', name: 'Gauge', icon: FiActivity }
  ],
  'Scatter & Composed': [
    { id: 'SimpleScatterChart', name: 'Scatter', icon: FiGrid },
    { id: 'MultiScatterChart', name: 'Multi Scatter', icon: FiGrid },
    { id: 'ComposedLineBarChart', name: 'Line + Bar', icon: FiLayers },
    { id: 'ComposedMultiChart', name: 'Multi Composed', icon: FiLayers },
    { id: 'BubbleChart', name: 'Bubble', icon: FiGrid }
  ],
  'Specialized': [
    { id: 'WaterfallChart', name: 'Waterfall', icon: FiBarChart2 },
    { id: 'CandlestickChart', name: 'Candlestick', icon: FiBarChart2 },
    { id: 'HeatmapChart', name: 'Heatmap', icon: FiGrid },
    { id: 'TreemapChartCustom', name: 'Treemap', icon: FiGrid },
    { id: 'BulletChart', name: 'Bullet', icon: FiBarChart2 }
  ]
};

const ChartSelector = ({ 
  data, 
  title = 'Chart Visualization',
  defaultChartType = 'VerticalBarChart',
  dataKey = 'value',
  xKey = 'name',
  height = 300,
  showSelector = true,
  chartProps = {}
}) => {
  const [selectedChart, setSelectedChart] = useState(defaultChartType);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Bar Charts');

  const ChartComponent = ChartLibrary[selectedChart];

  const getChartProps = () => {
    const baseProps = { data, height, ...chartProps };

    // Special handling for different chart types
    switch (selectedChart) {
      case 'StackedBarChart':
      case 'GroupedBarChart':
        return { ...baseProps, dataKeys: chartProps.dataKeys || ['value1', 'value2'], xKey };
      
      case 'MultiLineChart':
      case 'StackedAreaChart':
      case 'PercentageAreaChart':
      case 'MultiAreaChart':
        return { ...baseProps, dataKeys: chartProps.dataKeys || ['value1', 'value2'], xKey };
      
      case 'SimplePieChart':
      case 'DonutChart':
      case 'SemiCirclePieChart':
      case 'PieChartWithCustomLabel':
        return { ...baseProps, dataKey, nameKey: 'name' };
      
      case 'TwoLevelPieChart':
        return { ...baseProps, innerData: data.slice(0, 3), outerData: data.slice(3) };
      
      case 'SimpleRadarChart':
      case 'MultiRadarChart':
        return { ...baseProps, dataKeys: chartProps.dataKeys || ['value'] };
      
      case 'RadialBarChartSimple':
      case 'FullCircleRadialBar':
        return { ...baseProps, dataKey };
      
      case 'GaugeChart':
        return { value: chartProps.value || 75, max: chartProps.max || 100, height };
      
      case 'SimpleScatterChart':
        return { ...baseProps, xKey: chartProps.xKey || 'x', yKey: chartProps.yKey || 'y' };
      
      case 'MultiScatterChart':
        return { ...baseProps, datasets: chartProps.datasets || [{ name: 'Set 1', data }] };
      
      case 'ComposedLineBarChart':
        return { ...baseProps, lineKey: 'value1', barKey: 'value2', xKey };
      
      case 'ComposedMultiChart':
        return { ...baseProps, dataKeys: chartProps.dataKeys || ['value1', 'value2', 'value3'], xKey };
      
      case 'BubbleChart':
        return { ...baseProps };
      
      case 'BulletChart':
        return { value: chartProps.value || 75, target: chartProps.target || 85, max: chartProps.max || 100, height };
      
      default:
        return { ...baseProps, dataKey, xKey };
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header with Chart Selector */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        
        {showSelector && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <FiBarChart2 className="w-4 h-4" />
              Change Chart Type
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 w-96">
                {/* Category Tabs */}
                <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
                  {Object.keys(CHART_CATEGORIES).map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === category
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Chart Options Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {CHART_CATEGORIES[selectedCategory].map((chart) => {
                    const Icon = chart.icon;
                    return (
                      <button
                        key={chart.id}
                        onClick={() => {
                          setSelectedChart(chart.id);
                          setShowMenu(false);
                        }}
                        className={`flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
                          selectedChart === chart.id
                            ? 'bg-blue-50 border-2 border-blue-600 text-blue-900'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{chart.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowMenu(false)}
                  className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Chart Display */}
      <div className="relative">
        {ChartComponent ? (
          <ChartComponent {...getChartProps()} />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>Chart type not found</p>
          </div>
        )}
        
        {/* Chart Type Badge */}
        <div className="absolute top-2 left-2 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200">
          <p className="text-xs font-medium text-gray-600">
            {CHART_CATEGORIES[selectedCategory]?.find(c => c.id === selectedChart)?.name || selectedChart}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChartSelector;

