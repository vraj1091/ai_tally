import React from 'react'

export default function HealthScore({ score }) {
  const getLabel = () => {
    if (score > 80) return 'Excellent'
    if (score > 60) return 'Good'
    if (score > 40) return 'Fair'
    return 'Poor'
  }

  const getColor = () => {
    if (score > 80) return 'text-green-600'
    if (score > 60) return 'text-green-400'
    if (score > 40) return 'text-yellow-500'
    return 'text-red-600'
  }

  return (
    <div className="text-center p-4 bg-gray-100 rounded-lg shadow">
      <p className="text-lg font-semibold">Financial Health Score</p>
      <p className={`text-4xl font-bold ${getColor()}`}>{score.toFixed(2)}</p>
      <p className="text-gray-700">{getLabel()}</p>
    </div>
  )
}
 
