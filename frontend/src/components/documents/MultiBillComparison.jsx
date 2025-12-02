import React, { useState } from 'react';
import { 
  FiFile, FiUpload, FiTrash2, FiCheck, FiX, FiTrendingUp,
  FiTrendingDown, FiAlertCircle, FiDownload, FiBarChart2
} from 'react-icons/fi';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const MultiBillComparison = () => {
  const [bills, setBills] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [comparison, setComparison] = useState(null);

  // Mock bill analysis - In production, this would call backend API
  const analyzeBill = (file) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          filename: file.name,
          total: Math.floor(Math.random() * 50000) + 10000,
          items: Math.floor(Math.random() * 20) + 5,
          tax: Math.floor(Math.random() * 5000) + 1000,
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          vendor: `Vendor ${Math.floor(Math.random() * 10) + 1}`,
          category: ['Office Supplies', 'Equipment', 'Services', 'Materials'][Math.floor(Math.random() * 4)],
          status: ['Paid', 'Pending', 'Overdue'][Math.floor(Math.random() * 3)]
        });
      }, 1000);
    });
  };

  const handleFileUpload = async (files) => {
    setAnalyzing(true);
    const newBills = [];

    for (const file of Array.from(files)) {
      try {
        const analysis = await analyzeBill(file);
        newBills.push(analysis);
      } catch (error) {
        toast.error(`Failed to analyze ${file.name}`);
      }
    }

    setBills([...bills, ...newBills]);
    setAnalyzing(false);
    toast.success(`✓ Analyzed ${newBills.length} bills`);
    
    // Generate comparison
    if (bills.length + newBills.length > 1) {
      generateComparison([...bills, ...newBills]);
    }
  };

  const generateComparison = (billData) => {
    const totalAmount = billData.reduce((sum, b) => sum + b.total, 0);
    const avgAmount = totalAmount / billData.length;
    const maxBill = Math.max(...billData.map(b => b.total));
    const minBill = Math.min(...billData.map(b => b.total));

    // Category breakdown
    const categoryBreakdown = {};
    billData.forEach(bill => {
      categoryBreakdown[bill.category] = (categoryBreakdown[bill.category] || 0) + bill.total;
    });

    // Vendor breakdown
    const vendorBreakdown = {};
    billData.forEach(bill => {
      vendorBreakdown[bill.vendor] = (vendorBreakdown[bill.vendor] || 0) + bill.total;
    });

    // Monthly trend
    const monthlyData = {};
    billData.forEach(bill => {
      const month = new Date(bill.date).toLocaleDateString('en-IN', { month: 'short' });
      monthlyData[month] = (monthlyData[month] || 0) + bill.total;
    });

    setComparison({
      totalAmount,
      avgAmount,
      maxBill,
      minBill,
      billCount: billData.length,
      categories: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
      vendors: Object.entries(vendorBreakdown).map(([name, value]) => ({ name, value })),
      monthly: Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })),
      statusBreakdown: {
        paid: billData.filter(b => b.status === 'Paid').length,
        pending: billData.filter(b => b.status === 'Pending').length,
        overdue: billData.filter(b => b.status === 'Overdue').length
      }
    });
  };

  const removeBill = (index) => {
    const newBills = bills.filter((_, i) => i !== index);
    setBills(newBills);
    if (newBills.length > 1) {
      generateComparison(newBills);
    } else {
      setComparison(null);
    }
    toast.success('✓ Bill removed');
  };

  const exportComparison = () => {
    if (!comparison) return;

    let csv = 'Multi-Bill Comparison Report\n\n';
    csv += 'Summary\n';
    csv += `Total Amount,₹${comparison.totalAmount.toLocaleString('en-IN')}\n`;
    csv += `Average Amount,₹${comparison.avgAmount.toFixed(2)}\n`;
    csv += `Highest Bill,₹${comparison.maxBill.toLocaleString('en-IN')}\n`;
    csv += `Lowest Bill,₹${comparison.minBill.toLocaleString('en-IN')}\n`;
    csv += `Number of Bills,${comparison.billCount}\n\n`;

    csv += 'Bills Detail\n';
    csv += 'Filename,Amount,Items,Tax,Date,Vendor,Category,Status\n';
    bills.forEach(bill => {
      csv += `${bill.filename},${bill.total},${bill.items},${bill.tax},${bill.date},${bill.vendor},${bill.category},${bill.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bill_comparison_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('✓ Exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Multi-Bill Comparison</h1>
            <p className="text-gray-600 mt-1">Upload multiple bills to analyze and compare</p>
          </div>
          {comparison && (
            <button
              onClick={exportComparison}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FiDownload className="w-4 h-4" />
              Export Report
            </button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
        <div className="text-center">
          <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Bills for Comparison</h3>
          <p className="text-gray-600 mb-4">
            Upload multiple bills (PDF, Excel, CSV) to compare and analyze
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="bill-upload"
          />
          <label
            htmlFor="bill-upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            <FiUpload className="w-5 h-5" />
            {analyzing ? 'Analyzing...' : 'Select Bills'}
          </label>
        </div>
      </div>

      {/* Bills List */}
      {bills.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Uploaded Bills ({bills.length})</h3>
          <div className="space-y-3">
            {bills.map((bill, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <FiFile className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{bill.filename}</p>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>₹{bill.total.toLocaleString('en-IN')}</span>
                      <span>•</span>
                      <span>{bill.items} items</span>
                      <span>•</span>
                      <span>{bill.vendor}</span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        bill.status === 'Paid' ? 'bg-green-100 text-green-700' :
                        bill.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeBill(idx)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <FiBarChart2 className="w-8 h-8 mb-2" />
              <p className="text-sm opacity-90">Total Amount</p>
              <p className="text-3xl font-bold">₹{(comparison.totalAmount / 100000).toFixed(2)}L</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <FiTrendingUp className="w-8 h-8 mb-2" />
              <p className="text-sm opacity-90">Average Bill</p>
              <p className="text-3xl font-bold">₹{(comparison.avgAmount / 1000).toFixed(1)}K</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <FiFile className="w-8 h-8 mb-2" />
              <p className="text-sm opacity-90">Bills Analyzed</p>
              <p className="text-3xl font-bold">{comparison.billCount}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <FiAlertCircle className="w-8 h-8 mb-2" />
              <p className="text-sm opacity-90">Status</p>
              <div className="flex gap-2 mt-2 text-sm">
                <span className="px-2 py-1 bg-white/20 rounded">✓ {comparison.statusBreakdown.paid}</span>
                <span className="px-2 py-1 bg-white/20 rounded">⏱ {comparison.statusBreakdown.pending}</span>
                <span className="px-2 py-1 bg-white/20 rounded">⚠ {comparison.statusBreakdown.overdue}</span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Amount by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={comparison.categories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {comparison.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Vendor Comparison */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Amount by Vendor</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparison.vendors}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Monthly Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparison.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <FiCheck className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Highest Bill</p>
                  <p className="text-sm text-green-700 mt-1">
                    ₹{comparison.maxBill.toLocaleString('en-IN')} - 
                    {((comparison.maxBill / comparison.totalAmount) * 100).toFixed(1)}% of total
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <FiTrendingDown className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Lowest Bill</p>
                  <p className="text-sm text-blue-700 mt-1">
                    ₹{comparison.minBill.toLocaleString('en-IN')} - 
                    {((comparison.minBill / comparison.totalAmount) * 100).toFixed(1)}% of total
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <FiBarChart2 className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900">Average Variance</p>
                  <p className="text-sm text-purple-700 mt-1">
                    Bills vary by ±₹{((comparison.maxBill - comparison.minBill) / 2).toFixed(0)} from average
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Action Required</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {comparison.statusBreakdown.overdue} overdue, {comparison.statusBreakdown.pending} pending approval
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {bills.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <FiFile className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bills Uploaded</h3>
          <p className="text-gray-600">Upload at least 2 bills to start comparing</p>
        </div>
      )}
    </div>
  );
};

export default MultiBillComparison;

