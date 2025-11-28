import React from 'react';
import { FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TestPage = () => {
  const handleTest = () => {
    toast.success('✓ React Hot Toast is working!');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#667eea', marginBottom: '20px' }}>🧪 Test Page</h1>
      
      <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '10px' }}>Icon Test:</h2>
        <div style={{ display: 'flex', gap: '10px', fontSize: '32px', color: '#10b981' }}>
          <FiCheckCircle />
          <FiRefreshCw />
          <span style={{ fontSize: '16px', alignSelf: 'center' }}>← Icons from react-icons/fi</span>
        </div>
      </div>

      <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '10px' }}>Toast Test:</h2>
        <button 
          onClick={handleTest}
          style={{
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Test Toast Notification
        </button>
      </div>

      <div style={{ background: '#d1fae5', padding: '20px', borderRadius: '8px' }}>
        <h2 style={{ color: '#065f46', marginBottom: '10px' }}>✓ Status</h2>
        <ul style={{ color: '#047857', lineHeight: '1.8' }}>
          <li>✓ React rendering correctly</li>
          <li>✓ react-icons/fi loaded</li>
          <li>✓ react-hot-toast loaded</li>
          <li>✓ No import errors</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#fef3c7', borderRadius: '4px' }}>
        <strong>Note:</strong> If you can see this page, all basic imports are working!
      </div>
    </div>
  );
};

export default TestPage;

