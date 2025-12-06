/// <reference types="vite/client" />

declare global {
  interface Document {
    documentElement: {
      requestFullscreen(): Promise<void>;
    };
    fullscreenElement: Element | null;
    exitFullscreen(): Promise<void>;
  }

  interface Window {
    document: Document;
  }

  var document: Document;
  var window: Window;
}

export {}
