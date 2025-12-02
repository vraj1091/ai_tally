"""
Test script to check actual XML structure from backup file
"""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

def analyze_xml_sample():
    """Analyze a sample of the XML to understand structure"""
    # Try to find a recent backup file or use a sample
    print("=== XML STRUCTURE ANALYSIS ===")
    print("\nThis script will help identify how Tally stores balance data in XML")
    print("Please upload a backup file and check the backend logs for XML structure")
    print("\nKey things to check:")
    print("1. Balance field names (CLOSINGBALANCE, CURRENTBALANCE, etc.)")
    print("2. Nested structures (balance might be in child elements)")
    print("3. Parent group names (to match keywords)")
    print("4. Whether balances are stored as text or attributes")
    
    # We'll add actual XML parsing if we can access a file
    print("\nRun this after uploading a backup file to see the structure")

if __name__ == "__main__":
    analyze_xml_sample()

