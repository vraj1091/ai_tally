
import sys
import os
import logging
import json

# Add current directory to path to allow imports
sys.path.append(os.getcwd())

from app.services.tbk_parser import TallyBackupParser
from app.services.data_transformer import DataTransformer

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler("debug_log.txt", mode='w'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def create_sample_xml(source_path, target_path, lines=2000):
    logger.info(f"Creating sample XML from {source_path}...")
    with open(source_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = []
        for i in range(lines):
            line = f.readline()
            if not line:
                break
            content.append(line)
        
        # Ensure closing tags if truncated (simple heuristic)
        if content and '</ENVELOPE>' not in content[-1]:
            content.append('</BODY></ENVELOPE>')
            
    with open(target_path, 'w', encoding='utf-8') as f:
        f.writelines(content)
    logger.info(f"Sample XML created at {target_path}")

def test_parsing():
    original_xml_path = r"c:\Users\vrajr\Desktop\ai-tally-assistant-integrated\ai-tally-assistant-integrated\tally_data_30k.xml"
    sample_xml_path = r"c:\Users\vrajr\Desktop\ai-tally-assistant-integrated\ai-tally-assistant-integrated\backend\sample_tally.xml"
    
    if not os.path.exists(original_xml_path):
        logger.error(f"File not found: {original_xml_path}")
        return

    create_sample_xml(original_xml_path, sample_xml_path)

    logger.info(f"Parsing {sample_xml_path}...")
    parser = TallyBackupParser()
    try:
        data = parser.parse_tbk_file(sample_xml_path)
    except Exception as e:
        logger.error(f"Parsing failed: {e}")
        return

    ledgers = data.get("ledgers", [])
    vouchers = data.get("vouchers", [])
    
    logger.info(f"Found {len(ledgers)} ledgers")
    logger.info(f"Found {len(vouchers)} vouchers")

    # Analyze Ledgers
    logger.info("\n--- Ledger Analysis ---")
    non_zero_ledgers = [l for l in ledgers if l.get('closing_balance', 0) != 0 or l.get('opening_balance', 0) != 0]
    logger.info(f"Ledgers with non-zero balance: {len(non_zero_ledgers)}")
    
    if non_zero_ledgers:
        logger.info("Sample non-zero ledgers:")
        for l in non_zero_ledgers[:5]:
            logger.info(f"  Name: {l.get('name')}, Parent: {l.get('parent')}, Closing: {l.get('closing_balance')}, Opening: {l.get('opening_balance')}")
    else:
        logger.warning("No ledgers with non-zero balance found!")
        if ledgers:
            logger.info("Sample raw ledger (first one):")
            logger.info(json.dumps(ledgers[0], indent=2))

    # Analyze Vouchers
    logger.info("\n--- Voucher Analysis ---")
    non_zero_vouchers = [v for v in vouchers if v.get('amount', 0) > 0]
    logger.info(f"Vouchers with non-zero amount: {len(non_zero_vouchers)}")
    
    if non_zero_vouchers:
        logger.info("Sample non-zero vouchers:")
        for v in non_zero_vouchers[:5]:
            logger.info(f"  Type: {v.get('voucher_type')}, Date: {v.get('date')}, Amount: {v.get('amount')}")
    else:
        logger.warning("No vouchers with non-zero amount found!")
        if vouchers:
            logger.info("Sample raw voucher (first one):")
            logger.info(json.dumps(vouchers[0], indent=2))

    # Test DataTransformer
    logger.info("\n--- DataTransformer Test ---")
    normalized_ledgers = DataTransformer.normalize_ledgers(ledgers)
    normalized_vouchers = DataTransformer.normalize_vouchers(vouchers)
    
    logger.info(f"Normalized Ledgers: {len(normalized_ledgers)}")
    logger.info(f"Normalized Vouchers: {len(normalized_vouchers)}")
    
    # Check if normalization preserved data
    norm_non_zero_ledgers = [l for l in normalized_ledgers if l.get('balance', 0) > 0]
    logger.info(f"Normalized Ledgers with balance > 0: {len(norm_non_zero_ledgers)}")
    
    if norm_non_zero_ledgers:
         logger.info("Sample normalized ledger:")
         logger.info(json.dumps(norm_non_zero_ledgers[0], indent=2))
         
    # Check if normalization preserved vouchers
    norm_non_zero_vouchers = [v for v in normalized_vouchers if v.get('amount', 0) > 0]
    logger.info(f"Normalized Vouchers with amount > 0: {len(norm_non_zero_vouchers)}")
    
    if norm_non_zero_vouchers:
        logger.info("Sample normalized voucher:")
        logger.info(json.dumps(norm_non_zero_vouchers[0], indent=2))

if __name__ == "__main__":
    test_parsing()
