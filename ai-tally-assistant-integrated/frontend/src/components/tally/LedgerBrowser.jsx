import React from 'react'

export default function LedgerBrowser({ ledgers }) {
  if (!ledgers || ledgers.length === 0) {
    return <p>No ledger data available.</p>
  }

  return (
    <div className="overflow-auto max-h-96 border rounded-lg bg-white shadow">
      <table className="table-auto w-full text-sm divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Ledger Name</th>
            <th className="px-4 py-2 text-left">Parent Group</th>
            <th className="px-4 py-2 text-right">Opening Balance</th>
            <th className="px-4 py-2 text-right">Closing Balance</th>
            <th className="px-4 py-2 text-center">Revenue</th>
            <th className="px-4 py-2 text-center">Expense</th>
          </tr>
        </thead>
        <tbody>
          {ledgers.map((ledger, idx) => (
            <tr key={idx} className="hover:bg-gray-100">
              <td className="px-4 py-2">{ledger.name}</td>
              <td className="px-4 py-2">{ledger.parent}</td>
              <td className="px-4 py-2 text-right">₹{ledger.opening_balance.toFixed(2)}</td>
              <td className="px-4 py-2 text-right">₹{ledger.closing_balance.toFixed(2)}</td>
              <td className="px-4 py-2 text-center">
                {ledger.is_revenue ? 'Yes' : 'No'}
              </td>
              <td className="px-4 py-2 text-center">
                {ledger.is_expense ? 'Yes' : 'No'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
 
