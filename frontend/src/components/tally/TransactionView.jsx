import React from 'react'

export default function TransactionView({ vouchers }) {
  if (!vouchers || vouchers.length === 0) {
    return <p>No transactions available.</p>
  }

  return (
    <div className="overflow-auto max-h-96 border rounded-lg bg-white shadow">
      <table className="table-auto w-full text-sm divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Voucher Number</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Party Name</th>
            <th className="px-4 py-2 text-right">Amount</th>
            <th className="px-4 py-2 text-left">Narration</th>
          </tr>
        </thead>
        <tbody>
          {vouchers.map((voucher, idx) => (
            <tr key={idx} className="hover:bg-gray-100">
              <td className="px-4 py-2">{voucher.voucher_number}</td>
              <td className="px-4 py-2">{voucher.voucher_type}</td>
              <td className="px-4 py-2">{voucher.date}</td>
              <td className="px-4 py-2">{voucher.party_name}</td>
              <td className="px-4 py-2 text-right">₹{voucher.amount.toFixed(2)}</td>
              <td className="px-4 py-2">{voucher.narration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
 
