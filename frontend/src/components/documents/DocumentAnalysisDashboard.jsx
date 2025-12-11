import React, { useState, useEffect } from 'react';
import { documentApi } from '../../api/documentApi';
import toast from 'react-hot-toast';
import {
  FiFile, FiFileText, FiDownload, FiTrash2, FiEye, FiBarChart2,
  FiPieChart, FiTrendingUp, FiDollarSign, FiCalendar, FiCheckCircle,
  FiAlertCircle, FiUpload
} from 'react-icons/fi';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DocumentAnalysisDashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState('list'); // list, analysis, comparison

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentApi.listDocuments();
      setDocuments(response.documents || []);
    } catch (error) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    setUploading(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      await documentApi.uploadDocuments(formData);
      toast.success('Documents uploaded successfully!');
      await fetchDocuments();
      
      // Automatically analyze if single file
      if (files.length === 1) {
        analyzeDocument(files[0]);
      }
    } catch (error) {
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const analyzeDocument = async (doc) => {
    setLoading(true);
    try {
      // Check file type and analyze accordingly
      const fileType = doc.name.split('.').pop().toLowerCase();
      
      let analysisResult = {};

      if (fileType === 'pdf') {
        analysisResult = await analyzePDF(doc);
      } else if (['xlsx', 'xls', 'csv'].includes(fileType)) {
        analysisResult = await analyzeSpreadsheet(doc);
      } else {
        toast.error('Unsupported file type');
        return;
      }

      setAnalysis(analysisResult);
      setSelectedDoc(doc);
      setView('analysis');
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Failed to analyze document');
    } finally {
      setLoading(false);
    }
  };

  const analyzePDF = async (file) => {
    // Mock PDF analysis - In production, this would call backend
    return {
      type: 'invoice',
      totalAmount: 15000,
      items: [
        { name: 'Product A', quantity: 5, price: 1000, total: 5000 },
        { name: 'Product B', quantity: 10, price: 1000, total: 10000 }
      ],
      date: new Date().toISOString(),
      vendor: 'ABC Corp',
      invoiceNumber: 'INV-2024-001',
      taxAmount: 2700,
      subtotal: 15000,
      total: 17700,
      categories: [
        { name: 'Products', value: 15000 },
        { name: 'Tax', value: 2700 }
      ],
      paymentStatus: 'Pending',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  };

  const analyzeSpreadsheet = async (file) => {
    // Mock spreadsheet analysis
    return {
      type: 'financial_data',
      totalRecords: 150,
      columns: ['Date', 'Description', 'Amount', 'Category'],
      summary: {
        totalAmount: 250000,
        avgAmount: 1666.67,
        maxAmount: 50000,
        minAmount: 100
      },
      categoryBreakdown: [
        { name: 'Sales', value: 150000, count: 50 },
        { name: 'Expenses', value: 80000, count: 80 },
        { name: 'Refunds', value: 20000, count: 20 }
      ],
      monthlyTrend: [
        { month: 'Jan', amount: 50000 },
        { month: 'Feb', amount: 60000 },
        { month: 'Mar', amount: 70000 },
        { month: 'Apr', amount: 70000 }
      ],
      insights: [
        { type: 'positive', message: 'Revenue increased by 40% compared to last month' },
        { type: 'warning', message: 'Expenses are 32% of revenue' },
        { type: 'info', message: '150 transactions processed in total' }
      ]
    };
  };

  // Document List View
  const DocumentListView = () => (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
        <div className="text-center">
          <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Documents</h3>
          <p className="text-gray-600 mb-4">Drag & drop or click to upload PDF, Excel, or CSV files</p>
          <input
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            <FiUpload className="w-5 h-5" />
            Select Files
          </label>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FiFileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 truncate">{doc.name}</h4>
                  <p className="text-sm text-gray-600">{doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => analyzeDocument(doc)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
              >
                <FiBarChart2 className="w-4 h-4" />
                Analyze
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <FiEye className="w-4 h-4" />
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <FiDownload className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Analysis View
  const AnalysisView = () => {
    if (!analysis) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Document Analysis</h2>
              <p className="text-gray-600 mt-1">{selectedDoc?.name}</p>
            </div>
            <button
              onClick={() => setView('list')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to List
            </button>
          </div>
        </div>

        {/* Invoice Analysis */}
        {analysis.type === 'invoice' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <FiDollarSign className="w-8 h-8 mb-2" />
                <p className="text-sm opacity-90">Total Amount</p>
                <p className="text-3xl font-bold">₹{analysis.total.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <FiFileText className="w-8 h-8 mb-2" />
                <p className="text-sm opacity-90">Invoice Number</p>
                <p className="text-2xl font-bold">{analysis.invoiceNumber}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <FiCalendar className="w-8 h-8 mb-2" />
                <p className="text-sm opacity-90">Due Date</p>
                <p className="text-xl font-bold">{new Date(analysis.dueDate).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <FiAlertCircle className="w-8 h-8 mb-2" />
                <p className="text-sm opacity-90">Status</p>
                <p className="text-xl font-bold">{analysis.paymentStatus}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Amount Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analysis.categories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ₹${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analysis.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Items</h3>
                <div className="space-y-3">
                  {analysis.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity} × ₹{item.price}</p>
                      </div>
                      <p className="font-bold text-gray-900">₹{item.total.toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Spreadsheet Analysis */}
        {analysis.type === 'financial_data' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <FiDollarSign className="w-8 h-8 mb-2" />
                <p className="text-sm opacity-90">Total Amount</p>
                <p className="text-3xl font-bold">₹{(analysis.summary.totalAmount / 100000).toFixed(2)}L</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <FiBarChart2 className="w-8 h-8 mb-2" />
                <p className="text-sm opacity-90">Total Records</p>
                <p className="text-3xl font-bold">{analysis.totalRecords}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <FiTrendingUp className="w-8 h-8 mb-2" />
                <p className="text-sm opacity-90">Average Amount</p>
                <p className="text-2xl font-bold">₹{analysis.summary.avgAmount.toFixed(0)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <FiPieChart className="w-8 h-8 mb-2" />
                <p className="text-sm opacity-90">Categories</p>
                <p className="text-3xl font-bold">{analysis.categoryBreakdown.length}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysis.categoryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analysis.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
              <div className="space-y-3">
                {analysis.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-lg ${
                      insight.type === 'positive' ? 'bg-green-50 border border-green-200' :
                      insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    {insight.type === 'positive' ? (
                      <FiCheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : insight.type === 'warning' ? (
                      <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    ) : (
                      <FiBarChart2 className="w-5 h-5 text-blue-600 mt-0.5" />
                    )}
                    <p className="text-sm text-gray-900">{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  if (uploading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Uploading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Analysis</h1>
            <p className="text-gray-600 mt-1">Intelligent analysis of your documents</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setView('analysis')}
              disabled={!analysis}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'analysis' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              } disabled:opacity-50`}
            >
              Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'list' && <DocumentListView />}
      {view === 'analysis' && <AnalysisView />}
    </div>
  );
};

export default DocumentAnalysisDashboard;

