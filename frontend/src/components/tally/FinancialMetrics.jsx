import React from 'react'

export default function FinancialMetrics({ summary }) {
  if (!summary) {
    return <p>No financial summary available.</p>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow text-center">
        <p className="text-sm text-gray-500">Total Revenue</p>
        <p className="text-2xl font-bold text-green-600">₹{summary.total_revenue.toLocaleString()}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow text-center">
        <p className="text-sm text-gray-500">Total Expense</p>
        <p className="text-2xl font-bold text-red-600">₹{summary.total_expense.toLocaleString()}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow text-center">
        <p className="text-sm text-gray-500">Net Profit</p>
        <p className="text-2xl font-bold">{summary.net_profit.toLocaleString()}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow text-center">
        <p className="text-sm text-gray-500">Ledger Count</p>
        <p className="text-2xl font-bold">{summary.ledger_count}</p>
      </div>
    </div>
  )
}
 
