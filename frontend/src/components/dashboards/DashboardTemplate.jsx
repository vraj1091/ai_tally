// Reusable Dashboard Component Template
import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { 
  FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity,
  FiAlertCircle, FiCheckCircle, FiClock, FiUsers
} from 'react-icons/fi';

export const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const KPICard = ({ title, value, change, icon: Icon, trend, color, subtitle }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-shadow" style={{ borderColor: color }}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
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
  </div>
);

export const ChartCard = ({ title, children, actions }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

export const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
    <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
      <Icon className="w-6 h-6" style={{ color }} />
    </div>
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export const AlertCard = ({ type = 'info', title, message }) => {
  const styles = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-900' },
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', text: 'text-green-900' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', text: 'text-yellow-900' },
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', text: 'text-red-900' }
  };

  const style = styles[type];
  const Icon = type === 'error' || type === 'warning' ? FiAlertCircle : FiCheckCircle;

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${style.icon} mt-0.5`} />
        <div>
          <p className={`font-medium ${style.text}`}>{title}</p>
          <p className={`text-sm ${style.text} opacity-80 mt-1`}>{message}</p>
        </div>
      </div>
    </div>
  );
};

export const ProgressBar = ({ label, value, max, color }) => {
  const percentage = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{value} / {max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="h-3 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export const mockData = {
  kpis: {
    revenue: { value: 2500000, change: '+12.5%', trend: 'up' },
    expenses: { value: 1800000, change: '+5.2%', trend: 'up' },
    profit: { value: 700000, change: '+25.8%', trend: 'up' },
    customers: { value: 1250, change: '+8.3%', trend: 'up' }
  },
  trends: [
    { month: 'Jan', revenue: 180000, expense: 130000, profit: 50000 },
    { month: 'Feb', revenue: 210000, expense: 145000, profit: 65000 },
    { month: 'Mar', revenue: 250000, expense: 160000, profit: 90000 },
    { month: 'Apr', revenue: 280000, expense: 175000, profit: 105000 },
    { month: 'May', revenue: 320000, expense: 190000, profit: 130000 },
    { month: 'Jun', revenue: 350000, expense: 200000, profit: 150000 }
  ],
  distribution: [
    { name: 'Product A', value: 450000 },
    { name: 'Product B', value: 350000 },
    { name: 'Product C', value: 280000 },
    { name: 'Product D', value: 180000 }
  ]
};

export default { KPICard, ChartCard, StatCard, AlertCard, ProgressBar, mockData, COLORS };

