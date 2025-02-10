import '@testing-library/jest-dom';

declare global {
  interface Global {
    TextEncoder: typeof TextEncoderPolyfill;
    TextDecoder: typeof TextDecoderPolyfill;
  }
}

class TextEncoderPolyfill {
  encoding = 'utf-8';
  
  encode(text: string): Uint8Array {
    const arr = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      arr[i] = text.charCodeAt(i);
    }
    return arr;
  }

  encodeInto(text: string, dest: Uint8Array): { read: number; written: number } {
    const encoded = this.encode(text);
    dest.set(encoded);
    return { read: text.length, written: encoded.length };
  }
}

class TextDecoderPolyfill {
  encoding = 'utf-8';
  fatal = false;
  ignoreBOM = false;

  constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }) {
    if (options) {
      this.fatal = options.fatal ?? false;
      this.ignoreBOM = options.ignoreBOM ?? false;
    }
  }

  decode(arr: Uint8Array | ArrayBuffer): string {
    const bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
    return String.fromCharCode.apply(null, Array.from(bytes));
  }
}

(global as Global).TextEncoder = TextEncoderPolyfill;
(global as Global).TextDecoder = TextDecoderPolyfill;
