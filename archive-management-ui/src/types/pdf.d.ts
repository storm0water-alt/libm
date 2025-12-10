import type { PDFDocumentProxy } from 'pdfjs-dist'

declare global {
  interface Window {
    pdfjsLib: {
      version: string
      GlobalWorkerOptions: {
        workerSrc: string
      }
      getDocument: (source: any) => any
    }
  }
}

export {}