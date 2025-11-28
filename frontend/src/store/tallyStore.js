import { create } from 'zustand'

const useTallyStore = create((set) => ({
  companies: [],
  ledgers: [],
  vouchers: [],
  selectedCompany: null,
  connected: false,
  loading: false,
  tallyUrl: 'http://localhost:9000',

  setCompanies: (companies) => set({ companies }),
  
  setLedgers: (ledgers) => set({ ledgers }),
  
  setVouchers: (vouchers) => set({ vouchers }),
  
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  
  setConnected: (connected) => set({ connected }),
  
  setLoading: (loading) => set({ loading }),
  
  setTallyUrl: (url) => set({ tallyUrl: url }),
  
  reset: () => set({
    companies: [],
    ledgers: [],
    vouchers: [],
    selectedCompany: null,
    connected: false,
    loading: false
  })
}))

export default useTallyStore
 
