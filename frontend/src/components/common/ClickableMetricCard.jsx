import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiChevronRight } from 'react-icons/fi';

/**
 * Clickable Metric Card
 * A KPI card that triggers drill-down when clicked
 */
const ClickableMetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  onClick,
  drillDownType,
  drillDownFilter,
  formatValue,
  className = ''
}) => {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
    green: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
    purple: 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800',
    orange: 'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800',
    red: 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
    indigo: 'from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800',
    pink: 'from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800',
    teal: 'from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800'
  };

  const handleClick = () => {
    if (onClick) {
      onClick(drillDownType || 'metric', drillDownFilter || title, title);
    }
  };

  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <div
      onClick={handleClick}
      className={`
        bg-gradient-to-br ${colorClasses[color] || colorClasses.blue}
        rounded-xl shadow-lg p-6 text-white cursor-pointer
        transform transition-all duration-200 hover:scale-105 hover:shadow-xl
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium opacity-90">{title}</p>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-6 h-6 opacity-75" />}
          <FiChevronRight className="w-4 h-4 opacity-50" />
        </div>
      </div>
      
      <p className="text-3xl sm:text-4xl font-bold mb-2">{displayValue}</p>
      
      {(subtitle || trend !== undefined) && (
        <div className="flex items-center gap-2 text-sm">
          {trend !== undefined && (
            <span className={`flex items-center gap-1 ${
              trend >= 0 ? 'text-green-200' : 'text-red-200'
            }`}>
              {trend >= 0 ? <FiTrendingUp className="w-4 h-4" /> : <FiTrendingDown className="w-4 h-4" />}
              {Math.abs(trendValue || trend).toFixed(1)}%
            </span>
          )}
          {subtitle && <span className="opacity-80">{subtitle}</span>}
        </div>
      )}
      
      <div className="mt-3 pt-3 border-t border-white/20 text-xs opacity-70">
        Click for detailed breakdown →
      </div>
    </div>
  );
};

export default ClickableMetricCard;

