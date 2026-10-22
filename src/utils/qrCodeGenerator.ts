/**
 * Standalone QR Code (Model 2) Generator in Pure TypeScript.
 * Based on the standard ISO/IEC 18004 QR specification & Kazuhiko Arase's algorithm (MIT License).
 * Zero external dependencies. Fully compatible with Vite, SSR, and React 19.
 */

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

const QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
  MODE_KANJI: 1 << 3,
};

const QRErrorCorrectLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

const QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7,
};

// Galois Field arithmetic for Reed-Solomon Error Correction
const QRMath = {
  glog(n: number): number {
    if (n < 1) throw new Error(`glog(${n})`);
    return QRMath.LOG_TABLE[n] ?? 0;
  },
  gexp(n: number): number {
    let val = n;
    while (val < 0) val += 255;
    while (val >= 255) val -= 255;
    return QRMath.EXP_TABLE[val] ?? 0;
  },
  EXP_TABLE: new Array<number>(256).fill(0),
  LOG_TABLE: new Array<number>(256).fill(0),
};

for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) {
  QRMath.EXP_TABLE[i] =
    (QRMath.EXP_TABLE[i - 4] ?? 0) ^
    (QRMath.EXP_TABLE[i - 5] ?? 0) ^
    (QRMath.EXP_TABLE[i - 6] ?? 0) ^
    (QRMath.EXP_TABLE[i - 8] ?? 0);
}
for (let i = 0; i < 255; i++) {
  const expVal = QRMath.EXP_TABLE[i] ?? 0;
  QRMath.LOG_TABLE[expVal] = i;
}

class QRPolynomial {
  num: number[];
  constructor(num: number[], shift = 0) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array<number>(num.length - offset + shift).fill(0);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset] ?? 0;
    }
  }
  get(index: number): number {
    return this.num[index] ?? 0;
  }
  getLength(): number {
    return this.num.length;
  }
  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array<number>(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        const val = num[i + j] ?? 0;
        num[i + j] = val ^ QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num);
  }
  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = this.num.slice();
    for (let i = 0; i < e.getLength(); i++) {
      const val = num[i] ?? 0;
      num[i] = val ^ QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num).mod(e);
  }
}

class QR8BitByte {
  mode = QRMode.MODE_8BIT_BYTE;
  data: string;
  bytes: number[];
  constructor(data: string) {
    this.data = data;
    this.bytes = [];
    for (let i = 0; i < data.length; i++) {
      const c = data.charCodeAt(i);
      if (c > 0xff) {
        this.bytes.push((c >>> 8) & 0xff);
        this.bytes.push(c & 0xff);
      } else {
        this.bytes.push(c & 0xff);
      }
    }
  }
  getLength(): number {
    return this.bytes.length;
  }
  write(buffer: QRBitBuffer) {
    for (let i = 0; i < this.bytes.length; i++) {
      buffer.put(this.bytes[i] ?? 0, 8);
    }
  }
}

class QRBitBuffer {
  buffer: number[] = [];
  length = 0;
  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    const byteVal = this.buffer[bufIndex] ?? 0;
    return ((byteVal >>> (7 - (index % 8))) & 1) === 1;
  }
  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }
  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) {
      const byteVal = this.buffer[bufIndex] ?? 0;
      this.buffer[bufIndex] = byteVal | (0x80 >>> (this.length % 8));
    }
    this.length++;
  }
}

// RS block parameters table: [totalCodewords, dataCodewords] per block
const RS_BLOCK_TABLE: number[][][] = [
  // 1
  [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9]],
  // 2
  [[1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16]],
  // 3
  [[1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13]],
  // 4
  [[1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9]],
  // 5
  [[1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12]],
  // 6
  [[2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15]],
  // 7
  [[2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14]],
  // 8
  [[2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15]],
  // 9
  [[2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13]],
  // 10
  [[2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]]
];

const PATTERN_POSITION_TABLE: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
];

