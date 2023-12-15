/*
 * object.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import PDFAbstractReference from './abstract_reference.js';
import TBuf from '../utils/tbuf.js';

const pad = (str, length) => (Array(length + 1).join('0') + str).slice(-length);

const escapableRe = /[\n\r\t\b\f()\\]/g;
const escapable = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
  '\\': '\\\\',
  '(': '\\(',
  ')': '\\)'
};

// Convert little endian UTF-16 to big endian
const swapBytes = function(buff) {
  const l = buff.length;
  if (l & 0x01) {
    throw new Error('Buffer length must be even');
  } else {
    for (let i = 0, end = l - 1; i < end; i += 2) {
      const a = buff[i];
      buff[i] = buff[i + 1];
      buff[i + 1] = a;
    }
  }

  return buff;
};

class PDFObject {
  static convert(object, encryptFn = null) {
    // String literals are converted to the PDF name type
    if (typeof object === 'string') {
      return `/${object}`;

      // String objects are converted to PDF strings (UTF-16)
    } else if (object instanceof String) {
      let string = object;
      // Detect if this is a unicode string
      let isUnicode = false;
      for (let i = 0, end = string.length; i < end; i++) {
        if (string.charCodeAt(i) > 0x7f) {
          isUnicode = true;
          break;
        }
      }

      // If so, encode it as big endian UTF-16
      let stringBuffer;
      if (isUnicode) {
        stringBuffer = swapBytes(new DataView(TBuf.str2Buffer(`\ufeff${string}`)));
      } else {
        stringBuffer = new DataView(TBuf.str2Buffer(string.valueOf()));
      }

      // Encrypt the string when necessary
      if (encryptFn) {
        string = TBuf.dataView2Str(encryptFn(stringBuffer));
      } else {
        string = TBuf.dataView2Str(stringBuffer);
      }

      // Escape characters as required by the spec
      string = string.replace(escapableRe, c => escapable[c]);

      return `(${string})`;

      // Buffers are converted to PDF hex strings
    } else if (ArrayBuffer.isView(object)) {
      return `<${TBuf.dataView2Hex(object)}>`;
    } else if (
      object instanceof PDFAbstractReference
    ) {
      return object.toString();
    } else if (object instanceof Date) {
      let string =
        `D:${pad(object.getUTCFullYear(), 4)}` +
        pad(object.getUTCMonth() + 1, 2) +
        pad(object.getUTCDate(), 2) +
        pad(object.getUTCHours(), 2) +
        pad(object.getUTCMinutes(), 2) +
        pad(object.getUTCSeconds(), 2) +
        'Z';

      // Encrypt the string when necessary
      if (encryptFn) {
        string = TBuf.dataView2Str(encryptFn(new Uint8Array(string)));
        string = string.replace(escapableRe, c => escapable[c]);
      }

      return `(${string})`;
    } else if (Array.isArray(object)) {
      const items = object.map(e => PDFObject.convert(e, encryptFn)).join(' ');
      return `[${items}]`;
    } else if ({}.toString.call(object) === '[object Object]') {
      const out = ['<<'];
      for (let key in object) {
        const val = object[key];
        out.push(`/${key} ${PDFObject.convert(val, encryptFn)}`);
      }

      out.push('>>');
      return out.join('\n');
    } else if (typeof object === 'number') {
      return PDFObject.number(object);
    } else {
      return `${object}`;
    }
  }

  static number(n) {
    if (n > -1e21 && n < 1e21) {
      return Math.round(n * 1e6) / 1e6;
    }

    throw new Error(`unsupported number: ${n}`);
  }
}

export default PDFObject;
