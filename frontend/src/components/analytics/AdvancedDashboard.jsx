import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { 
  FiTrendingUp, FiTrendingDown, FiDollarSign, FiUsers, 
  FiShoppingCart, FiPackage, FiAlertCircle, FiCheckCircle,
  FiClock, FiActivity, FiBarChart2, FiPieChart
} from 'react-icons/fi';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const AdvancedDashboard = ({ data, type = 'financial' }) => {
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [timeRange, setTimeRange] = useState('month');

  // Financial Health Score
  const calculateHealthScore = (data) => {
    if (!data) return 0;
    let score = 50; // Base score
    
    // Positive factors
    if (data.profit_margin > 10) score += 15;
    if (data.current_ratio > 1.5) score += 10;
    if (data.debt_to_equity < 1) score += 10;
    if (data.revenue_growth > 0) score += 15;
    
    // Negative factors
    if (data.profit_margin < 0) score -= 20;
    if (data.current_ratio < 1) score -= 15;
    if (data.debt_to_equity > 2) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  };

  // KPI Cards
  const KPICard = ({ title, value, change, icon: Icon, trend, color }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {trend === 'up' ? <FiTrendingUp className="w-4 h-4" /> : <FiTrendingDown className="w-4 h-4" />}
            <span className="text-sm font-semibold">{change}</span>
          </div>
        )}
      </div>
      {data?.sparkline && (
        <div className="h-12 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.sparkline}>
              <Area type="monotone" dataKey="value" stroke={color} fill={`${color}40`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // Financial Health Gauge
  const HealthGauge = ({ score }) => {
    const getColor = (score) => {
      if (score >= 80) return '#10b981';
      if (score >= 60) return '#3b82f6';
      if (score >= 40) return '#f59e0b';
      return '#ef4444';
    };

    const getStatus = (score) => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 40) return 'Fair';
      return 'Poor';
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiActivity className="w-5 h-5 text-blue-600" />
          Financial Health Score
        </h3>
        <div className="relative w-48 h-48 mx-auto">
          <svg viewBox="0 0 200 200" className="transform -rotate-90">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="20" />
            <circle 
              cx="100" 
              cy="100" 
              r="80" 
              fill="none" 
              stroke={getColor(score)} 
              strokeWidth="20"
              strokeDasharray={`${score * 5.03} 503`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold" style={{ color: getColor(score) }}>{score}</span>
            <span className="text-sm text-gray-600 mt-1">{getStatus(score)}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">80-100: Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-600">60-79: Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600">40-59: Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">0-39: Poor</span>
          </div>
        </div>
      </div>
    );
  };

  // Advanced Metrics Radar Chart
  const MetricsRadar = ({ data }) => {
    const radarData = [
      { metric: 'Profitability', value: data?.profit_margin || 0 },
      { metric: 'Liquidity', value: data?.current_ratio * 20 || 0 },
      { metric: 'Efficiency', value: data?.asset_turnover * 20 || 0 },
      { metric: 'Growth', value: data?.revenue_growth || 0 },
      { metric: 'Stability', value: 100 - (data?.debt_to_equity * 20 || 0) }
    ];

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiPieChart className="w-5 h-5 text-purple-600" />
          Performance Metrics
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Cash Flow Waterfall
  const CashFlowWaterfall = ({ data }) => {
    const waterfallData = data?.cashflow || [
      { name: 'Opening', value: 1000, type: 'positive' },
      { name: 'Revenue', value: 500, type: 'positive' },
      { name: 'Expenses', value: -300, type: 'negative' },
      { name: 'Closing', value: 1200, type: 'positive' }
    ];

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiBarChart2 className="w-5 h-5 text-blue-600" />
          Cash Flow Analysis
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={waterfallData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value">
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.type === 'positive' ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const healthScore = calculateHealthScore(data);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['day', 'week', 'month', 'quarter', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`₹${((data?.total_revenue || 0) / 10000000).toFixed(2)}Cr`}
          change="+12.5%"
          trend="up"
          icon={FiDollarSign}
          color="#10b981"
        />
        <KPICard
          title="Net Profit"
          value={`₹${((data?.net_profit || 0) / 10000000).toFixed(2)}Cr`}
          change="+8.3%"
          trend="up"
          icon={FiTrendingUp}
          color="#3b82f6"
        />
        <KPICard
          title="Total Customers"
          value={data?.total_customers || 0}
          change="+5.2%"
          trend="up"
          icon={FiUsers}
          color="#8b5cf6"
        />
        <KPICard
          title="Pending Invoices"
          value={data?.pending_invoices || 0}
          change="-3.1%"
          trend="down"
          icon={FiClock}
          color="#f59e0b"
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <HealthGauge score={healthScore} />
        </div>
        <div className="lg:col-span-2">
          <CashFlowWaterfall data={data} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsRadar data={data} />
        
        {/* Trend Analysis */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiActivity className="w-5 h-5 text-green-600" />
            Revenue vs Expense Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" fill="#10b98120" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} />
              <Bar dataKey="profit" fill="#3b82f6" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5 text-red-600" />
            Critical Alerts
          </h3>
          <div className="space-y-3">
            {(data?.alerts || []).map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">{alert.title}</p>
                  <p className="text-sm text-red-700 mt-1">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-green-600" />
            Key Insights
          </h3>
          <div className="space-y-3">
            {(data?.insights || []).map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <FiCheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">{insight.title}</p>
                  <p className="text-sm text-green-700 mt-1">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedDashboard;

