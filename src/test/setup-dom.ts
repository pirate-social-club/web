import { parseHTML } from "linkedom";

const DEFAULT_HTML = "<!DOCTYPE html><html><body></body></html>";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    clear: () => {
      values.clear();
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, String(value));
    },
    get length() {
      return values.size;
    },
  };
}

function createCanvasContextStub() {
  return {
    clearRect: () => undefined,
    drawImage: () => undefined,
    fillRect: () => undefined,
    fillStyle: "",
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    measureText: (text: string) => ({ width: text.length * 8 }),
    putImageData: () => undefined,
    restore: () => undefined,
    save: () => undefined,
    scale: () => undefined,
    setTransform: () => undefined,
    transform: () => undefined,
  };
}

export function createTestDom(html = DEFAULT_HTML) {
  return parseHTML(html);
}

export function installDomGlobals(html = DEFAULT_HTML) {
  const { document, window } = createTestDom(html);

  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: window.navigator });
  Object.defineProperty(globalThis, "Element", { configurable: true, value: window.Element });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: window.HTMLElement });

  const storage = createMemoryStorage();
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });

  const canvasPrototype = (window as typeof window & {
    HTMLCanvasElement?: { prototype: { getContext?: unknown } };
  }).HTMLCanvasElement?.prototype;
  if (canvasPrototype) {
    Object.defineProperty(canvasPrototype, "getContext", {
      configurable: true,
      value: () => createCanvasContextStub(),
    });
  }

  return { document, window };
}