class QRRSBlock {
  totalCount: number;
  dataCount: number;
  constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }
  static getRSBlocks(typeNumber: number, errorCorrectLevel: number): QRRSBlock[] {
    const typeGroup = RS_BLOCK_TABLE[typeNumber - 1];
    if (!typeGroup) throw new Error(`Bad RS block @ type=${typeNumber}`);
    const rsBlock = typeGroup[errorCorrectLevel];
    if (!rsBlock) throw new Error(`Bad RS block @ level=${errorCorrectLevel}`);
    const list: QRRSBlock[] = [];
    for (let i = 0; i < rsBlock.length; i += 3) {
      const count = rsBlock[i] ?? 0;
      const totalCount = rsBlock[i + 1] ?? 0;
      const dataCount = rsBlock[i + 2] ?? 0;
      for (let j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }
    return list;
  }
}

const QRUtil = {
  getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335) >= 0) {
      d ^= 1335 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335));
    }
    return ((data << 10) | d) ^ 21522;
  },
  getBCHDigit(data: number): number {
    let digit = 0;
    let d = data;
    while (d !== 0) {
      digit++;
      d >>>= 1;
    }
    return digit;
  },
  getPatternPosition(typeNumber: number): number[] {
    return PATTERN_POSITION_TABLE[typeNumber - 1] ?? [];
  },
  getMask(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000: return (i + j) % 2 === 0;
      case QRMaskPattern.PATTERN001: return i % 2 === 0;
      case QRMaskPattern.PATTERN010: return j % 3 === 0;
      case QRMaskPattern.PATTERN011: return (i + j) % 3 === 0;
      case QRMaskPattern.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case QRMaskPattern.PATTERN101: return ((i * j) % 2) + ((i * j) % 3) === 0;
      case QRMaskPattern.PATTERN110: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case QRMaskPattern.PATTERN111: return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default: throw new Error(`Invalid mask pattern: ${maskPattern}`);
    }
  },
  getErrorFactoryPolynomial(errorCorrectLength: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  },
  getLengthInBits(mode: number, type: number): number {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.MODE_NUMBER: return 10;
        case QRMode.MODE_ALPHA_NUM: return 9;
        case QRMode.MODE_8BIT_BYTE: return 8;
        default: return 8;
      }
    }
    return 16;
  }
};

export class QRCodeModel {
  typeNumber: number;
  errorCorrectLevel: number;
  modules: (boolean | null)[][] = [];
  moduleCount = 0;
  dataCache: number[] | null = null;
  dataList: QR8BitByte[] = [];

  constructor(typeNumber: number, errorCorrectLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
  }

  addData(data: string) {
    this.dataList.push(new QR8BitByte(data));
    this.dataCache = null;
  }

