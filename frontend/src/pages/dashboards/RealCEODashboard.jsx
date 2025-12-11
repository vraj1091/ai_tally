import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Chip,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  AccountBalance,
  Warning,
  CheckCircle,
  Refresh,
  Info
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import tallyApi from '../../api/tallyApi';
import { useAuthStore } from '../../store/authStore';

const RealCEODashboard = () => {
  const theme = useTheme();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchDashboardData(selectedCompany);
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const response = await tallyApi.getCompanies();
      
      // Handle both array and object responses
      let companyList = [];
      if (response && response.companies) {
        companyList = Array.isArray(response.companies) ? response.companies : [];
      } else if (Array.isArray(response)) {
        companyList = response;
      }
      
      // Normalize company objects
      const normalizedCompanies = companyList.map(company => {
        if (typeof company === 'string') return { name: company };
        return company && company.name ? company : { name: String(company || 'Unknown Company') };
      });
      
      setCompanies(normalizedCompanies);
      
      if (normalizedCompanies.length > 0 && !selectedCompany) {
        setSelectedCompany(normalizedCompanies[0].name);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError("Failed to load companies. Please check Tally connection.");
    }
  };

  const fetchDashboardData = async (companyName, forceRefresh = false) => {
    setLoading(true);
    if (forceRefresh) setRefreshing(true);
    setError(null);

    try {
      const response = await tallyApi.getCEODashboardData(companyName, forceRefresh);

      if (response.success) {
        setDashboardData(response.data);
        setLastUpdated(new Date());
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to connect to Tally. Displaying cached data if available.");
      // If we have cached data from a previous successful load, we might want to keep showing it
      // But usually the API will return cached data on error if configured, so this catch block implies total failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (selectedCompany) {
      fetchDashboardData(selectedCompany, true);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  if (!selectedCompany && !loading && companies.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          No companies found. Please connect Tally and ensure a company is open.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Executive Overview
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            {selectedCompany} • {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          {/* Company Selector could go here */}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !dashboardData ? (
        <LinearProgress />
      ) : dashboardData ? (
        <Grid container spacing={3}>
          {/* Key Metrics Cards */}
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(dashboardData.executive_summary?.total_revenue || 0)}
              trend={dashboardData.performance_indicators?.revenue_trend}
              icon={<AttachMoney />}
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Net Profit"
              value={formatCurrency(dashboardData.executive_summary?.net_profit || 0)}
              subValue={`${dashboardData.executive_summary?.profit_margin_percent?.toFixed(1)}% Margin`}
              icon={<TrendingUp />}
              color={theme.palette.primary.main}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Total Expenses"
              value={formatCurrency(dashboardData.executive_summary?.total_expense || 0)}
              trend={dashboardData.performance_indicators?.expense_trend}
              icon={<TrendingDown />}
              color={theme.palette.error.main}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Efficiency Score"
              value={dashboardData.performance_indicators?.efficiency_score || 0}
              subValue="out of 100"
              icon={<CheckCircle />}
              color={theme.palette.info.main}
            />
          </Grid>

          {/* Charts Row 1 */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Revenue vs Expense Trend</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Current', Revenue: dashboardData.executive_summary?.total_revenue, Expense: dashboardData.executive_summary?.total_expense }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Revenue" fill={theme.palette.success.main} />
                  <Bar dataKey="Expense" fill={theme.palette.error.main} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Top Expenses</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.top_5_expense_categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {dashboardData.top_5_expense_categories?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[theme.palette.primary.main, theme.palette.secondary.main, theme.palette.error.main, theme.palette.warning.main, theme.palette.info.main][index % 5]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Alerts Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <Warning sx={{ mr: 1, color: theme.palette.warning.main }} />
                Strategic Alerts
              </Typography>
              <Grid container spacing={2}>
                {dashboardData.strategic_alerts?.length > 0 ? (
                  dashboardData.strategic_alerts.map((alert, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Alert severity="warning">{alert}</Alert>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Alert severity="success">No critical alerts. Business is running smoothly.</Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Typography color="textSecondary">Select a company to view dashboard</Typography>
        </Box>
      )}
    </Box>
  );
};

const MetricCard = ({ title, value, subValue, trend, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="subtitle2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color: color }}>
            {value}
          </Typography>
          {subValue && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {subValue}
            </Typography>
          )}
          {trend && (
            <Chip
              label={trend}
              size="small"
              color={trend === 'Increasing' ? 'success' : trend === 'Decreasing' ? 'error' : 'default'}
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color: color }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default RealCEODashboard;
