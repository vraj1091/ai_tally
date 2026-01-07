import React, { useEffect, useState } from 'react'
import { tallyApi } from '../api/tallyApi'
import useTallyStore from '../store/tallyStore'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import toast from 'react-hot-toast'

export default function TallyExplorer() {
  const {
    companies,
    ledgers,
    vouchers,
    selectedCompany,
    setCompanies,
    setLedgers,
    setVouchers,
    setSelectedCompany,
    connected,
    setConnected,
    loading,
    setLoading
  } = useTallyStore()
  
  const [error, setError] = useState(null)

  useEffect(() => {
    checkTallyConnection()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      fetchLedgers(selectedCompany)
      // DON'T auto-fetch vouchers - causes Tally to crash!
      // User can manually click "Load Vouchers" button if needed
    }
  }, [selectedCompany])

  const checkTallyConnection = async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await tallyApi.getStatus()
      setConnected(status.connected)
      if (status.connected) {
        const companiesData = await tallyApi.getCompanies()
        setCompanies(companiesData.companies || [])
        toast.success('Connected to Tally')
      } else {
        setError('Tally not connected. Please configure Tally connection.')
        toast.error('Tally not connected')
      }
    } catch (error) {
      console.error('Tally connection error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to connect to Tally'
      setError(errorMessage)
      setConnected(false)
      toast.error('Error connecting to Tally')
    } finally {
      setLoading(false)
    }
  }

  const fetchLedgers = async (company) => {
    setLoading(true)
    try {
      const data = await tallyApi.getLedgers(company, null, false) // Force fresh data
      console.log('Ledgers response:', data) // Debug log
      setLedgers(data.ledgers || [])
      if (data.ledgers && data.ledgers.length > 0) {
        toast.success(`Loaded ${data.ledgers.length} ledgers`)
      }
    } catch (error) {
      console.error('Failed to load ledgers:', error)
      toast.error('Failed to load ledgers')
      setLedgers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchVouchers = async (company) => {
    setLoading(true)
    try {
      const data = await tallyApi.getVouchers(company, null, null, null, null, false) // Force fresh data
      console.log('Vouchers response:', data) // Debug log
      setVouchers(data.vouchers || [])
      if (data.vouchers && data.vouchers.length > 0) {
        toast.success(`Loaded ${data.vouchers.length} vouchers`)
      }
    } catch (error) {
      console.error('Failed to load vouchers:', error)
      toast.error('Failed to load vouchers')
      setVouchers([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tally Explorer</h1>
        <Button 
          onClick={checkTallyConnection} 
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Checking...' : 'Refresh Connection'}
        </Button>
      </div>

      {/* Loading State */}
      {loading && !error && (
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Connecting to Tally...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Troubleshooting:</h4>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    <li>Make sure Tally is running</li>
                    <li>Open a company in Tally</li>
                    <li>Enable Gateway (F12 → Configure → Enable Gateway)</li>
                    <li>Port should be 9000</li>
                    <li>Check Windows Firewall</li>
                  </ul>
                </div>
                <div className="mt-4">
                  <Button onClick={checkTallyConnection} className="btn-primary">
                    Retry Connection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Connection Status */}
      {!loading && !error && (
        <Card>
          <div className={`flex items-center justify-between p-4 rounded-lg ${connected ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full mr-3 ${connected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className={`font-medium ${connected ? 'text-green-800' : 'text-yellow-800'}`}>
                {connected ? 'Connected to Tally' : 'Not Connected'}
              </span>
            </div>
            {connected && (
              <span className="text-sm text-green-600">
                {companies.length} {companies.length === 1 ? 'company' : 'companies'} found
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Company Selection */}
      {connected && !loading && (
        <Card>
          <label htmlFor="company-select" className="block mb-2 font-medium text-gray-700">
            Select Company
          </label>
          <select
            id="company-select"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value)}
            disabled={loading}
          >
            <option value="" disabled>
              Choose a company
            </option>
            {companies.map((company, idx) => {
              // Handle both string and object formats
              const companyName = typeof company === 'string' ? company : company.name
              const companyKey = typeof company === 'string' ? idx : (company.guid || idx)
              
              return (
                <option key={companyKey} value={companyName}>
                  {companyName}
                </option>
              )
            })}
          </select>
        </Card>
      )}

      {/* Ledgers */}
      {selectedCompany && connected && !loading && (
        <Card title="Ledgers">
          {ledgers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">No ledgers found</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ledgers.map((ledger, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer bg-white"
                    title={`Opening: ₹${ledger.opening_balance?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}, Closing: ₹${ledger.closing_balance?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}`}
                  >
                    <div className="font-medium text-gray-900">{ledger.name}</div>
                    {ledger.closing_balance !== undefined && (
                      <div className="text-sm text-gray-600 mt-1">
                        Balance: ₹{ledger.closing_balance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Vouchers */}
      {selectedCompany && connected && !loading && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Vouchers</h2>
            <span className="text-sm text-gray-600">{vouchers.length} vouchers</span>
          </div>
          {vouchers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 font-medium">No vouchers found</p>
              <p className="text-sm mt-1">Add vouchers in Tally to see them here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {vouchers.map((voucher, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{voucher.voucher_type || 'Voucher'}</span>
                        {voucher.voucher_number && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">#{voucher.voucher_number}</span>
                        )}
                      </div>
                      {voucher.party_name && (
                        <div className="text-sm text-gray-600 mt-1">
                          Party: {voucher.party_name}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-indigo-600">
                        ₹{Math.abs(voucher.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      {voucher.date && (
                        <div className="text-xs text-gray-500 mt-1">{voucher.date}</div>
                      )}
                    </div>
                  </div>
                  {voucher.narration && (
                    <div className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded italic">
                      "{voucher.narration}"
                    </div>
                  )}
                </div>
              ))}
              {vouchers.length > 10 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  Showing first {Math.min(vouchers.length, 10)} of {vouchers.length} vouchers
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
 