  isDark(row: number, col: number): boolean {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(`${row},${col}`);
    }
    const r = this.modules[row];
    return !!(r && r[col]);
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  make() {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  private makeImpl(test: boolean, maskPattern: number) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount).fill(null);
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.dataCache === null) {
      this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    }
    this.mapData(this.dataCache, maskPattern);
  }

  private setupPositionProbePattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        const targetRow = this.modules[row + r];
        if (!targetRow) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          targetRow[col + c] = true;
        } else {
          targetRow[col + c] = false;
        }
      }
    }
  }

  private setupPositionAdjustPattern() {
    const pos = QRUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i] ?? 0;
        const col = pos[j] ?? 0;
        const targetRow = this.modules[row];
        if (!targetRow || targetRow[col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const subRow = this.modules[row + r];
            if (!subRow) continue;
            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
              subRow[col + c] = true;
            } else {
              subRow[col + c] = false;
            }
          }
        }
      }
    }
  }

  private setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      const row = this.modules[r];
      if (row && row[6] === null) {
        row[6] = r % 2 === 0;
      }
    }
    const timingRow = this.modules[6];
    if (timingRow) {
      for (let c = 8; c < this.moduleCount - 8; c++) {
        if (timingRow[c] === null) {
          timingRow[c] = c % 2 === 0;
        }
      }
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number) {
    const data = (this.errorCorrectLevel << 3) | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) {
        const r = this.modules[i];
        if (r) r[8] = mod;
      } else if (i < 8) {
        const r = this.modules[i + 1];
        if (r) r[8] = mod;
      } else {
        const r = this.modules[this.moduleCount - 15 + i];
        if (r) r[8] = mod;
      }

      const row8 = this.modules[8];
      if (row8) {
        if (i < 8) row8[this.moduleCount - i - 1] = mod;
        else if (i < 9) row8[15 - i] = mod;
        else row8[15 - i - 1] = mod;
      }
    }
    const targetRow = this.modules[this.moduleCount - 8];
    if (targetRow) targetRow[8] = !test;
  }

  private mapData(data: number[], maskPattern: number) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          const targetRow = this.modules[row];
          if (targetRow && targetRow[col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              const byteVal = data[byteIndex] ?? 0;
              dark = ((byteVal >>> bitIndex) & 1) === 1;
            }
            const mask = QRUtil.getMask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            targetRow[col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = this.getLostPoint();
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  }

  private getLostPoint(): number {
    const mc = this.moduleCount;
    let lostPoint = 0;
    for (let row = 0; row < mc; row++) {
      for (let col = 0; col < mc; col++) {
        let sameCount = 0;
        const dark = this.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || mc <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || mc <= col + c || (r === 0 && c === 0)) continue;
            if (dark === this.isDark(row + r, col + c)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;
      }
    }
    return lostPoint;
  }

  private static createData(typeNumber: number, errorCorrectLevel: number, dataList: QR8BitByte[]): number[] {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    const buffer = new QRBitBuffer();
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      if (!data) continue;
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      const b = rsBlocks[i];
      if (b) totalDataCount += b.dataCount;
    }

    if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.length % 8 !== 0) buffer.putBit(false);

    while (true) {
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }

    return QRCodeModel.createBytes(buffer, rsBlocks);
  }

  private static createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): number[] {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata: number[][] = new Array(rsBlocks.length);
    const ecdata: number[][] = new Array(rsBlocks.length);

    for (let r = 0; r < rsBlocks.length; r++) {
      const block = rsBlocks[r];
      if (!block) continue;
      const dcCount = block.dataCount;
      const ecCount = block.totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      const dcRow: number[] = new Array(dcCount).fill(0);
      for (let i = 0; i < dcCount; i++) {
        dcRow[i] = 0xff & (buffer.buffer[i + offset] ?? 0);
      }
      dcdata[r] = dcRow;
      offset += dcCount;

      const rsPoly = QRUtil.getErrorFactoryPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcRow, rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      const ecRow: number[] = new Array(rsPoly.getLength() - 1).fill(0);
      for (let i = 0; i < ecRow.length; i++) {
        const modIndex = i + modPoly.getLength() - ecRow.length;
        ecRow[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
      ecdata[r] = ecRow;
    }

    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      const b = rsBlocks[i];
      if (b) totalCodeCount += b.totalCount;
    }
    const data: number[] = new Array(totalCodeCount).fill(0);
    let index = 0;

    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        const row = dcdata[r];
        if (row && i < row.length) {
          data[index++] = row[i] ?? 0;
        }
      }
    }

    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        const row = ecdata[r];
        if (row && i < row.length) {
          data[index++] = row[i] ?? 0;
        }
      }
    }

    return data;
  }
}

/**
 * Generate standard QR code matrix (2D boolean array).
 * Automatically chooses the minimal standard QR version (1 to 10) that safely holds the content.
 */
export function generateQRMatrix(
  text: string,
  errorCorrectLevel: ErrorCorrectionLevel = 'M'
): boolean[][] {
  const ec = QRErrorCorrectLevel[errorCorrectLevel];
  let qr: QRCodeModel | null = null;
  for (let version = 1; version <= 10; version++) {
    try {
      const candidate = new QRCodeModel(version, ec);
      candidate.addData(text);
      candidate.make();
      qr = candidate;
      break;
    } catch {
      // Data exceeded capacity for this version, try next
    }
  }

  if (!qr) {
    qr = new QRCodeModel(10, ec);
    qr.addData(text);
    qr.make();
  }

  const count = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let r = 0; r < count; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < count; c++) {
      row.push(qr.isDark(r, c));
    }
    matrix.push(row);
  }
  return matrix;
}
