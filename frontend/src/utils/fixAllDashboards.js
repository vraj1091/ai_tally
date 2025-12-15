/**
 * Dashboard Fix Template
 * Use this to systematically add empty state checks to all dashboards
 */

const TEMPLATE_IMPORTS = `import { hasRealData } from '../../utils/dataValidator';
import EmptyDataState from '../common/EmptyDataState';`;

const TEMPLATE_EMPTY_CHECK = `
  // Check if we have real data
  if (!dashboardData || !hasRealData(dashboardData, ['key_metric_1', 'key_metric_2'])) {
    return (
      <EmptyDataState 
        title="No Dashboard Data"
        message="Connect to Tally or upload a backup file to view analytics"
        onRefresh={loadData}
        dataSource={dataSource}
      />
    );
  }
`;

// Dashboards that need updating:
const REMAINING_DASHBOARDS = [
  'AccountsPayableDashboard.jsx',
  'VendorAnalyticsDashboard.jsx',
  'RevenueAnalysisDashboard.jsx',
  'ExpenseAnalysisDashboard.jsx',
  'RealtimeOperationsDashboard.jsx',
  'ComplianceDashboard.jsx',
  'ProductPerformanceDashboard.jsx',
  'ForecastingDashboard.jsx',
  'CustomerAnalyticsDashboard.jsx',
  'AccountsReceivableDashboard.jsx',
  'BudgetActualDashboard.jsx',
  'BalanceSheetDashboard.jsx',
  'TaxDashboard.jsx',
  'CEODashboard.jsx'
];

console.log('Remaining dashboards to fix:', REMAINING_DASHBOARDS);
console.log('\nTemplate imports to add:', TEMPLATE_IMPORTS);
console.log('\nTemplate check to add after loading:', TEMPLATE_EMPTY_CHECK);

