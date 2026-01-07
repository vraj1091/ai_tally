"""
Tally Backup (.tbk) File Parser
Extracts data from Tally backup files for viewing without running Tally
"""

import gzip
import tarfile
import zipfile
import tempfile
import shutil
import os
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class TallyBackupParser:
    """Parser for Tally .tbk backup files"""
    
    def __init__(self):
        self.temp_dir = None
    
    def _preprocess_large_xml(self, xml_path: str) -> str:
        """Pre-process large XML file to fix common issues - memory efficient line-by-line processing"""
        import re
        
        file_size_mb = os.path.getsize(xml_path) / (1024 * 1024)
        logger.info(f"Pre-processing {file_size_mb:.2f} MB XML file...")
        
        # Create cleaned file in temp directory
        if not self.temp_dir:
            self.temp_dir = tempfile.mkdtemp(prefix="tally_backup_")
        cleaned_path = os.path.join(self.temp_dir, "cleaned_large.xml")
        
        # Pattern to find unescaped & that aren't already entities
        # This matches & that is NOT followed by (word chars + ;) or (# + digits + ;) or (# + x + hex + ;)
        amp_pattern = re.compile(r'&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#x[0-9a-fA-F]+);)')
        
        lines_processed = 0
        fixes_made = 0
        
        try:
            with open(xml_path, 'r', encoding='utf-8', errors='replace') as infile:
                with open(cleaned_path, 'w', encoding='utf-8') as outfile:
                    for line in infile:
                        # Fix unescaped ampersands
                        if '&' in line:
                            fixed_line = amp_pattern.sub('&amp;', line)
                            if fixed_line != line:
                                fixes_made += 1
                            line = fixed_line
                        
                        outfile.write(line)
                        lines_processed += 1
                        
                        if lines_processed % 100000 == 0:
                            logger.info(f"Pre-processed {lines_processed} lines...")
            
            logger.info(f"Pre-processing complete: {lines_processed} lines, {fixes_made} ampersand fixes")
            return cleaned_path
            
        except Exception as e:
            logger.error(f"Error pre-processing XML: {e}")
            # Return original path if pre-processing fails
            return xml_path
    
    def _parse_xml_streaming(self, xml_path: str) -> Dict[str, Any]:
        """Memory-efficient streaming parser for large XML files (>100MB)"""
        logger.info(f"Starting streaming parse of large file: {xml_path}")
        
        result = {
            "companies": [],
            "ledgers": [],
            "vouchers": [],
            "stock_items": [],
            "groups": [],
            "metadata": {"parse_method": "streaming", "file_path": xml_path}
        }
        
        # Counters for progress logging
        ledger_count = 0
        voucher_count = 0
        company_count = 0
        stock_count = 0
        
        # Pre-process file to fix common XML issues (unescaped &, etc.)
        logger.info("Pre-processing large XML file to fix encoding issues...")
        cleaned_path = self._preprocess_large_xml(xml_path)
        
        try:
            # Use iterparse for memory-efficient streaming
            context = ET.iterparse(cleaned_path, events=('end',))
            
            for event, elem in context:
                tag = elem.tag.upper() if elem.tag else ""
                
                # Process COMPANY elements
                if tag == 'COMPANY':
                    company_data = self._extract_company_streaming(elem)
                    if company_data:
                        result["companies"].append(company_data)
                        company_count += 1
                        logger.info(f"Streaming: Found company: {company_data.get('name', 'Unknown')}")
                    elem.clear()  # Free memory
                
                # Process LEDGER elements
                elif tag == 'LEDGER':
                    ledger_data = self._extract_ledger_streaming(elem)
                    if ledger_data and ledger_data.get('name'):
                        result["ledgers"].append(ledger_data)
                        ledger_count += 1
                        if ledger_count % 5000 == 0:
                            logger.info(f"Streaming: Processed {ledger_count} ledgers...")
                    elem.clear()  # Free memory
                
                # Process VOUCHER elements
                elif tag == 'VOUCHER':
                    voucher_data = self._extract_voucher_streaming(elem)
                    if voucher_data:
                        result["vouchers"].append(voucher_data)
                        voucher_count += 1
                        if voucher_count % 10000 == 0:
                            logger.info(f"Streaming: Processed {voucher_count} vouchers...")
                    elem.clear()  # Free memory
                
                # Process STOCKITEM elements
                elif tag == 'STOCKITEM':
                    stock_data = self._extract_stock_streaming(elem)
                    if stock_data and stock_data.get('name'):
                        result["stock_items"].append(stock_data)
                        stock_count += 1
                    elem.clear()  # Free memory
                
                # Process GROUP elements
                elif tag == 'GROUP':
                    group_name = elem.get('NAME') or self._get_text(elem, 'NAME')
                    if group_name:
                        result["groups"].append({"name": group_name, "parent": self._get_text(elem, 'PARENT')})
                    elem.clear()  # Free memory
                
                # Clear parent references to prevent memory buildup
                if hasattr(elem, 'getparent') and elem.getparent() is not None:
                    elem.getparent().remove(elem)
            
            del context  # Clean up context
            
        except ET.ParseError as e:
            logger.error(f"XML parse error during streaming: {e}")
            raise ValueError(f"XML parse error: {e}")
        except Exception as e:
            logger.error(f"Error during streaming parse: {e}")
            raise
        
        logger.info(f"Streaming parse complete: {company_count} companies, {ledger_count} ledgers, {voucher_count} vouchers, {stock_count} stock items")
        
        # If no company found, create default
        if not result["companies"]:
            result["companies"] = [{"name": "Imported Company", "guid": "default"}]
        
        return result
    
    def _extract_company_streaming(self, elem) -> Optional[Dict]:
        """Extract company data from XML element"""
        try:
            name = elem.get('NAME') or self._get_text(elem, 'NAME')
            if not name:
                return None
            return {
                "name": name,
                "guid": elem.get('GUID') or self._get_text(elem, 'GUID') or "",
                "address": self._get_text(elem, 'ADDRESS'),
                "email": self._get_text(elem, 'EMAIL'),
                "phone": self._get_text(elem, 'PHONENO')
            }
        except:
            return None
    
    def _extract_ledger_streaming(self, elem) -> Optional[Dict]:
        """Extract ledger data from XML element"""
        try:
            name = elem.get('NAME') or self._get_text(elem, 'NAME')
            if not name:
                return None
            
            # Get balance - try multiple field names
            balance = 0.0
            for field in ['CLOSINGBALANCE', 'CURRENTBALANCE', 'BALANCE', 'OPENINGBALANCE']:
                val = self._get_text(elem, field)
                if val:
                    try:
                        cleaned = val.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').strip()
                        if cleaned:
                            balance = float(cleaned)
                            if 'Cr' in val:
                                balance = -abs(balance)
                            break
                    except:
                        continue
            
            return {
                "name": name,
                "parent": self._get_text(elem, 'PARENT') or "",
                "closing_balance": balance,
                "opening_balance": self._get_float(elem, 'OPENINGBALANCE'),
                "guid": elem.get('GUID') or self._get_text(elem, 'GUID') or "",
                "is_revenue": self._get_text(elem, 'ISREVENUE') == 'Yes'
            }
        except:
            return None
    
    def _extract_voucher_streaming(self, elem) -> Optional[Dict]:
        """Extract voucher data from XML element"""
        try:
            vtype = elem.get('VCHTYPE') or self._get_text(elem, 'VOUCHERTYPE') or self._get_text(elem, 'VCHTYPE')
            if not vtype:
                return None
            
            # Get amount
            amount = 0.0
            for field in ['AMOUNT', 'PARTYLEDGERAMOUNT', 'TOTALAMOUNT']:
                val = self._get_text(elem, field)
                if val:
                    try:
                        cleaned = val.replace('₹', '').replace(',', '').replace('-', '').strip()
                        if cleaned:
                            amount = abs(float(cleaned))
                            break
                    except:
                        continue
            
            return {
                "voucher_type": vtype,
                "date": self._get_text(elem, 'DATE') or self._get_text(elem, 'VCHDATE'),
                "amount": amount,
                "party_name": self._get_text(elem, 'PARTYNAME') or self._get_text(elem, 'PARTYLEDGERNAME'),
                "narration": self._get_text(elem, 'NARRATION')
            }
        except:
            return None
    
    def _extract_stock_streaming(self, elem) -> Optional[Dict]:
        """Extract stock item data from XML element"""
        try:
            name = elem.get('NAME') or self._get_text(elem, 'NAME')
            if not name:
                return None
            return {
                "name": name,
                "parent": self._get_text(elem, 'PARENT') or "",
                "closing_balance": self._get_float(elem, 'CLOSINGBALANCE'),
                "closing_value": self._get_float(elem, 'CLOSINGVALUE'),
                "opening_balance": self._get_float(elem, 'OPENINGBALANCE'),
                "opening_value": self._get_float(elem, 'OPENINGVALUE')
            }
        except:
            return None
    
    def _get_text(self, elem, tag: str) -> Optional[str]:
        """Get text content of child element"""
        try:
            child = elem.find(tag)
            if child is not None and child.text:
                return child.text.strip()
            # Try lowercase
            child = elem.find(tag.lower())
            if child is not None and child.text:
                return child.text.strip()
        except:
            pass
        return None
    
    def _get_float(self, elem, tag: str) -> float:
        """Get float value from child element"""
        try:
            text = self._get_text(elem, tag)
            if text:
                cleaned = text.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').strip()
                if cleaned:
                    return abs(float(cleaned))
        except:
            pass
        return 0.0
        
    def extract_tbk(self, tbk_path: str) -> str:
        """Extract .tbk/.001/.zip file to temporary directory"""
        try:
            self.temp_dir = tempfile.mkdtemp(prefix="tally_backup_")
            file_size = os.path.getsize(tbk_path)
            logger.info(f"Processing backup file: {os.path.basename(tbk_path)} ({file_size} bytes)")
            
            # Read more bytes to check for format markers (check first 1KB for better detection)
            with open(tbk_path, 'rb') as check_file:
                first_bytes = check_file.read(1024)  # Read 1KB instead of 100 bytes
                # Check for common markers - be more lenient
                has_xml = b'<?xml' in first_bytes or b'<ENVELOPE' in first_bytes or b'<TALLYMESSAGE' in first_bytes
                has_gzip = first_bytes.startswith(b'\x1f\x8b')
                has_zip = first_bytes.startswith(b'PK')
                
                # Also check if file might be plain XML (even if markers aren't at the very start)
                # Some XML files have BOM or whitespace before <?xml
                check_file.seek(0)
                # Read a larger chunk to search for XML deeper in the file
                larger_chunk = check_file.read(min(8192, file_size))  # Read up to 8KB or file size
                has_xml_deep = b'<?xml' in larger_chunk or b'<ENVELOPE' in larger_chunk or b'<TALLYMESSAGE' in larger_chunk
                
                logger.info(f"Format detection: XML={has_xml or has_xml_deep}, GZIP={has_gzip}, ZIP={has_zip}")
                
                # Only flag as binary if we're CERTAIN it's not a supported format
                # We'll try all extraction methods first before giving up
                is_likely_binary = not has_xml and not has_xml_deep and not has_gzip and not has_zip
                
                if is_likely_binary:
                    logger.warning(f"File does not appear to be XML, GZIP, or ZIP format in first 8KB")
                    logger.warning(f"First bytes (hex): {first_bytes[:50].hex()}")
                    # Don't raise error yet - try extraction methods first
            
            # Try all extraction methods before giving up
            extraction_methods_tried = []
            
            # Method 1: Try as gzip
            try:
                with gzip.open(tbk_path, 'rb') as gz_file:
                    decompressed_data = gz_file.read()
                    # Verify it contains XML
                    if b'<?xml' in decompressed_data or b'<ENVELOPE' in decompressed_data or b'<TALLYMESSAGE' in decompressed_data:
                        # Clean the decompressed data before saving
                        import re
                        # Try multiple encodings
                        content = None
                        for encoding in ['utf-8', 'utf-16-le', 'utf-16-be', 'latin-1', 'cp1252']:
                            try:
                                test_content = decompressed_data.decode(encoding, errors='replace')
                                test_cleaned = test_content.lstrip()
                                if test_cleaned.startswith('<?xml') or test_cleaned.startswith('<ENVELOPE') or test_cleaned.startswith('<TALLYMESSAGE'):
                                    content = test_content
                                    break
                            except:
                                continue
                        
                        if content is None:
                            content = decompressed_data.decode('utf-8', errors='replace')
                        
                        # Find XML start and remove everything before it
                        xml_markers = ['<?xml', '<ENVELOPE', '<TALLYMESSAGE']
                        xml_start_pos = -1
                        for marker in xml_markers:
                            pos = content.find(marker)
                            if pos >= 0:
                                xml_start_pos = pos
                                break
                        
                        if xml_start_pos > 0:
                            content = content[xml_start_pos:]
                        elif xml_start_pos == -1:
                            # Try removing non-printable characters at start
                            content = re.sub(r'^[^\x20-\x7E<]*', '', content)
                            content = content.lstrip()
                            # Try case-insensitive
                            content_upper = content.upper()
                            for marker in ['<?XML', '<ENVELOPE', '<TALLYMESSAGE']:
                                pos = content_upper.find(marker)
                                if pos >= 0:
                                    content = content[pos:]
                                    break
                        
                        # Remove invalid XML characters
                        content = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', content)
                        
                        # Remove invalid Unicode characters
                        valid_chars = []
                        for char in content:
                            code = ord(char)
                            if (code == 0x9 or code == 0xA or code == 0xD or 
                                (0x20 <= code <= 0xD7FF) or (0xE000 <= code <= 0xFFFD) or code > 0xFFFD):
                                valid_chars.append(char)
                        content = ''.join(valid_chars)
                        temp_xml = os.path.join(self.temp_dir, "data.xml")
                        with open(temp_xml, 'w', encoding='utf-8', errors='replace') as f:
                            f.write(content)
                        logger.info(f"✓ Extracted and cleaned backup as gzip to {temp_xml}")
                        return temp_xml
                    else:
                        extraction_methods_tried.append("gzip (no XML found)")
            except (gzip.BadGzipFile, OSError, IOError) as e:
                extraction_methods_tried.append(f"gzip ({str(e)[:50]})")
            
            # Method 2: Try as ZIP file
            try:
                with zipfile.ZipFile(tbk_path, 'r') as zip_ref:
                    zip_ref.extractall(self.temp_dir)
                    xml_files = list(Path(self.temp_dir).rglob("*.xml"))
                    if xml_files:
                        # Validate that the extracted file is actually XML
                        for xml_file in xml_files:
                            try:
                                with open(xml_file, 'rb') as f:
                                    first_bytes = f.read(100)
                                    if b'<?xml' in first_bytes or b'<ENVELOPE' in first_bytes or b'<TALLYMESSAGE' in first_bytes:
                                        logger.info(f"✓ Extracted backup as ZIP, found valid XML file: {xml_file.name}")
                                        return str(xml_file)
                            except:
                                continue
                        extraction_methods_tried.append("zip (XML files found but none are valid Tally XML)")
                    else:
                        extraction_methods_tried.append("zip (no XML files found)")
            except (zipfile.BadZipFile, zipfile.LargeZipFile, OSError) as e:
                extraction_methods_tried.append(f"zip ({str(e)[:50]})")
            
            # Method 3: Try as tar.gz
            try:
                with tarfile.open(tbk_path, 'r:gz') as tar:
                    tar.extractall(self.temp_dir)
                    xml_files = list(Path(self.temp_dir).rglob("*.xml"))
                    if xml_files:
                        logger.info(f"✓ Extracted backup as tar.gz, found {len(xml_files)} XML files")
                        return str(xml_files[0])
                    else:
                        extraction_methods_tried.append("tar.gz (no XML files found)")
            except (tarfile.ReadError, tarfile.TarError, OSError) as e:
                extraction_methods_tried.append(f"tar.gz ({str(e)[:50]})")
            
            # Method 4: Try as plain tar (no compression)
            try:
                with tarfile.open(tbk_path, 'r:') as tar:
                    tar.extractall(self.temp_dir)
                    xml_files = list(Path(self.temp_dir).rglob("*.xml"))
                    if xml_files:
                        logger.info(f"✓ Extracted backup as tar, found {len(xml_files)} XML files")
                        return str(xml_files[0])
                    else:
                        extraction_methods_tried.append("tar (no XML files found)")
            except (tarfile.ReadError, tarfile.TarError, OSError) as e:
                extraction_methods_tried.append(f"tar ({str(e)[:50]})")
            
            # Method 5: Try as plain XML file (with various encodings)
            # Check raw bytes first to detect UTF-16
            with open(tbk_path, 'rb') as check_file:
                first_bytes = check_file.read(4)
                is_utf16_le = first_bytes.startswith(b'\xff\xfe')
                is_utf16_be = first_bytes.startswith(b'\xfe\xff')
            
            # Try UTF-16 first if BOM detected, otherwise try other encodings
            encodings_to_try = []
            if is_utf16_le:
                encodings_to_try = ['utf-16-le', 'utf-16'] + ['utf-8', 'latin-1', 'cp1252']
            elif is_utf16_be:
                encodings_to_try = ['utf-16-be', 'utf-16'] + ['utf-8', 'latin-1', 'cp1252']
            else:
                encodings_to_try = ['utf-8', 'utf-16-le', 'utf-16-be', 'utf-16', 'latin-1', 'cp1252']
            
            for encoding in encodings_to_try:
                try:
                    with open(tbk_path, 'r', encoding=encoding, errors='ignore') as f:
                        # Read first few lines to check
                        first_chunk = f.read(1024).lstrip()  # Strip leading whitespace
                        # Case-insensitive check
                        first_upper = first_chunk.upper()
                        if (first_chunk.startswith('<?xml') or first_chunk.startswith('<ENVELOPE') or 
                            first_chunk.startswith('<TALLYMESSAGE') or first_upper.startswith('<?XML') or
                            first_upper.startswith('<ENVELOPE') or first_upper.startswith('<TALLYMESSAGE')):
                            logger.info(f"✓ Treating backup as plain XML file (encoding: {encoding})")
                            return tbk_path
                except (UnicodeDecodeError, IOError, UnicodeError) as e:
                    continue
            
            # Method 6: Try to read as binary and search for XML markers anywhere in file
            try:
                with open(tbk_path, 'rb') as f:
                    # For large files, read in chunks to avoid memory issues
                    chunk_size = 8192
                    found_xml = False
                    xml_start_pos = 0
                    
                    # Read first chunk
                    chunk = f.read(chunk_size)
                    if b'<?xml' in chunk or b'<ENVELOPE' in chunk or b'<TALLYMESSAGE' in chunk:
                        found_xml = True
                        xml_start_pos = 0
                    else:
                        # Search in larger chunks for large files
                        if file_size < 10 * 1024 * 1024:  # If file < 10MB, read all
                            f.seek(0)
                            content = f.read()
                            if b'<?xml' in content or b'<ENVELOPE' in content or b'<TALLYMESSAGE' in content:
                                found_xml = True
                                # Find XML start position
                                for marker in [b'<?xml', b'<ENVELOPE', b'<TALLYMESSAGE']:
                                    pos = content.find(marker)
                                    if pos >= 0:
                                        xml_start_pos = pos
                                        break
                    
                    if found_xml:
                        # Read from XML start position
                        f.seek(xml_start_pos)
                        raw_content = f.read()
                        
                        # Clean the content before saving
                        import re
                        # Try multiple encodings
                        content = None
                        for encoding in ['utf-8', 'utf-16-le', 'utf-16-be', 'latin-1', 'cp1252']:
                            try:
                                test_content = raw_content.decode(encoding, errors='replace')
                                test_cleaned = test_content.lstrip()
                                if test_cleaned.startswith('<?xml') or test_cleaned.startswith('<ENVELOPE') or test_cleaned.startswith('<TALLYMESSAGE'):
                                    content = test_content
                                    break
                            except:
                                continue
                        
                        if content is None:
                            content = raw_content.decode('utf-8', errors='replace')
                        
                        # Find XML start and remove everything before it
                        xml_markers = ['<?xml', '<ENVELOPE', '<TALLYMESSAGE']
                        xml_start_pos = -1
                        for marker in xml_markers:
                            pos = content.find(marker)
                            if pos >= 0:
                                xml_start_pos = pos
                                break
                        
                        if xml_start_pos > 0:
                            content = content[xml_start_pos:]
                        elif xml_start_pos == -1:
                            # Try removing non-printable characters at start
                            content = re.sub(r'^[^\x20-\x7E<]*', '', content)
                            content = content.lstrip()
                            # Try case-insensitive
                            content_upper = content.upper()
                            for marker in ['<?XML', '<ENVELOPE', '<TALLYMESSAGE']:
                                pos = content_upper.find(marker)
                                if pos >= 0:
                                    content = content[pos:]
                                    break
                        
                        # Remove invalid XML characters
                        content = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', content)
                        
                        # Remove invalid Unicode characters
                        valid_chars = []
                        for char in content:
                            code = ord(char)
                            if (code == 0x9 or code == 0xA or code == 0xD or 
                                (0x20 <= code <= 0xD7FF) or (0xE000 <= code <= 0xFFFD) or code > 0xFFFD):
                                valid_chars.append(char)
                        content = ''.join(valid_chars)
                        
                        temp_xml = os.path.join(self.temp_dir, "data.xml")
                        with open(temp_xml, 'w', encoding='utf-8', errors='replace') as out:
                            out.write(content)
                        logger.info(f"✓ Extracted and cleaned XML from binary file (found at position {xml_start_pos})")
                        return temp_xml
                    else:
                        extraction_methods_tried.append("binary search (no XML markers found)")
            except Exception as e:
                extraction_methods_tried.append(f"binary search ({str(e)[:50]})")
            
            # If all methods failed, check if it's likely Tally binary format
            # Try to find company name in UTF-16 for better error message
            company_name = "Unknown"
            try:
                with open(tbk_path, 'rb') as check_file:
                    chunk = check_file.read(min(4096, file_size))
                    # Look for UTF-16 strings (Tally company names)
                    for offset in range(0, len(chunk) - 20, 2):
                        try:
                            decoded = chunk[offset:offset+200].decode('utf-16-le', errors='ignore').split('\x00')[0].strip()
                            if len(decoded) > 5 and decoded.isprintable() and not decoded.isspace():
                                # Check if it looks like a company name
                                if any(char.isalpha() for char in decoded):
                                    company_name = decoded[:50]  # Limit length
                                    break
                        except:
                            pass
            except:
                pass
            
            # All extraction methods failed - raise error
            logger.error(f"All extraction methods failed. Tried: {', '.join(extraction_methods_tried)}")
            raise ValueError(
                f"This file appears to be in Tally's binary format (not XML). "
                f"Company detected: '{company_name}'. "
                f"Please export your company as XML from Tally: "
                f"Gateway of Tally → Import/Export → Export → Select Company → XML → Export All Data. "
                f"Then upload the XML file. "
                f"Alternatively, if this is already an XML file, it may be corrupted or in an unsupported encoding."
            )
                    
        except Exception as e:
            logger.error(f"Error extracting backup file: {e}")
            raise ValueError(f"Could not extract backup file: {str(e)}")
            
    def parse_xml_data(self, xml_path: str) -> Dict[str, Any]:
        """Parse Tally XML data"""
        try:
            if not xml_path:
                raise ValueError("No XML file path provided")
            
            if not os.path.exists(xml_path):
                raise ValueError(f"XML file not found: {xml_path}")
            
            file_size_mb = os.path.getsize(xml_path) / (1024 * 1024)
            logger.info(f"Parsing XML file: {xml_path} ({file_size_mb:.2f} MB)")
            
            # For very large files (>100MB), use streaming parser
            if file_size_mb > 100:
                logger.info(f"Large file ({file_size_mb:.2f} MB) - using memory-efficient streaming parser")
                return self._parse_xml_streaming(xml_path)
            
            # Warn about medium-large files
            if file_size_mb > 20:
                logger.warning(f"Large file detected ({file_size_mb:.2f} MB) - parsing may take 2-5 minutes")
            
            # Parse XML with error handling and invalid character cleaning
            try:
                logger.info(f"Loading XML into memory (this may take a while for large files)...")
                
                # First, read and clean the XML file to remove invalid characters
                import re
                with open(xml_path, 'rb') as f:
                    raw_content = f.read()
                
                # Check if file is empty
                if len(raw_content) == 0:
                    raise ValueError("XML file is empty. Please ensure the file was exported correctly from Tally.")
                
                # Check first few bytes to diagnose issues
                first_bytes = raw_content[:100]
                logger.debug(f"First 100 bytes (hex): {first_bytes.hex()}")
                logger.debug(f"First 100 bytes (repr): {repr(first_bytes[:50])}")
                
                # Try multiple decoding strategies - prioritize based on BOM
                content = None
                
                # Check for BOM first to determine encoding priority
                if raw_content.startswith(b'\xff\xfe'):  # UTF-16 LE BOM
                    encodings_to_try = ['utf-16-le', 'utf-16', 'utf-8', 'latin-1', 'cp1252']
                    logger.info("Detected UTF-16 LE BOM, prioritizing UTF-16 decoding")
                elif raw_content.startswith(b'\xfe\xff'):  # UTF-16 BE BOM
                    encodings_to_try = ['utf-16-be', 'utf-16', 'utf-8', 'latin-1', 'cp1252']
                    logger.info("Detected UTF-16 BE BOM, prioritizing UTF-16 decoding")
                elif raw_content.startswith(b'\xef\xbb\xbf'):  # UTF-8 BOM
                    encodings_to_try = ['utf-8', 'utf-16-le', 'utf-16-be', 'latin-1', 'cp1252']
                    logger.info("Detected UTF-8 BOM, prioritizing UTF-8 decoding")
                else:
                    encodings_to_try = ['utf-8', 'utf-16-le', 'utf-16-be', 'utf-16', 'latin-1', 'cp1252', 'iso-8859-1']
                
                for encoding in encodings_to_try:
                    try:
                        test_content = raw_content.decode(encoding, errors='replace')
                        # Check if this encoding produces valid XML markers (case-insensitive)
                        test_cleaned = test_content.lstrip()
                        test_upper = test_cleaned.upper()
                        if (test_cleaned.startswith('<?xml') or test_cleaned.startswith('<ENVELOPE') or 
                            test_cleaned.startswith('<TALLYMESSAGE') or test_upper.startswith('<?XML') or
                            test_upper.startswith('<ENVELOPE') or test_upper.startswith('<TALLYMESSAGE')):
                            content = test_content
                            logger.info(f"Successfully decoded with {encoding} encoding")
                            break
                    except (UnicodeDecodeError, UnicodeError):
                        continue
                
                # If no encoding worked, use UTF-8 with replace
                if content is None:
                    logger.warning("Could not find valid encoding, using UTF-8 with error replacement")
                    content = raw_content.decode('utf-8', errors='replace')
                
                # Remove BOM (Byte Order Mark) if present - check raw bytes first
                if raw_content.startswith(b'\xef\xbb\xbf'):  # UTF-8 BOM
                    content = content[1:] if content.startswith('\ufeff') else content
                    logger.info("Removed UTF-8 BOM (EF BB BF)")
                elif raw_content.startswith(b'\xff\xfe'):  # UTF-16 LE BOM
                    content = content[1:] if len(content) > 0 and ord(content[0]) == 0xFFFE else content
                    logger.info("Removed UTF-16 LE BOM (FF FE)")
                elif raw_content.startswith(b'\xfe\xff'):  # UTF-16 BE BOM
                    content = content[1:] if len(content) > 0 and ord(content[0]) == 0xFEFF else content
                    logger.info("Removed UTF-16 BE BOM (FE FF)")
                
                # Remove invalid Unicode characters that might appear at the start
                # Remove characters that are not valid XML start characters
                # Keep only printable ASCII and valid XML start sequences
                content = re.sub(r'^[^\x20-\x7E<]*', '', content)  # Remove non-printable at start
                
                # Strip leading whitespace and newlines
                content = content.lstrip()
                
                # Find the actual start of XML content (look for XML markers)
                # First, try to find where valid XML starts
                xml_markers = ['<?xml', '<ENVELOPE', '<TALLYMESSAGE', '<?XML']
                xml_start_pos = -1
                
                for marker in xml_markers:
                    pos = content.find(marker)
                    if pos >= 0:
                        xml_start_pos = pos
                        logger.info(f"Found XML marker '{marker}' at position {pos}")
                        break
                
                # If not found, try case-insensitive search
                if xml_start_pos == -1:
                    content_upper = content.upper()
                    for marker in ['<?XML', '<ENVELOPE', '<TALLYMESSAGE']:
                        pos = content_upper.find(marker)
                        if pos >= 0:
                            xml_start_pos = pos
                            logger.info(f"Found XML marker '{marker}' (case-insensitive) at position {pos}")
                            break
                
                # If still not found, try finding just the opening bracket
                if xml_start_pos == -1:
                    first_lt = content.find('<')
                    if first_lt >= 0:
                        # Check if what follows looks like XML
                        next_chars = content[first_lt:first_lt+20].upper()
                        if any(marker in next_chars for marker in ['XML', 'ENVELOPE', 'TALLYMESSAGE']):
                            xml_start_pos = first_lt
                            logger.info(f"Found '<' at position {first_lt} followed by XML-like content")
                
                if xml_start_pos > 0:
                    # Remove everything before the XML marker
                    logger.warning(f"Removing {xml_start_pos} invalid characters before XML content")
                    content = content[xml_start_pos:]
                elif xml_start_pos == 0:
                    # Content already starts with XML marker, just ensure it's clean
                    logger.info("Content already starts with XML marker")
                
                # Strip again after all cleaning operations
                content = content.lstrip()
                
                # Check if content starts with valid XML markers after cleaning
                # Use a more lenient check - just look for the opening tag
                content_stripped = content.strip()
                starts_with_xml = (content_stripped.startswith('<?xml') or 
                                  content_stripped.startswith('<ENVELOPE') or 
                                  content_stripped.startswith('<TALLYMESSAGE') or
                                  content_stripped.startswith('<?XML') or
                                  content_stripped.upper().startswith('<ENVELOPE') or
                                  content_stripped.upper().startswith('<TALLYMESSAGE'))
                
                if not starts_with_xml:
                    # Log what we actually found
                    preview = content[:200].replace('\n', '\\n').replace('\r', '\\r')
                    logger.error(f"File does not start with valid XML after cleaning. First 200 chars: {preview}")
                    
                    # Try one more aggressive clean - find first < and remove everything before it
                    first_lt = content.find('<')
                    if first_lt > 0:
                        logger.info(f"Found '<' at position {first_lt}, removing {first_lt} characters before it")
                        content = content[first_lt:]
                        content = content.lstrip()
                    
                    # Final check
                    content_stripped = content.strip()
                    starts_with_xml = (content_stripped.startswith('<?xml') or 
                                      content_stripped.startswith('<ENVELOPE') or 
                                      content_stripped.startswith('<TALLYMESSAGE') or
                                      content_stripped.startswith('<?XML') or
                                      content_stripped.upper().startswith('<ENVELOPE') or
                                      content_stripped.upper().startswith('<TALLYMESSAGE'))
                    
                    if not starts_with_xml:
                        raise ValueError(
                            f"File does not appear to be valid XML. "
                            f"Expected to start with '<?xml', '<ENVELOPE', or '<TALLYMESSAGE', "
                            f"but found: {content[:100]}. "
                            f"Please ensure this is a valid Tally XML export file."
                        )
                
                # Remove invalid XML characters (control characters, invalid Unicode)
                # XML 1.0 allows: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
                # Remove: \x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F-\x9F (except \x09, \x0A, \x0D)
                content = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', content)
                
                # Remove invalid Unicode characters (replacement characters, private use, etc.)
                # Keep only valid XML characters: #x9, #xA, #xD, #x20-#xD7FF, #xE000-#xFFFD
                # Filter out invalid Unicode characters
                valid_chars = []
                for char in content:
                    code = ord(char)
                    if (code == 0x9 or code == 0xA or code == 0xD or 
                        (0x20 <= code <= 0xD7FF) or (0xE000 <= code <= 0xFFFD) or code > 0xFFFD):
                        valid_chars.append(char)
                content = ''.join(valid_chars)
                
                # Also remove any invalid character references that might cause issues
                # Remove standalone ampersands that aren't part of entities
                content = re.sub(r'&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)', '&amp;', content)
                
                # CRITICAL: Remove invalid character entity references (&#123; or &#x1F; format)
                # XML only allows: #x9, #xA, #xD, #x20-#xD7FF, #xE000-#xFFFD, #x10000-#x10FFFF
                # Remove any entity references to invalid character codes
                def fix_invalid_entity(match):
                    entity = match.group(0)
                    try:
                        if entity.startswith('&#x'):
                            # Hex entity like &#x1F;
                            code = int(entity[3:-1], 16)
                        elif entity.startswith('&#'):
                            # Decimal entity like &#31;
                            code = int(entity[2:-1])
                        else:
                            return entity  # Named entity, keep it
                        
                        # Check if code is valid XML character
                        if (code == 0x9 or code == 0xA or code == 0xD or 
                            (0x20 <= code <= 0xD7FF) or (0xE000 <= code <= 0xFFFD) or 
                            (0x10000 <= code <= 0x10FFFF)):
                            return entity  # Valid, keep it
                        else:
                            logger.debug(f"Removing invalid character entity: {entity} (code: {code})")
                            return ''  # Invalid, remove it
                    except (ValueError, AttributeError):
                        return entity  # Can't parse, keep it to avoid breaking XML
                
                # Remove invalid character entity references
                content = re.sub(r'&#(?:x[0-9a-fA-F]+|\d+);', fix_invalid_entity, content)
                
                # Ensure content is not empty after cleaning
                if not content.strip():
                    raise ValueError("After cleaning invalid characters, the XML file is empty. The file may be corrupted.")
                
                # Save cleaned XML to temp file
                cleaned_xml_path = os.path.join(self.temp_dir, "cleaned_data.xml")
                with open(cleaned_xml_path, 'w', encoding='utf-8', errors='replace') as f:
                    f.write(content)
                
                logger.info(f"Cleaned XML file (removed invalid characters and entity references), saved to {cleaned_xml_path}")
                logger.debug(f"Cleaned XML starts with: {content[:100]}")
                
                # Try to parse with standard parser first
                try:
                    tree = ET.parse(cleaned_xml_path)
                    root = tree.getroot()
                    logger.info(f"XML loaded successfully! Root element: {root.tag}")
                    logger.info(f"Starting data extraction (processing {len(list(root.iter()))} XML elements)...")
                except ET.ParseError as parse_err:
                    # If standard parser fails, try more aggressive cleaning
                    logger.warning(f"Standard XML parser failed: {parse_err}. Attempting aggressive cleaning...")
                    
                    # Try with lxml if available (more forgiving)
                    lxml_success = False
                    try:
                        from lxml import etree as lxml_etree
                        # Use recover mode to handle errors gracefully
                        parser = lxml_etree.XMLParser(recover=True, encoding='utf-8', huge_tree=True)
                        tree = lxml_etree.parse(cleaned_xml_path, parser=parser)
                        root_lxml = tree.getroot()
                        logger.info(f"XML loaded with lxml (recover mode)! Root element: {root_lxml.tag}")
                        # Convert lxml element to standard ElementTree for compatibility
                        xml_string = lxml_etree.tostring(root_lxml, encoding='unicode', method='xml')
                        root = ET.fromstring(xml_string)
                        logger.info(f"Starting data extraction (processing {len(list(root.iter()))} XML elements)...")
                        lxml_success = True
                    except ImportError:
                        logger.warning("lxml not available, trying line-by-line cleaning...")
                    except Exception as lxml_err:
                        logger.warning(f"lxml parsing failed: {lxml_err}, trying line-by-line cleaning...")
                    
                    if not lxml_success:
                        # Fallback: Process line by line and remove problematic lines/characters
                        with open(cleaned_xml_path, 'r', encoding='utf-8', errors='replace') as f:
                            lines = f.readlines()
                        
                        # Try to identify and fix the problematic line
                        error_line_num = None
                        if 'line' in str(parse_err):
                            try:
                                error_line_num = int(str(parse_err).split('line')[1].split(',')[0].strip())
                            except:
                                pass
                        
                        if error_line_num and error_line_num <= len(lines):
                            logger.info(f"Attempting to fix line {error_line_num}...")
                            # Remove invalid character entities from the problematic line
                            problem_line = lines[error_line_num - 1]
                            # Remove all character entity references from this line
                            fixed_line = re.sub(r'&#(?:x[0-9a-fA-F]+|\d+);', '', problem_line)
                            lines[error_line_num - 1] = fixed_line
                            
                            # Also clean a few lines around it
                            for i in range(max(0, error_line_num - 3), min(len(lines), error_line_num + 3)):
                                lines[i] = re.sub(r'&#(?:x[0-9a-fA-F]+|\d+);', '', lines[i])
                        
                        # Write fixed content
                        fixed_xml_path = os.path.join(self.temp_dir, "fixed_data.xml")
                        with open(fixed_xml_path, 'w', encoding='utf-8', errors='replace') as f:
                            f.write(''.join(lines))
                        
                        # Try parsing again
                        try:
                            tree = ET.parse(fixed_xml_path)
                            root = tree.getroot()
                            logger.info(f"XML loaded after line-by-line fixing! Root element: {root.tag}")
                            logger.info(f"Starting data extraction (processing {len(list(root.iter()))} XML elements)...")
                            # Update cleaned_xml_path for later use
                            cleaned_xml_path = fixed_xml_path
                        except ET.ParseError as e2:
                            # Last resort: Remove ALL character entity references
                            logger.warning("Line-by-line fix failed, removing ALL character entity references...")
                            with open(cleaned_xml_path, 'r', encoding='utf-8', errors='replace') as f:
                                content_final = f.read()
                            
                            # Remove all numeric character entities (keep named ones like &amp; &lt; etc)
                            content_final = re.sub(r'&#(?:x[0-9a-fA-F]+|\d+);', '', content_final)
                            
                            final_xml_path = os.path.join(self.temp_dir, "final_cleaned_data.xml")
                            with open(final_xml_path, 'w', encoding='utf-8', errors='replace') as f:
                                f.write(content_final)
                            
                            tree = ET.parse(final_xml_path)
                            root = tree.getroot()
                            logger.info(f"XML loaded after removing all character entities! Root element: {root.tag}")
                            logger.info(f"Starting data extraction (processing {len(list(root.iter()))} XML elements)...")
                            # Update cleaned_xml_path for later use
                            cleaned_xml_path = final_xml_path
            except ET.ParseError as pe:
                error_line = str(pe).split('line')[1].split(',')[0].strip() if 'line' in str(pe) else 'unknown'
                logger.error(f"XML Parse Error at line {error_line}: {str(pe)}")
                
                # Try to read the file again to show what's actually there
                try:
                    with open(xml_path, 'rb') as f:
                        preview = f.read(500)
                        preview_str = preview.decode('utf-8', errors='replace')[:200]
                        logger.error(f"File preview (first 200 chars): {repr(preview_str)}")
                except:
                    pass
                
                raise ValueError(
                    f"Invalid XML format at line {error_line}: {str(pe)}. "
                    f"This usually means the XML file contains invalid characters or is corrupted. "
                    f"Please try re-exporting from Tally or check if the file is complete. "
                    f"If the error persists, the file may not be a valid XML export from Tally."
                )
            except MemoryError:
                raise ValueError(f"File too large ({file_size_mb:.2f} MB) - out of memory. Please compress to .zip or export smaller date range from Tally.")
            except Exception as xml_error:
                logger.error(f"Error reading XML file: {xml_error}", exc_info=True)
                raise ValueError(f"Could not read XML file: {str(xml_error)}")
            
            data = {
                "companies": [],
                "ledgers": [],
                "vouchers": [],
                "stock_items": [],
                "groups": [],
                "metadata": {}
            }
            
            # Extract company info
            logger.info("Extracting companies...")
            companies = root.findall(".//COMPANY") or root.findall(".//TALLYMESSAGE[@TYPE='Company']")
            logger.info(f"Found {len(companies)} company elements")
            for company in companies:
                company_data = self._parse_company(company)
                if company_data:
                    data["companies"].append(company_data)
            
            # Extract ledgers
            logger.info("Extracting ledgers...")
            ledgers = root.findall(".//LEDGER") or root.findall(".//TALLYMESSAGE[@TYPE='Ledger']")
            logger.info(f"Found {len(ledgers)} ledger elements")
            
            # Debug: Log first ledger structure
            if ledgers:
                first_ledger = ledgers[0]
                logger.debug(f"Sample ledger XML structure - Tags: {[child.tag for child in first_ledger]}")
                closing_bal_elem = first_ledger.find("CLOSINGBALANCE")
                if closing_bal_elem is not None:
                    logger.debug(f"CLOSINGBALANCE found - Text: {closing_bal_elem.text}, Attrs: {closing_bal_elem.attrib}")
                else:
                    logger.warning("CLOSINGBALANCE not found in first ledger - checking alternative structures")
                    # Log all child tags
                    for child in first_ledger:
                        if 'BALANCE' in child.tag.upper() or 'BAL' in child.tag.upper():
                            logger.debug(f"Found balance-related tag: {child.tag} = {child.text}")
            
            total_balance_sum = 0.0
            ledgers_with_balance = 0
            opening_balance_sum = 0.0
            closing_balance_sum = 0.0
            
            for ledger in ledgers:
                ledger_data = self._parse_ledger(ledger)
                if ledger_data:
                    data["ledgers"].append(ledger_data)
                    closing_bal = ledger_data.get('closing_balance', 0) or ledger_data.get('current_balance', 0) or 0
                    opening_bal = ledger_data.get('opening_balance', 0) or 0
                    
                    closing_balance_sum += abs(float(closing_bal))
                    opening_balance_sum += abs(float(opening_bal))
                    
                    bal = closing_bal or opening_bal
                    if abs(float(bal)) > 0:
                        ledgers_with_balance += 1
                        total_balance_sum += abs(float(bal))
            
            logger.info(f"Parsed {len(data['ledgers'])} ledgers:")
            logger.info(f"  - {ledgers_with_balance} have non-zero balances")
            logger.info(f"  - Total closing balance sum: {closing_balance_sum:,.2f}")
            logger.info(f"  - Total opening balance sum: {opening_balance_sum:,.2f}")
            logger.info(f"  - Total balance sum (non-zero only): {total_balance_sum:,.2f}")
            
            # Log sample of ledgers with balances for debugging
            sample_ledgers = [l for l in data['ledgers'] if abs(float(l.get('closing_balance', 0) or l.get('current_balance', 0) or l.get('balance', 0) or 0)) > 1000][:5]
            if sample_ledgers:
                logger.info(f"Sample ledgers with balances:")
                for l in sample_ledgers:
                    bal = abs(float(l.get('closing_balance', 0) or l.get('current_balance', 0) or l.get('balance', 0) or 0))
                    logger.info(f"  - {l.get('name')}: {bal:,.2f} (parent: {l.get('parent')})")
            
            # Additional debug: Check for revenue/expense ledgers
            revenue_keywords = ['sales', 'income', 'revenue']
            expense_keywords = ['expense', 'purchase', 'cost']
            revenue_count = 0
            expense_count = 0
            for ledger_data in data['ledgers']:
                parent = (ledger_data.get('parent') or '').lower()
                name = (ledger_data.get('name') or '').lower()
                if any(kw in parent for kw in revenue_keywords) or any(kw in name for kw in revenue_keywords):
                    revenue_count += 1
                if any(kw in parent for kw in expense_keywords) or any(kw in name for kw in expense_keywords):
                    expense_count += 1
            logger.info(f"Found {revenue_count} revenue-type ledgers and {expense_count} expense-type ledgers")
            
            # Extract vouchers
            logger.info("Extracting vouchers...")
            vouchers = root.findall(".//VOUCHER") or root.findall(".//TALLYMESSAGE[@TYPE='Voucher']")
            logger.info(f"Found {len(vouchers)} voucher elements")
            for voucher in vouchers:
                voucher_data = self._parse_voucher(voucher)
                if voucher_data:
                    data["vouchers"].append(voucher_data)
            
            # Extract stock items
            logger.info("Extracting stock items...")
            stock_items = root.findall(".//STOCKITEM") or root.findall(".//TALLYMESSAGE[@TYPE='StockItem']")
            logger.info(f"Found {len(stock_items)} stock item elements")
            for item in stock_items:
                item_data = self._parse_stock_item(item)
                if item_data:
                    data["stock_items"].append(item_data)
            
            # Extract groups
            logger.info("Extracting groups...")
            groups = root.findall(".//GROUP") or root.findall(".//TALLYMESSAGE[@TYPE='Group']")
            logger.info(f"Found {len(groups)} group elements")
            for group in groups:
                group_data = self._parse_group(group)
                if group_data:
                    data["groups"].append(group_data)
            
            # Metadata
            data["metadata"] = {
                "source": "tbk_backup",
                "extracted_at": datetime.now().isoformat(),
                "total_companies": len(data["companies"]),
                "total_ledgers": len(data["ledgers"]),
                "total_vouchers": len(data["vouchers"]),
                "total_stock_items": len(data["stock_items"])
            }
            
            logger.info(f"Parsed XML - Companies: {len(data['companies'])}, Ledgers: {len(data['ledgers'])}, Vouchers: {len(data['vouchers'])}, Stock Items: {len(data['stock_items'])}")
            
            # Validate we found at least something
            if len(data["companies"]) == 0 and len(data["ledgers"]) == 0:
                raise ValueError(
                    f"No Tally data found in XML file. "
                    f"Please ensure this is a valid Tally export file with company, ledger, or voucher data. "
                    f"Root element found: {root.tag}"
                )
            
            # If no companies found, create a default one
            if len(data["companies"]) == 0:
                logger.warning("No company found in XML, creating default entry")
                data["companies"].append({
                    "name": "Default Company",
                    "guid": "UNKNOWN",
                    "books_from": "",
                    "financial_year_from": "",
                    "address": "",
                    "state": "",
                    "pincode": "",
                    "email": "",
                    "mobile": ""
                })
            
            return data
            
        except Exception as e:
            logger.error(f"Error parsing XML: {e}")
            raise ValueError(f"Could not parse XML data: {str(e)}")
    
    def _get_text(self, element: ET.Element, tag: str, default: str = "") -> str:
        """Safely extract text from XML element"""
        child = element.find(tag) or element.find(f".//{tag}")
        if child is not None and child.text:
            return child.text.strip()
        return default
    
    def _get_amount(self, element: ET.Element, tag: str, preserve_sign: bool = False) -> float:
        """Extract amount from XML and convert to float - Enhanced for all Tally formats
        
        Args:
            element: XML element to search
            tag: Tag name to find
            preserve_sign: If True, preserve Tally sign convention (Cr=negative, Dr=positive)
        """
        # Try multiple approaches to find the amount
        text = None
        child = None
        
        # Approach 1: Direct tag
        child = element.find(tag)
        if child is not None and child.text:
            text = child.text
        
        # Approach 2: Nested structure with .//
        if not text:
            child = element.find(f".//{tag}")
            if child is not None and child.text:
                text = child.text
        
        # Approach 3: Different case variations
        if not text:
            for case_tag in [tag.upper(), tag.lower(), tag.capitalize()]:
                child = element.find(case_tag)
                if child is not None and child.text:
                    text = child.text
                    break
        
        # Approach 4: Check nested children for text
        if not text and child is not None and len(child) > 0:
            for subchild in child:
                if subchild.text:
                    text = subchild.text
                    break
        
        # Approach 5: Check attributes (Tally sometimes stores amounts in attributes)
        if not text and child is not None:
            for attr_name in ['amount', 'value', 'balance', 'amt', 'actual']:
                if attr_name in child.attrib:
                    text = child.attrib[attr_name]
                    break
        
        # Approach 6: Search all children for amount-like tags
        if not text:
            for child_elem in element:
                if tag.upper() in child_elem.tag.upper() or 'AMOUNT' in child_elem.tag.upper() or 'BALANCE' in child_elem.tag.upper():
                    if child_elem.text:
                        text = child_elem.text
                        break
                    # Check attributes
                    for attr_name in ['amount', 'value', 'balance', 'amt', 'actual']:
                        if attr_name in child_elem.attrib:
                            text = child_elem.attrib[attr_name]
                            break
                    if text:
                        break
        
        if not text:
            # Last resort: check if the element itself has text that looks like a number
            if element.text and any(c.isdigit() for c in element.text):
                text = element.text

        if not text:
            return 0.0
        
        try:
            # Remove currency symbols, commas, and whitespace
            original_text = text  # Keep original for sign detection
            cleaned = text.replace("₹", "").replace(",", "").replace("Rs", "").replace("rs", "").strip()
            
            # Detect sign based on Dr/Cr indicators
            # Tally convention: Cr (Credit) = negative, Dr (Debit) = positive
            is_credit = "Cr" in original_text or "cr" in original_text or "CR" in original_text
            is_debit = "Dr" in original_text or "dr" in original_text or "DR" in original_text
            is_parenthesis = "(" in original_text  # (100) format typically means negative/credit
            has_minus = cleaned.startswith("-")
            
            cleaned = cleaned.replace("Dr", "").replace("Cr", "").replace("dr", "").replace("cr", "").replace("DR", "").replace("CR", "").replace("(", "").replace(")", "").strip()
            
            if cleaned:
                amount = float(cleaned)
                
                if preserve_sign:
                    # Apply Tally sign convention: Cr=negative, Dr=positive
                    if is_credit or is_parenthesis or has_minus:
                        return -abs(amount)  # Credit balances are negative
                    elif is_debit:
                        return abs(amount)   # Debit balances are positive
                    else:
                        # No explicit indicator - assume original sign or positive
                        return amount if has_minus else abs(amount)
                else:
                    return abs(amount)  # Return absolute value (legacy behavior)
            return 0.0
        except (ValueError, AttributeError, TypeError):
            return 0.0
    
    def _parse_company(self, element: ET.Element) -> Optional[Dict]:
        """Parse company element"""
        try:
            name = self._get_text(element, "NAME")
            if not name:
                return None
                
            return {
                "name": name,
                "guid": self._get_text(element, "GUID"),
                "books_from": self._get_text(element, "BOOKSBEGINFROM"),
                "financial_year_from": self._get_text(element, "FINYEARFROM"),
                "address": self._get_text(element, "ADDRESS"),
                "state": self._get_text(element, "STATE"),
                "pincode": self._get_text(element, "PINCODE"),
                "email": self._get_text(element, "EMAIL"),
                "mobile": self._get_text(element, "MOBILENO")
            }
        except Exception as e:
            logger.error(f"Error parsing company: {e}")
            return None
    
    def _parse_ledger(self, element: ET.Element) -> Optional[Dict]:
        """Parse ledger element - comprehensive balance extraction for all Tally XML formats
        
        CRITICAL: Preserves Tally sign convention:
        - Cr (Credit) balances = NEGATIVE (revenue, liabilities, capital)
        - Dr (Debit) balances = POSITIVE (assets, expenses)
        """
        try:
            name = self._get_text(element, "NAME")
            if not name:
                return None
            
            # Try multiple balance field names and structures
            opening_bal = 0.0
            closing_bal = 0.0
            balance = 0.0
            
            # Comprehensive balance extraction - try ALL possible field names
            # PRESERVE SIGNS for proper accounting calculations
            balance_fields = [
                "CLOSINGBALANCE", "CLOSINGBAL", "CURRENTBALANCE", "BALANCE",
                "PERIODAMOUNT", "YEARAMOUNT", "AMOUNT", "TOTALAMOUNT",
                "CREDITAMOUNT", "DEBITAMOUNT", "NETAMOUNT", "BALANCEAMOUNT"
            ]
            
            opening_fields = [
                "OPENINGBALANCE", "OPENINGBAL", "OPENINGAMOUNT", "OPENBAL"
            ]
            
            # Try all closing balance fields - PRESERVE SIGN
            for field in balance_fields:
                val = self._get_amount(element, field, preserve_sign=True)
                if abs(val) > abs(closing_bal):
                    closing_bal = val
                if abs(val) > abs(balance):
                    balance = val
            
            # Try all opening balance fields - PRESERVE SIGN
            for field in opening_fields:
                val = self._get_amount(element, field, preserve_sign=True)
                if abs(val) > abs(opening_bal):
                    opening_bal = val
            
            # Try nested structures
            for field in balance_fields:
                nested_elem = element.find(f".//{field}")
                if nested_elem is not None:
                    val = self._get_amount(nested_elem, ".", preserve_sign=True)
                    if abs(val) > abs(closing_bal):
                        closing_bal = val
                    if abs(val) > abs(balance):
                        balance = val
            
            # Search ALL child elements for any amount/balance-like values
            # PRESERVE SIGNS based on Cr/Dr indicators
            for child in element.iter():
                tag_upper = child.tag.upper()
                if any(keyword in tag_upper for keyword in ['AMOUNT', 'BALANCE', 'BAL']):
                    try:
                        # Try text content
                        if child.text:
                            original = child.text
                            is_credit = 'Cr' in original or 'cr' in original or 'CR' in original
                            cleaned = original.replace('₹', '').replace(',', '').replace('Dr', '').replace('Cr', '').replace('dr', '').replace('cr', '').replace('DR', '').replace('CR', '').replace('Rs', '').strip()
                            if cleaned:
                                val = float(cleaned)
                                # Apply sign: Cr=negative, Dr=positive
                                if is_credit:
                                    val = -abs(val)
                                else:
                                    val = abs(val)
                                if abs(val) > abs(closing_bal):
                                    closing_bal = val
                                if abs(val) > abs(balance):
                                    balance = val
                        # Try attributes
                        for attr in child.attrib:
                            if 'amount' in attr.lower() or 'balance' in attr.lower() or 'bal' in attr.lower():
                                try:
                                    val = float(child.attrib[attr])
                                    if abs(val) > abs(closing_bal):
                                        closing_bal = val
                                    if abs(val) > abs(balance):
                                        balance = val
                                except:
                                    pass
                    except:
                        pass
            
            # If still 0, use opening balance as fallback
            if closing_bal == 0 and opening_bal != 0:
                closing_bal = opening_bal
            
            # Get parent - try multiple sources
            parent = self._get_text(element, "PARENT")
            if not parent:
                parent = self._get_text(element, "GROUP")
            if not parent:
                # Try nested parent
                parent_elem = element.find(".//PARENT")
                if parent_elem is not None:
                    parent = parent_elem.text.strip() if parent_elem.text else ""
            
            # Get is_revenue flag
            is_revenue_text = self._get_text(element, "ISREVENUE")
            is_revenue = is_revenue_text.upper() == "YES" or is_revenue_text.upper() == "TRUE"
            
            # Get is_deemed_positive
            is_deemed_positive_text = self._get_text(element, "ISDEEMEDPOSITIVE")
            is_deemed_positive = is_deemed_positive_text.upper() == "YES" or is_deemed_positive_text.upper() == "TRUE"
            
            # If still 0, use opening balance as fallback
            if closing_bal == 0 and opening_bal != 0:
                closing_bal = opening_bal
            if balance == 0:
                balance = closing_bal if closing_bal != 0 else opening_bal
            
            # Log significant balances for debugging (include sign)
            if abs(closing_bal) > 1000 or abs(opening_bal) > 1000:
                logger.debug(f"Ledger {name}: opening={opening_bal}, closing={closing_bal}, balance={balance}, parent={parent}")
            
            return {
                "name": name,
                "guid": self._get_text(element, "GUID"),
                "parent": parent,
                "opening_balance": opening_bal,
                "current_balance": closing_bal,
                "closing_balance": closing_bal,  # Add alias for compatibility
                "balance": balance,  # Add direct balance field for comprehensive access
                "is_revenue": is_revenue,
                "is_deemed_positive": is_deemed_positive
            }
        except Exception as e:
            logger.error(f"Error parsing ledger {name if 'name' in locals() else 'unknown'}: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return None
    
    def _parse_voucher(self, element: ET.Element) -> Optional[Dict]:
        """Parse voucher element - enhanced amount extraction"""
        try:
            voucher_type = self._get_text(element, "VOUCHERTYPENAME") or self._get_text(element, "VOUCHERTYPE")
            voucher_number = self._get_text(element, "VOUCHERNUMBER")
            
            if not voucher_type:
                return None
            
            # Try multiple amount fields
            amount = self._get_amount(element, "AMOUNT")
            if amount == 0:
                amount = self._get_amount(element, "TOTALAMOUNT")
            if amount == 0:
                amount = self._get_amount(element, "VOUCHERAMOUNT")
            if amount == 0:
                # Try to sum from ledger entries
                ledger_entries = element.findall(".//LEDGERENTRY") or element.findall(".//ENTRY")
                for entry in ledger_entries:
                    entry_amount = self._get_amount(entry, "AMOUNT")
                    if entry_amount > 0:
                        amount += entry_amount
                
            return {
                "guid": self._get_text(element, "GUID"),
                "voucher_type": voucher_type,
                "voucher_number": voucher_number,
                "date": self._get_text(element, "DATE"),
                "reference": self._get_text(element, "REFERENCE"),
                "narration": self._get_text(element, "NARRATION"),
                "party_name": self._get_text(element, "PARTYNAME"),
                "amount": amount,
                "value": amount,  # Add alias
                "total": amount,  # Add alias
                "is_cancelled": self._get_text(element, "ISCANCELLED") == "Yes"
            }
        except Exception as e:
            logger.error(f"Error parsing voucher: {e}")
            return None
    
    def _parse_stock_item(self, element: ET.Element) -> Optional[Dict]:
        """Parse stock item element"""
        try:
            name = self._get_text(element, "NAME")
            if not name:
                return None
                
            return {
                "name": name,
                "guid": self._get_text(element, "GUID"),
                "parent": self._get_text(element, "PARENT"),
                "category": self._get_text(element, "CATEGORY"),
                "base_units": self._get_text(element, "BASEUNITS"),
                "opening_balance": self._get_amount(element, "OPENINGBALANCE"),
                "opening_value": self._get_amount(element, "OPENINGVALUE"),
                "closing_balance": self._get_amount(element, "CLOSINGBALANCE"),
                "closing_value": self._get_amount(element, "CLOSINGVALUE"),
                "rate": self._get_amount(element, "RATE")
            }
        except Exception as e:
            logger.error(f"Error parsing stock item: {e}")
            return None
    
    def _parse_group(self, element: ET.Element) -> Optional[Dict]:
        """Parse group element"""
        try:
            name = self._get_text(element, "NAME")
            if not name:
                return None
                
            return {
                "name": name,
                "guid": self._get_text(element, "GUID"),
                "parent": self._get_text(element, "PARENT"),
                "is_revenue": self._get_text(element, "ISREVENUE") == "Yes",
                "is_deemed_positive": self._get_text(element, "ISDEEMEDPOSITIVE") == "Yes"
            }
        except Exception as e:
            logger.error(f"Error parsing group: {e}")
            return None
    
    def parse_tbk_file(self, tbk_path: str) -> Dict[str, Any]:
        """Main method to parse .tbk/.001/.zip/.xml file"""
        try:
            logger.info(f"Starting to parse backup file: {tbk_path}")
            
            if not os.path.exists(tbk_path):
                raise ValueError(f"Backup file not found: {tbk_path}")
            
            # Check if it's already an XML file (no extraction needed)
            file_ext = os.path.splitext(tbk_path)[1].lower()
            is_valid_xml = False
            
            if file_ext == '.xml':
                logger.info("File has .xml extension, validating...")
                # Quick validation - check if file starts with XML markers
                try:
                    with open(tbk_path, 'rb') as f:
                        first_bytes = f.read(100)
                        first_str = first_bytes.decode('utf-8', errors='ignore').lstrip()
                        if first_str.startswith('<?xml') or first_str.startswith('<ENVELOPE') or first_str.startswith('<TALLYMESSAGE'):
                            is_valid_xml = True
                            logger.info("File appears to be valid XML, parsing directly...")
                        elif first_bytes.startswith(b'\x1f\x8b') or first_bytes.startswith(b'PK'):
                            logger.warning("File has .xml extension but appears to be compressed, will attempt extraction...")
                            is_valid_xml = False
                        else:
                            # File has .xml extension but doesn't start with valid XML
                            logger.warning(f"File has .xml extension but doesn't start with valid XML markers. First 50 chars: {first_str[:50]}")
                            logger.warning("Will attempt to extract/clean the file...")
                            is_valid_xml = False
                except Exception as e:
                    logger.warning(f"Could not validate XML file: {e}, will attempt extraction...")
                    is_valid_xml = False
            
            if is_valid_xml:
                # Parse XML directly
                data = self.parse_xml_data(tbk_path)
            else:
                # Extract compressed file or clean invalid XML
                xml_path = self.extract_tbk(tbk_path)
                
                if not xml_path:
                    raise ValueError("Failed to extract XML from backup file")
                
                # Parse extracted XML
                data = self.parse_xml_data(xml_path)
            
            logger.info(f"Successfully parsed backup file with {len(data.get('companies', []))} companies")
            return data
            
        except Exception as e:
            logger.error(f"Error parsing backup file: {e}", exc_info=True)
            raise
            
        finally:
            # Cleanup
            if self.temp_dir and os.path.exists(self.temp_dir):
                try:
                    shutil.rmtree(self.temp_dir)
                    logger.info("Cleaned up temporary directory")
                except:
                    pass

