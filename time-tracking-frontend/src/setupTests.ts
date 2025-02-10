import '@testing-library/jest-dom';

// Polyfill implementation that matches the Web API TextEncoder interface
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

// Polyfill implementation that matches the Web API TextDecoder interface
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
    
    // Handle different input types
    let bytes: Uint8Array;
    if (typeof ArrayBuffer !== 'undefined' && input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(input)) {
      bytes = new Uint8Array((input as ArrayBufferView).buffer, 
        (input as ArrayBufferView).byteOffset, 
        (input as ArrayBufferView).byteLength);
    } else if (input instanceof Uint8Array) {
      bytes = input;
    } else {
      return '';
    }

    // Use options if provided (currently just a placeholder)
    if (options?.stream) {
      // Handle streaming if needed in the future
      console.warn('Streaming not implemented in this polyfill');
    }

    return String.fromCharCode.apply(null, Array.from(bytes));
  }
}

// Ensure global types are correctly declared
declare global {
  var TextEncoder: { new (): TextEncoder; prototype: TextEncoder; };
  var TextDecoder: { 
    new (label?: string, options?: TextDecoderOptions): TextDecoder; 
    prototype: TextDecoder; 
  };
}

// Assign polyfills to global scope
globalThis.TextEncoder = TextEncoderPolyfill as any;
globalThis.TextDecoder = TextDecoderPolyfill as any;
