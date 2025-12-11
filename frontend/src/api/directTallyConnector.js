/**
 * Direct Tally Connector - Connects directly from browser to local Tally
 * Bypasses cloud backend entirely for live Tally data
 * 
 * This works because:
 * - Your browser runs on YOUR computer
 * - Your Tally runs on YOUR computer (localhost:9000)
 * - Browser can reach localhost:9000 directly!
 */

const DEFAULT_TALLY_URL = 'http://localhost:9000';

class DirectTallyConnector {
  constructor(tallyUrl = DEFAULT_TALLY_URL) {
    this.tallyUrl = tallyUrl;
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Send XML request directly to Tally Gateway
   */
  async sendRequest(xmlRequest) {
    try {
      const response = await fetch(this.tallyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: xmlRequest,
        mode: 'cors', // Try CORS first
      });

      if (!response.ok) {
        throw new Error(`Tally returned status ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      // If CORS fails, try no-cors mode (limited but might work)
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        console.warn('CORS blocked - Tally Gateway needs CORS headers. Using proxy workaround...');
        throw new Error('CORS_BLOCKED');
      }
      throw error;
    }
  }

  /**
   * Test connection to Tally
   */
  async testConnection() {
    const xmlRequest = `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>SimpleCompanyCheck</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="SimpleCompanyCheck">
                        <TYPE>Company</TYPE>
                        <FETCH>Name</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>`;

    try {
      const response = await this.sendRequest(xmlRequest);
      if (response && response.length > 50) {
        return { connected: true, message: '✓ Connected to Tally successfully!' };
      }
      return { connected: false, message: 'Tally returned empty response. Make sure a company is open.' };
    } catch (error) {
      if (error.message === 'CORS_BLOCKED') {
        return { 
          connected: false, 
          message: 'CORS blocked. Please enable Tally CORS or use the local proxy.',
          needsProxy: true
        };
      }
      return { 
        connected: false, 
        message: `Cannot connect to Tally at ${this.tallyUrl}. Make sure Tally is running with Gateway enabled on port 9000.`
      };
    }
  }

  /**
   * Get list of companies from Tally
   */
  async getCompanies() {
    const xmlRequest = `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Company List</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Company List">
                        <TYPE>Company</TYPE>
                        <FETCH>NAME, STARTINGFROM, ENDINGAT, GUID</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>`;

    const response = await this.sendRequest(xmlRequest);
    return this.parseCompanies(response);
  }

  /**
   * Get ledgers for a company
   */
  async getLedgers(companyName) {
    const xmlRequest = `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Ledger Collection</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                <SVCURRENTCOMPANY>${this.escapeXml(companyName)}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Ledger Collection">
                        <TYPE>Ledger</TYPE>
                        <FETCH>NAME, PARENT, OPENINGBALANCE, CLOSINGBALANCE, GUID</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>`;

    const response = await this.sendRequest(xmlRequest);
    return this.parseLedgers(response);
  }

  /**
   * Get vouchers for a company
   */
  async getVouchers(companyName, fromDate = null, toDate = null) {
    // Default date range: last 1 year
    if (!toDate) {
      const today = new Date();
      toDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    }
    if (!fromDate) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      fromDate = oneYearAgo.toISOString().slice(0, 10).replace(/-/g, '');
    }

    const xmlRequest = `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Voucher Collection</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                <SVCURRENTCOMPANY>${this.escapeXml(companyName)}</SVCURRENTCOMPANY>
                <SVFROMDATE>${fromDate}</SVFROMDATE>
                <SVTODATE>${toDate}</SVTODATE>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Voucher Collection">
                        <TYPE>Voucher</TYPE>
                        <FETCH>DATE, VOUCHERNUMBER, VOUCHERTYPENAME, PARTYLEDGERNAME, AMOUNT, NARRATION</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>`;

    const response = await this.sendRequest(xmlRequest);
    return this.parseVouchers(response);
  }

  /**
   * Get stock items for a company
   */
  async getStockItems(companyName) {
    const xmlRequest = `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Stock Items</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                <SVCURRENTCOMPANY>${this.escapeXml(companyName)}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Stock Items">
                        <TYPE>Stock Item</TYPE>
                        <FETCH>NAME, PARENT, OPENINGBALANCE, CLOSINGBALANCE, OPENINGVALUE, CLOSINGVALUE</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>`;

    const response = await this.sendRequest(xmlRequest);
    return this.parseStockItems(response);
  }

  // ==================== XML PARSERS ====================

  parseCompanies(xmlResponse) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlResponse, 'text/xml');
    const companies = [];

    const companyNodes = doc.querySelectorAll('COMPANY');
    companyNodes.forEach(node => {
      companies.push({
        name: this.getNodeText(node, 'NAME'),
        guid: this.getNodeText(node, 'GUID'),
        financial_year_start: this.getNodeText(node, 'STARTINGFROM'),
        financial_year_end: this.getNodeText(node, 'ENDINGAT'),
      });
    });

    return companies;
  }

  parseLedgers(xmlResponse) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlResponse, 'text/xml');
    const ledgers = [];

    const ledgerNodes = doc.querySelectorAll('LEDGER');
    ledgerNodes.forEach(node => {
      const parent = this.getNodeText(node, 'PARENT') || '';
      const name = this.getNodeText(node, 'NAME') || '';
      const closingBalance = parseFloat(this.getNodeText(node, 'CLOSINGBALANCE')) || 0;

      ledgers.push({
        name,
        parent,
        guid: this.getNodeText(node, 'GUID'),
        opening_balance: parseFloat(this.getNodeText(node, 'OPENINGBALANCE')) || 0,
        closing_balance: closingBalance,
        is_revenue: this.isRevenueLedger(name, parent),
        is_expense: this.isExpenseLedger(name, parent),
      });
    });

    return ledgers;
  }

  parseVouchers(xmlResponse) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlResponse, 'text/xml');
    const vouchers = [];

    const voucherNodes = doc.querySelectorAll('VOUCHER');
    voucherNodes.forEach(node => {
      vouchers.push({
        date: this.getNodeText(node, 'DATE'),
        voucher_number: this.getNodeText(node, 'VOUCHERNUMBER'),
        voucher_type: this.getNodeText(node, 'VOUCHERTYPENAME'),
        party_name: this.getNodeText(node, 'PARTYLEDGERNAME'),
        amount: parseFloat(this.getNodeText(node, 'AMOUNT')) || 0,
        narration: this.getNodeText(node, 'NARRATION'),
      });
    });

    return vouchers;
  }

  parseStockItems(xmlResponse) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlResponse, 'text/xml');
    const items = [];

    const itemNodes = doc.querySelectorAll('STOCKITEM');
    itemNodes.forEach(node => {
      items.push({
        name: this.getNodeText(node, 'NAME'),
        parent: this.getNodeText(node, 'PARENT'),
        opening_quantity: parseFloat(this.getNodeText(node, 'OPENINGBALANCE')) || 0,
        closing_quantity: parseFloat(this.getNodeText(node, 'CLOSINGBALANCE')) || 0,
        opening_value: parseFloat(this.getNodeText(node, 'OPENINGVALUE')) || 0,
        closing_value: parseFloat(this.getNodeText(node, 'CLOSINGVALUE')) || 0,
      });
    });

    return items;
  }

  // ==================== HELPERS ====================

  getNodeText(parentNode, tagName) {
    const node = parentNode.querySelector(tagName);
    return node ? node.textContent : '';
  }

  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  isRevenueLedger(name, parent) {
    const keywords = ['sales', 'income', 'revenue', 'receipt'];
    const nameLower = name.toLowerCase();
    const parentLower = parent.toLowerCase();
    return keywords.some(kw => nameLower.includes(kw) || parentLower.includes(kw));
  }

  isExpenseLedger(name, parent) {
    const keywords = ['expense', 'purchase', 'cost', 'salary', 'rent'];
    const nameLower = name.toLowerCase();
    const parentLower = parent.toLowerCase();
    return keywords.some(kw => nameLower.includes(kw) || parentLower.includes(kw));
  }
}

// Create singleton instance
const directTallyConnector = new DirectTallyConnector();

// Export both the class and instance
export { DirectTallyConnector };
export default directTallyConnector;

