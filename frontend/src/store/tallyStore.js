import { create } from 'zustand'

const useTallyStore = create((set, get) => ({
  companies: [],
  ledgers: [],
  vouchers: [],
  selectedCompany: null,
  connected: false,
  loading: false,
  tallyUrl: 'http://localhost:9000',
  dataSource: 'live', // 'live' or 'backup'

  // Set companies - normalize to objects with name and source
  setCompanies: (companies) => {
    const normalizedCompanies = companies.map(c => {
      if (typeof c === 'string') {
        return { name: c, source: 'live' }
      }
      return { name: c.name || c, source: c.source || 'live', ...c }
    })
    set({ companies: normalizedCompanies })
  },
  
  setLedgers: (ledgers) => set({ ledgers }),
  
  setVouchers: (vouchers) => set({ vouchers }),
  
  setSelectedCompany: (company) => {
    // Also update data source based on company
    const companies = get().companies
    const selectedCompanyObj = companies.find(c => c.name === company)
    const source = selectedCompanyObj?.source || 'live'
    set({ selectedCompany: company, dataSource: source })
  },
  
  setConnected: (connected) => set({ connected }),
  
  setLoading: (loading) => set({ loading }),
  
  setTallyUrl: (url) => set({ tallyUrl: url }),
  
  setDataSource: (source) => set({ dataSource: source }),
  
  // Get live companies only
  getLiveCompanies: () => get().companies.filter(c => c.source === 'live'),
  
  // Get backup companies only
  getBackupCompanies: () => get().companies.filter(c => c.source === 'backup'),
  
  reset: () => set({
    companies: [],
    ledgers: [],
    vouchers: [],
    selectedCompany: null,
    connected: false,
    loading: false,
    dataSource: 'live'
  })
}))

export default useTallyStore
 
