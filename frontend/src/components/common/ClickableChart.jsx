import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

/**
 * Clickable Chart Component
 * Wraps Recharts components with click-to-drill-down functionality
 */
const ClickableChart = ({
  type = 'bar',
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  title,
  height = 300,
  onItemClick,
  drillDownType,
  formatValue,
  colors = COLORS,
  showLegend = true,
  className = ''
}) => {
  const handleClick = (data, index) => {
    if (onItemClick && data) {
      const name = data[nameKey] || data.name || `Item ${index}`;
      onItemClick(drillDownType || 'chart', name, `${title} - ${name}`);
    }
  };

  const formatCurrency = (value) => {
    if (formatValue) return formatValue(value);
    const absValue = Math.abs(value || 0);
    if (absValue >= 10000000) return `₹${(absValue / 10000000).toFixed(1)}Cr`;
    if (absValue >= 100000) return `₹${(absValue / 100000).toFixed(1)}L`;
    if (absValue >= 1000) return `₹${(absValue / 1000).toFixed(1)}K`;
    return `₹${absValue.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label || payload[0].name}</p>
          <p className="text-lg font-bold text-blue-600">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Click for details</p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const processedData = data.map(item => ({
      ...item,
      [dataKey]: Math.abs(item[dataKey] || item.value || item.amount || 0)
    }));

    switch (type) {
      case 'bar':
        return (
          <BarChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey={nameKey} 
              tick={{ fontSize: 11 }} 
              angle={data.length > 4 ? -45 : 0}
              textAnchor={data.length > 4 ? "end" : "middle"}
              height={data.length > 4 ? 80 : 50}
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Bar 
              dataKey={dataKey} 
              fill={colors[0]} 
              radius={[8, 8, 0, 0]}
              cursor="pointer"
              onClick={(data, index) => handleClick(data, index)}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Bar>
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => {
                const shortName = name.length > 12 ? name.substring(0, 10) + '...' : name;
                return `${shortName}: ${(percent * 100).toFixed(0)}%`;
              }}
              outerRadius={100}
              fill="#8884d8"
              dataKey={dataKey}
              cursor="pointer"
              onClick={(data, index) => handleClick(data, index)}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
          </PieChart>
        );

      case 'line':
        return (
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={colors[0]} 
              strokeWidth={3}
              dot={{ fill: colors[0], strokeWidth: 2, r: 6, cursor: 'pointer' }}
              activeDot={{ r: 8, onClick: (e, data) => handleClick(data.payload, data.index) }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={processedData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={colors[0]} 
              fillOpacity={1} 
              fill="url(#colorValue)"
              cursor="pointer"
              onClick={(data, index) => handleClick(data, index)}
            />
          </AreaChart>
        );

      default:
        return null;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[${height}px] text-gray-500 ${className}`}>
        <div className="text-center">
          <p className="text-sm">No data available</p>
          <p className="text-xs text-gray-400 mt-1">Data will appear here when available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
      <p className="text-xs text-center text-gray-400 mt-2">
        💡 Click on any element for detailed breakdown
      </p>
    </div>
  );
};

export default ClickableChart;

