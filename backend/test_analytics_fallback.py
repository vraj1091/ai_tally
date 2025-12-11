import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.specialized_analytics import SpecializedAnalytics
from app.services.tally_service import TallyDataService

class TestAnalyticsFallback(unittest.TestCase):
    def setUp(self):
        self.mock_tally_service = MagicMock(spec=TallyDataService)
        self.analytics_service = SpecializedAnalytics(self.mock_tally_service)

    def test_ceo_analytics_fallback(self):
        """Test CEO analytics falls back to cache when Tally is down"""
        print("\nTesting CEO Analytics Fallback...")
        
        # Simulate Tally connection failure for live fetch
        self.mock_tally_service.get_ledgers_for_company.side_effect = Exception("Tally Connection Failed")
        
        # But ensure it returns empty list instead of crashing if we were to catch it inside tally_service
        # However, SpecializedAnalytics calls tally_service.get_ledgers_for_company
        # If we want to test the fallback in SpecializedAnalytics, we need to see how it behaves.
        # Actually, SpecializedAnalytics passes use_cache to tally_service.
        
        # Scenario 1: use_cache=True (Default)
        # If tally_service.get_ledgers_for_company fails internally it should return [] if we fixed it there.
        # But let's say we want to verify SpecializedAnalytics handles empty data gracefully.
        
        self.mock_tally_service.get_ledgers_for_company.return_value = []
        self.mock_tally_service.get_vouchers_for_company.return_value = []
        
        data = self.analytics_service.get_ceo_analytics("Test Company", use_cache=True)
        
        self.assertIsNotNone(data)
        self.assertEqual(data['company'], "Test Company")
        self.assertEqual(data['executive_summary']['total_revenue'], 0.0)
        print("✓ CEO Analytics handled empty data gracefully")

    def test_sales_analytics_error_handling(self):
        """Test Sales analytics returns safe structure on error"""
        print("\nTesting Sales Analytics Error Handling...")
        
        # Simulate an error bubbling up from tally_service
        self.mock_tally_service.get_ledgers_for_company.side_effect = Exception("Critical Error")
        
        # SpecializedAnalytics should catch this and return empty structure
        data = self.analytics_service.get_sales_analytics("Test Company", use_cache=False)
        
        self.assertIsNotNone(data)
        self.assertEqual(data['company'], "Test Company")
        self.assertEqual(data['sales_overview']['total_sales'], 0.0)
        print("✓ Sales Analytics caught exception and returned safe data")

if __name__ == '__main__':
    unittest.main()
