import React from 'react';

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload?.length) {
    return (
      <div 
        className="card px-4 py-3 shadow-lg" 
        style={{ 
          minWidth: 180,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)'
        }}
      >
        {label && (
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
            {label}
          </p>
        )}
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-1">
            <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ background: p.color || p.payload?.fill || p.fill }} 
              />
              {p.name}
            </span>
            <span className="font-semibold text-sm" style={{ color: p.color || p.payload?.fill || p.fill }}>
              {formatter ? formatter(p.value) : (
                typeof p.value === 'number' && p.value > 100 
                  ? formatValue(p.value) 
                  : (p.value?.toFixed?.(2) || p.value)
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const formatValue = (v) => {
  const abs = Math.abs(v || 0);
  if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(abs / 1000).toFixed(2)}K`;
  return `₹${abs.toFixed(0)}`;
};

export default CustomTooltip;

