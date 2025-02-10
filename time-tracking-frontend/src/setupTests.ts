import '@testing-library/jest-dom';

class TextEncoderPolyfill implements TextEncoder {
  readonly encoding = 'utf-8';

  encode(input: string = ''): Uint8Array {
    const arr = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      arr[i] = input.charCodeAt(i);
    }
    return arr;
  }

  encodeInto(source: string, destination: Uint8Array): { read: number; written: number } {
    const encoded = this.encode(source);
    destination.set(encoded);
    return { read: source.length, written: encoded.length };
  }
}

class TextDecoderPolyfill implements TextDecoder {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;

  constructor(label?: string, options?: TextDecoderOptions) {
    this.encoding = label || 'utf-8';
    this.fatal = options?.fatal ?? false;
    this.ignoreBOM = options?.ignoreBOM ?? false;
  }

  decode(input?: BufferSource | ArrayBuffer | null, options?: TextDecodeOptions): string {
    if (!input) return '';

    let bytes: Uint8Array;
    if (input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else if (ArrayBuffer.isView(input)) {
      bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    } else {
      return '';
    }

    if (options?.stream) {
      console.warn('Streaming not implemented in this polyfill');
    }

    return String.fromCharCode(...bytes);
  }
}

// Assign polyfills to global scope
(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoderPolyfill }).TextEncoder = TextEncoderPolyfill;
(globalThis as typeof globalThis & { TextDecoder: typeof TextDecoderPolyfill }).TextDecoder = TextDecoderPolyfill;
