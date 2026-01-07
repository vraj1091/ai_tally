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
  Chip,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  People,
  LocalOffer,
  Refresh,
  ArrowUpward,
  ArrowDownward
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
  LineChart,
  Line
} from 'recharts';
import tallyApi from '../../api/tallyApi';
import { useAuthStore } from '../../store/authStore';

const RealSalesDashboard = () => {
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
      setError("Failed to load companies");
    }
  };

  const fetchDashboardData = async (companyName, forceRefresh = false) => {
    setLoading(true);
    if (forceRefresh) setRefreshing(true);
    setError(null);

    try {
      const response = await tallyApi.getSalesDashboardData(companyName, forceRefresh);

      if (response.success) {
        setDashboardData(response.data);
        setLastUpdated(new Date());
      } else {
        setError("Failed to load sales data");
      }
    } catch (err) {
      console.error("Error fetching sales data:", err);
      setError("Failed to connect to Tally. Displaying cached data if available.");
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
            Sales Performance
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            {selectedCompany} • {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading || refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
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
          {/* Metrics Row */}
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Total Sales"
              value={formatCurrency(dashboardData.sales_overview?.total_sales || 0)}
              subValue={`${dashboardData.sales_overview?.sales_count || 0} Transactions`}
              icon={<ShoppingCart />}
              color={theme.palette.primary.main}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Avg Sale Value"
              value={formatCurrency(dashboardData.sales_overview?.avg_sale_value || 0)}
              icon={<LocalOffer />}
              color={theme.palette.secondary.main}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Sales Growth"
              value={`${dashboardData.sales_overview?.sales_growth || 0}%`}
              trend="vs Last Month"
              icon={<TrendingUp />}
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Conversion Rate"
              value={`${dashboardData.sales_pipeline?.conversion_rate || 0}%`}
              icon={<People />}
              color={theme.palette.info.main}
            />
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Top Customers</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.top_customers?.slice(0, 5) || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill={theme.palette.primary.main} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Top Products</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.top_products?.slice(0, 5).map((product, index) => (
                      <TableRow key={index}>
                        <TableCell component="th" scope="row">
                          {product.name}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(product.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Typography color="textSecondary">Select a company to view sales data</Typography>
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
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
              {trend}
            </Typography>
          )}
        </Box>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color: color }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default RealSalesDashboard;
