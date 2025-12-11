/**
 * PROFESSIONAL DESIGN EXAMPLES
 * Copy these patterns into your actual components
 * This is NOT AI-generated design - it's enterprise-grade!
 */

import React from 'react'
import '../styles/professional.css'

// ====================================
// 1. PROFESSIONAL DASHBOARD EXAMPLE
// ====================================
export function ProfessionalDashboard() {
  return (
    <div className="content-wrapper">
      {/* Header Section */}
      <div style={{ 
        marginBottom: 'var(--space-8)',
        paddingBottom: 'var(--space-6)',
        borderBottom: '1px solid var(--neutral-200)' 
      }}>
        <h1 style={{ 
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: 'var(--neutral-900)',
          marginBottom: 'var(--space-2)'
        }}>
          Dashboard
        </h1>
        <p style={{ 
          fontSize: 'var(--text-base)',
          color: 'var(--neutral-600)'
        }}>
          Welcome to your AI Tally Assistant
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--space-6)',
        marginBottom: 'var(--space-8)'
      }}>
        {/* Stat Card 1 */}
        <div className="pro-stat-card">
          <div className="pro-stat-label">Total Documents</div>
          <div className="pro-stat-value">248</div>
          <div className="pro-stat-change positive">
            <span>↑ 12.5%</span>
            <span style={{ color: 'var(--neutral-500)' }}>vs last month</span>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="pro-stat-card">
          <div className="pro-stat-label">Queries Today</div>
          <div className="pro-stat-value">1,429</div>
          <div className="pro-stat-change positive">
            <span>↑ 8.2%</span>
            <span style={{ color: 'var(--neutral-500)' }}>vs yesterday</span>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="pro-stat-card">
          <div className="pro-stat-label">Tally Companies</div>
          <div className="pro-stat-value">12</div>
          <span className="pro-badge pro-badge-success">Connected</span>
        </div>

        {/* Stat Card 4 */}
        <div className="pro-stat-card">
          <div className="pro-stat-label">RAG Vectors</div>
          <div className="pro-stat-value">45.2K</div>
          <span className="pro-badge pro-badge-info">Active</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 'var(--space-6)'
      }}>
        {/* Recent Activity Card */}
        <div className="pro-card">
          <div className="pro-card-header">
            <h3 className="pro-card-title">Recent Activity</h3>
            <p className="pro-card-subtitle">Your latest interactions</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'var(--neutral-50)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ 
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, var(--brand-blue), var(--brand-sky))',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600
                }}>
                  📄
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: 'var(--neutral-900)' }}>
                    Document uploaded
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>
                    2 hours ago
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="pro-card">
          <div className="pro-card-header">
            <h3 className="pro-card-title">Quick Actions</h3>
            <p className="pro-card-subtitle">Common tasks</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button className="pro-btn pro-btn-primary" style={{ width: '100%' }}>
              📤 Upload Document
            </button>
            <button className="pro-btn pro-btn-secondary" style={{ width: '100%' }}>
              💬 New Chat
            </button>
            <button className="pro-btn pro-btn-secondary" style={{ width: '100%' }}>
              🔄 Sync Tally Data
            </button>
            <button className="pro-btn pro-btn-ghost" style={{ width: '100%' }}>
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ====================================
// 2. PROFESSIONAL DOCUMENTS PAGE
// ====================================
export function ProfessionalDocumentsPage() {
  const documents = [
    { name: 'Financial_Report_Q4.pdf', size: '2.4 MB', date: '2024-11-15', status: 'processed' },
    { name: 'Invoice_Template.docx', size: '145 KB', date: '2024-11-14', status: 'processing' },
    { name: 'Annual_Budget.xlsx', size: '890 KB', date: '2024-11-13', status: 'processed' }
  ]

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div style={{ 
        marginBottom: 'var(--space-8)',
        paddingBottom: 'var(--space-6)',
        borderBottom: '1px solid var(--neutral-200)' 
      }}>
        <h1 style={{ 
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: 'var(--neutral-900)',
          marginBottom: 'var(--space-2)'
        }}>
          Documents
        </h1>
        <p style={{ 
          fontSize: 'var(--text-base)',
          color: 'var(--neutral-600)'
        }}>
          Manage your uploaded documents and knowledge base
        </p>
      </div>

      {/* Upload Section */}
      <div className="pro-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="pro-card-header">
          <h3 className="pro-card-title">📤 Upload New Document</h3>
          <p className="pro-card-subtitle">Supported: PDF, DOCX, TXT, Images</p>
        </div>
        <div style={{ 
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <input 
            type="file" 
            className="pro-input"
            style={{ flex: 1, minWidth: '250px' }}
          />
          <button className="pro-btn pro-btn-primary">
            Upload & Process
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)'
      }}>
        <div className="pro-stat-card">
          <div className="pro-stat-label">Total Documents</div>
          <div className="pro-stat-value">248</div>
        </div>
        <div className="pro-stat-card">
          <div className="pro-stat-label">Storage Used</div>
          <div className="pro-stat-value">12.4 GB</div>
        </div>
        <div className="pro-stat-card">
          <div className="pro-stat-label">Vector Chunks</div>
          <div className="pro-stat-value">45.2K</div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="pro-card">
        <div className="pro-card-header">
          <h3 className="pro-card-title">Your Documents</h3>
        </div>
        
        {documents.length === 0 ? (
          <div className="pro-empty-state">
            <div className="pro-empty-icon">📄</div>
            <h3 className="pro-empty-title">No documents yet</h3>
            <p className="pro-empty-description">Upload your first document to get started</p>
            <button className="pro-btn pro-btn-primary">Upload Document</button>
          </div>
        ) : (
          <table className="pro-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span>📄</span>
                      <span style={{ fontWeight: 500 }}>{doc.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--neutral-600)' }}>{doc.size}</td>
                  <td style={{ color: 'var(--neutral-600)' }}>{doc.date}</td>
                  <td>
                    {doc.status === 'processed' ? (
                      <span className="pro-badge pro-badge-success">Processed</span>
                    ) : (
                      <span className="pro-badge pro-badge-warning">Processing</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="pro-btn pro-btn-ghost" style={{ padding: 'var(--space-2)' }}>
                        View
                      </button>
                      <button 
                        className="pro-btn pro-btn-ghost" 
                        style={{ padding: 'var(--space-2)', color: 'var(--error)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ====================================
// 3. PROFESSIONAL CHAT INTERFACE
// ====================================
export function ProfessionalChatPage() {
  const messages = [
    { role: 'user', content: 'What is our total revenue for Q4?' },
    { role: 'assistant', content: 'Based on your Tally data, the total revenue for Q4 2024 is ₹12,45,670. This represents a 15.3% increase compared to Q3.' }
  ]

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--space-8))',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: 'var(--space-6)'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 'var(--space-6)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--neutral-200)' 
      }}>
        <h1 style={{ 
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          color: 'var(--neutral-900)',
          marginBottom: 'var(--space-1)'
        }}>
          💬 AI Chat Assistant
        </h1>
        <p style={{ 
          fontSize: 'var(--text-sm)',
          color: 'var(--neutral-600)'
        }}>
          Ask questions about your documents and Tally data
        </p>
      </div>

      {/* Messages Area */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)'
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{ 
              maxWidth: '70%',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, var(--brand-blue), var(--brand-sky))'
                : 'white',
              color: msg.role === 'user' ? 'white' : 'var(--neutral-800)',
              boxShadow: 'var(--shadow-sm)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--neutral-200)'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="pro-card" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <input 
            type="text"
            placeholder="Ask me anything..."
            className="pro-input"
            style={{ flex: 1 }}
          />
          <button className="pro-btn pro-btn-primary">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ====================================
// 4. PROFESSIONAL SETTINGS PAGE
// ====================================
export function ProfessionalSettingsPage() {
  return (
    <div className="content-wrapper">
      {/* Header */}
      <div style={{ 
        marginBottom: 'var(--space-8)',
        paddingBottom: 'var(--space-6)',
        borderBottom: '1px solid var(--neutral-200)' 
      }}>
        <h1 style={{ 
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: 'var(--neutral-900)',
          marginBottom: 'var(--space-2)'
        }}>
          Settings
        </h1>
        <p style={{ 
          fontSize: 'var(--text-base)',
          color: 'var(--neutral-600)'
        }}>
          Configure your AI Tally Assistant
        </p>
      </div>

      {/* Settings Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Tally Connection */}
        <div className="pro-card">
          <div className="pro-card-header">
            <h3 className="pro-card-title">🔗 Tally Connection</h3>
            <p className="pro-card-subtitle">Configure your Tally ERP connection</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ 
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--neutral-700)',
                marginBottom: 'var(--space-2)'
              }}>
                Tally URL
              </label>
              <input 
                type="text"
                placeholder="http://localhost:9000"
                defaultValue="http://localhost:9000"
                className="pro-input"
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="pro-btn pro-btn-primary">Test Connection</button>
              <button className="pro-btn pro-btn-secondary">Save</button>
            </div>
            <div style={{ 
              padding: 'var(--space-3)',
              background: 'var(--success-light)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓</span>
              <span style={{ color: 'var(--success)', fontSize: 'var(--text-sm)' }}>
                Connected successfully
              </span>
            </div>
          </div>
        </div>

        {/* RAG Configuration */}
        <div className="pro-card">
          <div className="pro-card-header">
            <h3 className="pro-card-title">🧠 RAG Configuration</h3>
            <p className="pro-card-subtitle">Vector database and AI settings</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ 
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--neutral-700)',
                marginBottom: 'var(--space-2)'
              }}>
                Chunk Size
              </label>
              <input 
                type="number"
                defaultValue="1000"
                className="pro-input"
              />
            </div>
            <div>
              <label style={{ 
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--neutral-700)',
                marginBottom: 'var(--space-2)'
              }}>
                Similarity Threshold
              </label>
              <input 
                type="number"
                step="0.1"
                defaultValue="0.7"
                className="pro-input"
              />
            </div>
            <button className="pro-btn pro-btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ====================================
// USAGE INSTRUCTIONS
// ====================================

/**
 * HOW TO USE THESE EXAMPLES:
 * 
 * 1. Import the professional CSS:
 *    import '../styles/professional.css'
 * 
 * 2. Copy the component structure you like
 * 
 * 3. Replace your existing component code
 * 
 * 4. Customize the data and functionality
 * 
 * 5. All styling is done with CSS classes and inline styles
 *    using CSS variables for consistency
 * 
 * KEY CLASSES TO USE:
 * - pro-card: Main card container
 * - pro-card-header: Card header
 * - pro-card-title: Card title
 * - pro-btn pro-btn-primary: Primary button
 * - pro-btn pro-btn-secondary: Secondary button
 * - pro-input: Input field
 * - pro-table: Data table
 * - pro-badge: Status badge
 * - pro-stat-card: Statistics card
 * - pro-empty-state: Empty state message
 * 
 * This design is PROFESSIONAL and MODERN,
 * not AI-generated looking!
 */

