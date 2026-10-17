'use strict';

/**
 * 받은 엑셀 여러 개를 압축 없이(STORE) ZIP 하나로 묶는다.
 * "ZIP으로 저장"에서 쓰며, RAIM 출석부 탭은 ZIP을 끌어다 놓으면 안의 엑셀을 모두 읽는다.
 * (data: URL로 저장하면 크롬 다운로드 기록에 파일 내용이 남을 수 있어 blob 하나로 저장한다)
 */
(() => {
  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  const crc32 = (bytes) => {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };

  /** 현재 시각을 ZIP(DOS) 날짜·시간 형식으로 */
  const dosDateTime = (date) => ({
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  });

  /**
   * @param {{ name: string, bytes: Uint8Array }[]} entries
   * @returns {Blob}
   */
  const buildZip = (entries) => {
    const encoder = new TextEncoder();
    const { time, date } = dosDateTime(new Date());
    const UTF8_FLAG = 0x0800;
    const parts = [];
    const central = [];
    let offset = 0;

    entries.forEach(({ name, bytes }) => {
      const nameBytes = encoder.encode(name);
      const crc = crc32(bytes);

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, UTF8_FLAG, true);
      local.setUint16(8, 0, true); // STORE
      local.setUint16(10, time, true);
      local.setUint16(12, date, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, bytes.length, true);
      local.setUint32(22, bytes.length, true);
      local.setUint16(26, nameBytes.length, true);
      local.setUint16(28, 0, true);
      parts.push(local.buffer, nameBytes, bytes);

      const entry = new DataView(new ArrayBuffer(46));
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);
      entry.setUint16(6, 20, true);
      entry.setUint16(8, UTF8_FLAG, true);
      entry.setUint16(10, 0, true);
      entry.setUint16(12, time, true);
      entry.setUint16(14, date, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, bytes.length, true);
      entry.setUint32(24, bytes.length, true);
      entry.setUint16(28, nameBytes.length, true);
      entry.setUint32(42, offset, true);
      central.push(entry.buffer, nameBytes);

      offset += 30 + nameBytes.length + bytes.length;
    });

    const centralSize = central.reduce((sum, part) => sum + part.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, entries.length, true);
    end.setUint16(10, entries.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);

    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
  };

  globalThis.RAIM_ZIP = Object.freeze({ buildZip, crc32 });
})();
