/**
 * 끌어다 놓은 파일·폴더·ZIP에서 엑셀 파일만 추려내는 도구.
 *
 * [개인정보 보호]
 * 모든 처리는 브라우저 안에서만 일어난다. 네트워크 요청도, 콘솔 출력도 없다.
 * ZIP 해제도 메모리에서만 하고 어디에도 저장하지 않는다.
 */

/** 파일 하나를 읽어 이름과 내용만 들고 다닌다 */
export interface PickedWorkbook {
  /** 화면 안내에 쓰는 이름 (ZIP 안의 파일이면 ZIP 이름을 앞에 붙인다) */
  name: string;
  buffer: ArrayBuffer;
}

export interface CollectResult {
  workbooks: PickedWorkbook[];
  /** 엑셀이 아니어서 건너뛴 파일 이름 */
  skipped: string[];
}

const EXCEL_PATTERN = /\.(xlsx|xls)$/i;
const ZIP_PATTERN = /\.zip$/i;

/** 엑셀이 열려 있을 때 생기는 임시 파일(~$…)이나 맥에서 만든 부산물은 제외한다 */
const isJunk = (path: string): boolean => {
  const base = path.split('/').pop() ?? path;
  return base.startsWith('~$') || base.startsWith('._') || path.startsWith('__MACOSX/') || base === '.DS_Store';
};

export const isExcelName = (name: string): boolean => EXCEL_PATTERN.test(name) && !isJunk(name);
export const isZipName = (name: string): boolean => ZIP_PATTERN.test(name) && !isJunk(name);

/** 폴더를 끌어다 놓은 경우 하위까지 훑는다 */
const readEntry = async (entry: any, out: File[]): Promise<void> => {
  if (!entry) return;

  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => {
      entry.file((f: File) => resolve(f), () => resolve(null));
    });
    if (file) out.push(file);
    return;
  }

  if (entry.isDirectory) {
    const reader = entry.createReader();
    // readEntries는 한 번에 최대 100개만 돌려주므로 빈 배열이 나올 때까지 반복해야 한다
    let batch: any[] = [];
    do {
      batch = await new Promise<any[]>((resolve) => {
        reader.readEntries((entries: any[]) => resolve(entries), () => resolve([]));
      });
      for (const child of batch) {
        await readEntry(child, out);
      }
    } while (batch.length > 0);
  }
};

/**
 * 끌어다 놓은 것에서 실제 파일 목록을 뽑는다.
 * 폴더를 지원하는 브라우저에서는 폴더 안까지 들어가고, 아니면 파일 목록만 쓴다.
 */
export const collectDroppedFiles = async (dataTransfer: DataTransfer): Promise<File[]> => {
  const items = Array.from(dataTransfer.items ?? []);
  const entries = items
    .filter((item) => item.kind === 'file')
    .map((item) => (typeof (item as any).webkitGetAsEntry === 'function' ? (item as any).webkitGetAsEntry() : null))
    .filter(Boolean);

  if (entries.length === 0) {
    return Array.from(dataTransfer.files ?? []);
  }

  const files: File[] = [];
  for (const entry of entries) {
    await readEntry(entry, files);
  }
  return files;
};

/**
 * 파일 목록에서 엑셀만 남긴다. ZIP은 열어서 안의 엑셀까지 꺼낸다.
 * ZIP 안에 또 ZIP이 있는 경우는 다루지 않는다(예약현황조회 내려받기에는 없는 형태다).
 */
export const expandToWorkbooks = async (files: File[]): Promise<CollectResult> => {
  const workbooks: PickedWorkbook[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (isJunk(file.name)) continue;

    if (isExcelName(file.name)) {
      workbooks.push({ name: file.name, buffer: await file.arrayBuffer() });
      continue;
    }

    if (isZipName(file.name)) {
      try {
        // 압축 해제 모듈은 ZIP을 실제로 받았을 때만 불러온다
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const inside = Object.values(zip.files).filter((entry) => !entry.dir && isExcelName(entry.name));

        if (inside.length === 0) {
          skipped.push(file.name);
          continue;
        }

        for (const entry of inside) {
          const buffer = await entry.async('arraybuffer');
          const base = entry.name.split('/').pop() ?? entry.name;
          workbooks.push({ name: `${file.name} / ${base}`, buffer });
        }
      } catch {
        skipped.push(file.name);
      }
      continue;
    }

    skipped.push(file.name);
  }

  return { workbooks, skipped };
};
