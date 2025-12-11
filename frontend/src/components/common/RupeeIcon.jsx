import React from 'react';

/**
 * Custom Rupee (₹) Icon Component
 * Replaces FiDollarSign throughout the application
 */
export const RupeeIcon = ({ className = "w-5 h-5", ...props }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Rupee symbol ₹ */}
      <path d="M6 3h12" />
      <path d="M6 7h12" />
      <path d="M10 11h8" />
      <path d="M6 11h2c1.7 0 3 1.3 3 3v0c0 1.7-1.3 3-3 3H6" />
      <path d="M11 17l7 4" />
    </svg>
  );
};

export default RupeeIcon;

