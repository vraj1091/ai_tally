import React from 'react'
import Card from '../common/Card'

export default function StatsCards({ analytics }) {
  if (!analytics) {
    return <div>No analytics data</div>
  }

  const { total_revenue, total_expense, net_profit, profit_margin, health_score, debt_to_equity } = analytics

  const stats = [
    {
      label: 'Total Revenue',
      value: `$${total_revenue.toLocaleString()}`,
      color: 'text-green-600'
    },
    {
      label: 'Total Expense',
      value: `$${total_expense.toLocaleString()}`,
      color: 'text-red-600'
    },
    {
      label: 'Net Profit',
      value: `$${net_profit.toLocaleString()}`,
      color: 'text-gray-900'
    },
    {
      label: 'Profit Margin',
      value: `${profit_margin.toFixed(2)}%`,
      color: 'text-blue-600'
    },
    {
      label: 'Health Score',
      value: health_score.toFixed(2),
      color: 'text-indigo-600'
    },
    {
      label: 'Debt to Equity',
      value: debt_to_equity.toFixed(2),
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <div className="text-center">
            <p className={`text-3xl font-semibold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
 
