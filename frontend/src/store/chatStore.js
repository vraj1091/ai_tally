import { create } from 'zustand'

const useChatStore = create((set) => ({
  messages: [],
  loading: false,
  selectedCompany: null,
  tallyUrl: 'http://localhost:9000',
  initialized: false,

  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setLoading: (loading) => set({ loading }),
  
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  
  setTallyUrl: (url) => set({ tallyUrl: url }),
  
  setInitialized: (initialized) => set({ initialized }),
  
  clearMessages: () => set({ messages: [] }),
  
  reset: () => set({
    messages: [],
    loading: false,
    selectedCompany: null,
    initialized: false
  })
}))

export default useChatStore
 
