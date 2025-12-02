import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboards = [
  { name: 'CEODashboard', title: 'CEO Dashboard', desc: 'Complete business overview', color: '#3b82f6' },
  { name: 'CFODashboard', title: 'CFO Dashboard', desc: 'Financial health metrics', color: '#10b981' },
  { name: 'ExecutiveSummaryDashboard', title: 'Executive Summary', desc: 'High-level insights', color: '#8b5cf6' },
  { name: 'SalesDashboard', title: 'Sales Dashboard', desc: 'Sales performance', color: '#ef4444' },
  { name: 'InventoryDashboard', title: 'Inventory Dashboard', desc: 'Stock management', color: '#f59e0b' },
  { name: 'RealtimeOperationsDashboard', title: 'Real-time Operations', desc: 'Live operations', color: '#06b6d4' },
  { name: 'AccountsReceivableDashboard', title: 'Accounts Receivable', desc: 'Outstanding invoices', color: '#10b981' },
  { name: 'AccountsPayableDashboard', title: 'Accounts Payable', desc: 'Payment obligations', color: '#ef4444' },
  { name: 'CashFlowDashboard', title: 'Cash Flow', desc: 'Cash movement', color: '#3b82f6' },
  { name: 'ProfitLossDashboard', title: 'Profit & Loss', desc: 'Income statement', color: '#10b981' },
  { name: 'BalanceSheetDashboard', title: 'Balance Sheet', desc: 'Financial position', color: '#8b5cf6' },
  { name: 'TaxDashboard', title: 'Tax Dashboard', desc: 'Tax obligations', color: '#f59e0b' },
  { name: 'ComplianceDashboard', title: 'Compliance', desc: 'Regulatory tracking', color: '#10b981' },
  { name: 'BudgetActualDashboard', title: 'Budget vs Actual', desc: 'Budget tracking', color: '#3b82f6' },
  { name: 'ForecastingDashboard', title: 'Forecasting', desc: 'Predictive analytics', color: '#8b5cf6' },
  { name: 'CustomerAnalyticsDashboard', title: 'Customer Analytics', desc: 'Customer insights', color: '#ec4899' },
  { name: 'VendorAnalyticsDashboard', title: 'Vendor Analytics', desc: 'Supplier metrics', color: '#06b6d4' },
  { name: 'ProductPerformanceDashboard', title: 'Product Performance', desc: 'Product analysis', color: '#f59e0b' },
  { name: 'ExpenseAnalysisDashboard', title: 'Expense Analysis', desc: 'Cost breakdown', color: '#ef4444' },
  { name: 'RevenueAnalysisDashboard', title: 'Revenue Analysis', desc: 'Revenue streams', color: '#10b981' }
];

const template = (name, title, desc, color) => `import React, { useState, useEffect } from 'react';
import { KPICard, ChartCard, StatCard, AlertCard, ProgressBar, mockData, COLORS } from './DashboardTemplate';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiUsers, FiActivity, FiCheckCircle } from 'react-icons/fi';

const ${name} = () => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('month');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">${title}</h2>
          <p className="text-gray-600 mt-1">${desc}</p>
        </div>
        <div className="flex gap-2">
          {['day', 'week', 'month', 'quarter', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={\`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors \${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }\`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value="₹25.0L"
          change="+12.5%"
          trend="up"
          icon={FiDollarSign}
          color="${color}"
          subtitle="This month"
        />
        <KPICard
          title="Growth Rate"
          value="18.5%"
          change="+5.2%"
          trend="up"
          icon={FiTrendingUp}
          color="#10b981"
          subtitle="vs last month"
        />
        <KPICard
          title="Active Users"
          value="1,250"
          change="+8.3%"
          trend="up"
          icon={FiUsers}
          color="#8b5cf6"
          subtitle="Total count"
        />
        <KPICard
          title="Efficiency"
          value="94.2%"
          change="+2.1%"
          trend="up"
          icon={FiActivity}
          color="#f59e0b"
          subtitle="Performance"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Trend Analysis">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mockData.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="${color}" fill="${color}40" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef444440" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockData.distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => \`\${name}: \${(percent * 100).toFixed(0)}%\`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {mockData.distribution.map((entry, index) => (
                  <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Performance Metrics">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mockData.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="profit" fill="${color}" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Growth Metrics">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mockData.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="${color}" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="space-y-4">
          <StatCard icon={FiDollarSign} label="Average Value" value="₹180K" color="${color}" />
          <StatCard icon={FiTrendingUp} label="Growth" value="+15.5%" color="#10b981" />
          <StatCard icon={FiActivity} label="Activity" value="850" color="#8b5cf6" />
        </div>
      </div>

      {/* Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Insights</h3>
          <AlertCard type="success" title="Strong Performance" message="Revenue increased by 12.5% this month" />
          <AlertCard type="info" title="Target Progress" message="75% of monthly target achieved" />
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Action Items</h3>
          <AlertCard type="warning" title="Attention Needed" message="Expenses growing faster than revenue" />
          <AlertCard type="error" title="Critical Alert" message="2 pending approvals require attention" />
        </div>
      </div>

      {/* Progress Tracking */}
      <ChartCard title="Goal Progress">
        <div className="space-y-4">
          <ProgressBar label="Monthly Target" value={75} max={100} color="${color}" />
          <ProgressBar label="Quarterly Target" value={62} max={100} color="#10b981" />
          <ProgressBar label="Annual Target" value={45} max={100} color="#8b5cf6" />
        </div>
      </ChartCard>
    </div>
  );
};

export default ${name};
`;

const dir = path.join(__dirname, 'src', 'components', 'dashboards');

dashboards.forEach(({ name, title, desc, color }) => {
  const filePath = path.join(dir, `${name}.jsx`);
  fs.writeFileSync(filePath, template(name, title, desc, color));
  console.log(`✓ Created ${name}.jsx`);
});

console.log(`\n✅ Successfully created ${dashboards.length} dashboards!`);

