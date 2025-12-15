import React from 'react';
import { FiCloud, FiLink, FiHardDrive } from 'react-icons/fi';

const DataSourceSelector = ({ value, onChange }) => {
  const sources = [
    { id: 'live', label: 'Live', icon: FiCloud, color: '#10B981', desc: 'Real-time Tally' },
    { id: 'bridge', label: 'Bridge', icon: FiLink, color: '#0EA5E9', desc: 'Via Bridge' },
    { id: 'backup', label: 'Backup', icon: FiHardDrive, color: '#F59E0B', desc: 'From backup' }
  ];

  return (
    <div className="flex rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border-color)' }}>
      {sources.map((source, i) => (
        <button
          key={source.id}
          onClick={() => onChange(source.id)}
          className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all relative"
          style={{
            background: value === source.id ? source.color : 'var(--bg-surface)',
            color: value === source.id ? 'white' : 'var(--text-secondary)',
            borderRight: i < sources.length - 1 ? '1px solid var(--border-color)' : 'none'
          }}
          title={source.desc}
        >
          <source.icon className="w-4 h-4" />
          <span className="hidden sm:inline">{source.label}</span>
          {value === source.id && (
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-white opacity-50" />
          )}
        </button>
      ))}
    </div>
  );
};

export default DataSourceSelector;
