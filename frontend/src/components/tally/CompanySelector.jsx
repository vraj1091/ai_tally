import React from 'react'
import useTallyStore from '../../store/tallyStore'

export default function CompanySelector() {
  const { companies, selectedCompany, setSelectedCompany, connected } = useTallyStore()

  return (
    <div>
      <label htmlFor="company-select" className="block text-sm font-medium text-gray-700 mb-1">
        Select Company
      </label>
      <select
        id="company-select"
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
        value={selectedCompany || ''}
        onChange={(e) => setSelectedCompany(e.target.value)}
        disabled={!connected || companies.length === 0}
      >
        <option value="" disabled>
          {connected ? 'Choose a company' : 'Not connected'}
        </option>
        {companies.map((company, idx) => (
          <option key={idx} value={company}>
            {company}
          </option>
        ))}
      </select>
    </div>
  )
}
 
