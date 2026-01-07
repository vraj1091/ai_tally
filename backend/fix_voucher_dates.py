"""
Fix Tally XML Import - Add BILLALLOCATIONS.LIST to vouchers with party ledgers

This script fixes the "Voucher Date is missing" error by adding proper
bill allocations to all vouchers involving Sundry Debtors/Creditors.
"""

import re
import os
from datetime import datetime

def fix_tally_xml(input_file, output_file):
    """
    Process the Tally XML file and add BILLALLOCATIONS.LIST to party ledger entries.
    Uses streaming approach to handle large files efficiently.
    """
    print(f"Starting to process: {input_file}")
    print(f"Output will be saved to: {output_file}")
    
    start_time = datetime.now()
    
    # Read the entire file (we need to process vouchers as blocks)
    print("Reading input file...")
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"File size: {len(content):,} characters")
    
    # Find all voucher blocks and process them
    voucher_pattern = re.compile(
        r'(<VOUCHER\s+VCHTYPE="([^"]+)"\s+ACTION="Create">)(.*?)(</VOUCHER>)',
        re.DOTALL
    )
    
    # Pattern to find ledger entries that need bill allocations
    ledger_entry_pattern = re.compile(
        r'(<ALLLEDGERENTRIES\.LIST>\s*<LEDGERNAME>([^<]+)</LEDGERNAME>\s*<AMOUNT>([^<]+)</AMOUNT>\s*)(</ALLLEDGERENTRIES\.LIST>)',
        re.DOTALL
    )
    
    # Track statistics
    stats = {
        'total_vouchers': 0,
        'sales_fixed': 0,
        'purchase_fixed': 0,
        'receipt_fixed': 0,
        'payment_fixed': 0,
        'journal_fixed': 0,
        'ledger_entries_fixed': 0
    }
    
    def process_voucher(match):
        """Process a single voucher and add bill allocations where needed."""
        voucher_start = match.group(1)
        vch_type = match.group(2)
        voucher_content = match.group(3)
        voucher_end = match.group(4)
        
        stats['total_vouchers'] += 1
        
        if stats['total_vouchers'] % 10000 == 0:
            print(f"  Processed {stats['total_vouchers']:,} vouchers...")
        
        # Extract voucher number and date for bill reference
        vch_num_match = re.search(r'<VOUCHERNUMBER>([^<]+)</VOUCHERNUMBER>', voucher_content)
        date_match = re.search(r'<DATE>([^<]+)</DATE>', voucher_content)
        
        vch_number = vch_num_match.group(1) if vch_num_match else "REF1"
        vch_date = date_match.group(1) if date_match else "20240401"
        
        # Determine bill type based on voucher type
        # Sales/Receipt = New Ref (creating receivables) or Against Ref (settling)
        # Purchase/Payment = New Ref (creating payables) or Against Ref (settling)
        
        def add_bill_allocation(entry_match):
            """Add BILLALLOCATIONS.LIST to a ledger entry."""
            entry_start = entry_match.group(1)
            ledger_name = entry_match.group(2)
            amount = entry_match.group(3)
            entry_end = entry_match.group(4)
            
            # Determine bill type based on voucher type and amount sign
            amount_val = float(amount)
            
            if vch_type == "Sales":
                # For Sales: Debit party (negative amount) = New Ref
                bill_type = "New Ref"
                stats['sales_fixed'] += 1
            elif vch_type == "Purchase":
                # For Purchase: Credit party (positive amount) = New Ref
                bill_type = "New Ref"
                stats['purchase_fixed'] += 1
            elif vch_type == "Receipt":
                # For Receipt: Credit party (negative amount) = Against Ref
                # But since we don't have existing refs, use New Ref
                bill_type = "New Ref"
                stats['receipt_fixed'] += 1
            elif vch_type == "Payment":
                # For Payment: Debit party (positive amount) = Against Ref
                # But since we don't have existing refs, use New Ref
                bill_type = "New Ref"
                stats['payment_fixed'] += 1
            elif vch_type == "Journal":
                bill_type = "New Ref"
                stats['journal_fixed'] += 1
            else:
                bill_type = "New Ref"
            
            stats['ledger_entries_fixed'] += 1
            
            # Create the bill allocation block
            bill_allocation = f"""<BILLALLOCATIONS.LIST>
<NAME>{vch_number}</NAME>
<BILLTYPE>{bill_type}</BILLTYPE>
<AMOUNT>{amount}</AMOUNT>
</BILLALLOCATIONS.LIST>
"""
            
            return entry_start + bill_allocation + entry_end
        
        # Only process vouchers that involve party ledgers
        # Check if PARTYLEDGERNAME exists (indicates party transaction)
        if '<PARTYLEDGERNAME>' in voucher_content:
            # Get the party ledger name
            party_match = re.search(r'<PARTYLEDGERNAME>([^<]+)</PARTYLEDGERNAME>', voucher_content)
            if party_match:
                party_name = party_match.group(1)
                
                # Find and fix the ledger entry for this party
                def fix_party_entry(entry_match):
                    ledger_name = entry_match.group(2)
                    # Only add bill allocation if this is the party ledger entry
                    if ledger_name == party_name:
                        return add_bill_allocation(entry_match)
                    return entry_match.group(0)
                
                voucher_content = ledger_entry_pattern.sub(fix_party_entry, voucher_content)
        
        return voucher_start + voucher_content + voucher_end
    
    print("Processing vouchers and adding bill allocations...")
    fixed_content = voucher_pattern.sub(process_voucher, content)
    
    print(f"\nWriting output file...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print("\n" + "="*60)
    print("PROCESSING COMPLETE!")
    print("="*60)
    print(f"\nStatistics:")
    print(f"  Total vouchers processed: {stats['total_vouchers']:,}")
    print(f"  Sales vouchers fixed: {stats['sales_fixed']:,}")
    print(f"  Purchase vouchers fixed: {stats['purchase_fixed']:,}")
    print(f"  Receipt vouchers fixed: {stats['receipt_fixed']:,}")
    print(f"  Payment vouchers fixed: {stats['payment_fixed']:,}")
    print(f"  Journal vouchers fixed: {stats['journal_fixed']:,}")
    print(f"  Total ledger entries with bill allocations: {stats['ledger_entries_fixed']:,}")
    print(f"\nTime taken: {duration:.2f} seconds")
    print(f"\nOutput file: {output_file}")
    print(f"Output file size: {os.path.getsize(output_file):,} bytes")
    
    return stats


if __name__ == "__main__":
    # Input and output file paths
    input_file = "tally_2lakh_data.xml"
    output_file = "tally_2lakh_data_fixed.xml"
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found!")
        print("Please make sure you're running this script from the backend directory.")
        exit(1)
    
    # Process the file
    fix_tally_xml(input_file, output_file)
    
    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("="*60)
    print("1. Open Tally Prime")
    print("2. Go to Gateway > Import")
    print(f"3. Select the fixed file: {output_file}")
    print("4. The 'Voucher Date is missing' errors should be resolved!")

