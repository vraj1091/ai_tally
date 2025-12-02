
import sys
import os
import json
import logging
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

try:
    from app.services.tbk_parser import TallyBackupParser
    from app.services.tally_service import TallyDataService
    from app.services.specialized_analytics import SpecializedAnalytics
    from app.services.data_transformer import DataTransformer
except ImportError as e:
    logger.error(f"Import Error: {e}")
    logger.info("Make sure you are running this from the project root")
    sys.exit(1)

# Mock TallyService
class MockTallyService:
    def __init__(self, data):
        self.data = data
        self.user = type('obj', (object,), {'id': 1})
        self.db = None
    
    def get_all_company_data(self, company_name, use_cache=True, source="backup"):
        return self.data
    
    def get_ledgers_for_company(self, company_name, use_cache=True):
        return self.data.get('ledgers', [])
        
    def get_vouchers_for_company(self, company_name, use_cache=True):
        return self.data.get('vouchers', [])

def analyze_xml(xml_path):
    if not os.path.exists(xml_path):
        logger.error(f"File not found: {xml_path}")
        return

    logger.info(f"Parsing {xml_path}...")
    parser = TallyBackupParser()
    
    try:
        # Parse the XML
        data = parser.parse_tbk_file(xml_path)
        
        # Calculate summary using TallyDataService logic
        # We need to instantiate TallyDataService to use its method, 
        # but we can just use the method if we extract it or bind it to a dummy
        
        # Create a dummy instance to access the method
        tally_service = TallyDataService(db=None, user=None)
        summary = tally_service._calculate_summary_from_backup_data(data)
        
        # Add summary to data
        data['summary'] = summary
        
        logger.info("-" * 50)
        logger.info("DATA EXTRACTION SUMMARY")
        logger.info("-" * 50)
        logger.info(f"Companies: {len(data.get('companies', []))}")
        logger.info(f"Ledgers: {len(data.get('ledgers', []))}")
        logger.info(f"Vouchers: {len(data.get('vouchers', []))}")
        logger.info(f"Stock Items: {len(data.get('stock_items', []))}")
        
        logger.info("-" * 50)
        logger.info("CALCULATED FINANCIAL SUMMARY")
        logger.info("-" * 50)
        for k, v in summary.items():
            logger.info(f"{k}: {v}")
            
        # Run Specialized Analytics
        mock_service = MockTallyService(data)
        analytics = SpecializedAnalytics(mock_service)
        
        company_name = data['companies'][0]['name'] if data['companies'] else "Test Company"
        
        logger.info("-" * 50)
        logger.info("DASHBOARD ANALYTICS TEST")
        logger.info("-" * 50)
        
        # Test CEO Dashboard
        ceo_data = analytics.get_ceo_dashboard_analytics(company_name, source="backup")
        logger.info(f"CEO Dashboard Revenue: {ceo_data.get('financial_overview', {}).get('total_revenue')}")
        logger.info(f"CEO Dashboard Expense: {ceo_data.get('financial_overview', {}).get('total_expenses')}")
        
        # Test Sales Dashboard
        sales_data = analytics.get_sales_analytics(company_name, source="backup")
        logger.info(f"Sales Dashboard Total Sales: {sales_data.get('sales_summary', {}).get('total_sales')}")
        
        # Test Inventory
        prod_data = analytics.get_product_performance_analytics(company_name, source="backup")
        logger.info(f"Product Dashboard Inventory: {prod_data.get('product_summary', {}).get('total_inventory_value')}")
        
        # Check for 0 values
        zero_metrics = []
        if summary.get('total_revenue', 0) == 0: zero_metrics.append("Revenue")
        if summary.get('total_expense', 0) == 0: zero_metrics.append("Expense")
        if summary.get('total_assets', 0) == 0: zero_metrics.append("Assets")
        if summary.get('total_liabilities', 0) == 0: zero_metrics.append("Liabilities")
        
        if zero_metrics:
            logger.warning(f"ZERO VALUES DETECTED FOR: {', '.join(zero_metrics)}")
            logger.warning("Possible causes: Ledger parent/name mismatch, parsing error, or empty XML.")
            
            # Debug Ledgers
            logger.info("Debugging Top 5 Ledgers by Balance:")
            ledgers = data.get('ledgers', [])
            sorted_ledgers = sorted(ledgers, key=lambda x: abs(float(x.get('closing_balance', 0) or 0)), reverse=True)
            for l in sorted_ledgers[:5]:
                logger.info(f"  {l.get('name')} ({l.get('parent')}): {l.get('closing_balance')}")

    except Exception as e:
        logger.error(f"Error during analysis: {e}", exc_info=True)

if __name__ == "__main__":
    xml_file = "tally_data_30k.xml"
    if len(sys.argv) > 1:
        xml_file = sys.argv[1]
    
    analyze_xml(xml_file)
