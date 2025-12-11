import { create } from 'zustand'

const useDocumentStore = create((set) => ({
  documents: [],
  uploading: false,
  uploadProgress: 0,

  setDocuments: (documents) => set({ documents }),
  
  addDocument: (document) => set((state) => ({
    documents: [...state.documents, document]
  })),
  
  removeDocument: (filename) => set((state) => ({
    documents: state.documents.filter(doc => doc.filename !== filename)
  })),
  
  setUploading: (uploading) => set({ uploading }),
  
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  
  reset: () => set({
    documents: [],
    uploading: false,
    uploadProgress: 0
  })
}))

export default useDocumentStore
 
