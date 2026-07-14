import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { VisitorRecord } from '@/store/useStore';
import { saveAs } from 'file-saver';
import { EXCEL_TEMPLATE_BASE64 } from './excelTemplateBase64';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface DiagnosticReport {
  url: string;
  status?: number;
  statusText?: string;
  contentType?: string;
  contentLengthHeader?: string;
  actualBytes?: number;
  magicBytesHex?: string;
  magicBytesAscii?: string;
  isZipSignature: boolean;
  rawSampleText?: string;
  errorMessage: string;
  errorStack?: string;
}

const showDiagnosticsModal = (report: DiagnosticReport) => {
  if (typeof document === 'undefined') return;

  // Ensure custom animations style is injected
  if (!document.getElementById('excel-debug-modal-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'excel-debug-modal-styles';
    styleTag.innerHTML = `
      @keyframes excelFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes excelScaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .animate-excel-fade { animation: excelFadeIn 0.2s ease-out forwards; }
      .animate-excel-scale { animation: excelScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    `;
    document.head.appendChild(styleTag);
  }

  // Remove existing modal if any
  const existing = document.getElementById('excel-debug-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'excel-debug-modal';
  modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-excel-fade';
  
  // Advanced Diagnostics Cause Analysis
  let probableCause = '알 수 없는 오류가 발생했습니다.';
  let resolutionSteps = '브라우저 새로고침(F5 또는 Ctrl+F5)을 시도해 보세요.';
  
  if (report.status === 404) {
    probableCause = '서버에서 엑셀 템플릿 파일(`/public/sheets/양식.xlsx`)을 찾지 못했습니다 (404 Not Found).\n배포 과정에서 파일이 누락되었거나 경로가 잘못되었습니다.';
    resolutionSteps = '프로젝트의 `public/sheets/` 디렉토리에 `양식.xlsx` 파일이 실제로 존재하는지, 그리고 대소문자가 정확히 일치하는지 확인하십시오.';
  } else if (report.rawSampleText?.trim().toLowerCase().startsWith('<html') || report.rawSampleText?.trim().toLowerCase().startsWith('<!doctype')) {
    probableCause = '서버가 엑셀 파일 대신 HTML 문서(404 에러 또는 단일 페이지 앱 fallback 페이지)를 반환했습니다.\n이로 인해 ExcelJS 라이브러리가 텍스트를 zip 포맷으로 읽어들이지 못하고 실패했습니다.';
    resolutionSteps = '1. 서버 경로 설정 및 public 디렉토리 내 `sheets/양식.xlsx` 파일이 온전히 포함되었는지 검사하십시오.\n2. 서비스 워커의 파일 캐시 정책을 확인해 주십시오.';
  } else if (report.errorMessage.includes('Corrupted zip') || report.errorMessage.includes('missing') || report.errorMessage.includes('signature')) {
    probableCause = '서비스 워커(Vite PWA / Workbox 등)가 이진(Binary) 엑셀 템플릿 파일을 잘못된 UTF-8 텍스트로 가로채어 강제 변환 후 캐싱했습니다.\n이로 인해 원본 이진 바이트 스트림이 변형(Garbled)되면서 내부 ZIP 헤더 데이터가 완전히 오염되었고, 파일 크기를 오작동 판정하여 "Corrupted zip" 에러가 뜹니다.';
    resolutionSteps = '하단의 [서비스 워커 및 브라우저 캐시 강제 비우기] 버튼을 누르시면, 손상된 서비스 워커 등록을 완전히 지우고 캐시를 초기화하여 정상 버전을 다시 받아옵니다.';
  } else {
    probableCause = report.errorMessage;
    resolutionSteps = '네트워크 일시적 단절 또는 브라우저 캐시 엉킴일 수 있습니다. 강력한 새로고침(Ctrl + Shift + R)을 해 주십시오.';
  }

  const debugText = `[EXPORT DIAGNOSTIC REPORT]
Timestamp: ${new Date().toISOString()}
Target URL: ${report.url}
HTTP Status: ${report.status || 'N/A'} ${report.statusText || ''}
Content-Type Header: ${report.contentType || 'N/A'}
Content-Length Header: ${report.contentLengthHeader || 'N/A'}
Actual Downloaded Bytes: ${report.actualBytes !== undefined ? report.actualBytes : 'N/A'} bytes
Magic Bytes (Hex): ${report.magicBytesHex || 'N/A'}
Magic Bytes (ASCII): ${report.magicBytesAscii || 'N/A'}
ZIP signature match: ${report.isZipSignature ? 'YES (PK\\x03\\x04)' : 'NO'}
Error Message: ${report.errorMessage}
${report.errorStack ? `Error Stack:\n${report.errorStack}` : ''}
${report.rawSampleText ? `Raw text sample (first 150 chars):\n${report.rawSampleText.substring(0, 150)}` : ''}`;

  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 max-w-xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-excel-scale">
      <!-- Header -->
      <div class="flex items-center space-x-3 pb-4 border-b border-gray-100">
        <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-base font-extrabold text-gray-900 leading-none">엑셀 생성 문제 디버깅 및 자가 진단</h3>
          <p class="text-[11px] text-gray-400 mt-1">ExcelJS & JSZip Binary Corruption Diagnostics Tool</p>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-sm text-gray-700 leading-relaxed">
        <!-- Cause -->
        <div class="bg-rose-50/50 rounded-xl p-4 border border-rose-100/50">
          <h4 class="font-bold text-rose-800 text-xs flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block"></span>
            <span>예상되는 문제 발생 원인</span>
          </h4>
          <p class="text-xs text-rose-700 mt-1.5 font-medium leading-relaxed">${probableCause.replace(/\n/g, '<br/>')}</p>
        </div>

        <!-- Resolution Steps -->
        <div class="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/50">
          <h4 class="font-bold text-emerald-800 text-xs flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
            <span>✔ 문제 해결 가이드</span>
          </h4>
          <p class="text-xs text-emerald-700 mt-1.5 font-medium whitespace-pre-line leading-relaxed">${resolutionSteps}</p>
        </div>

        <!-- Technical Specs -->
        <div class="space-y-1.5">
          <h4 class="font-bold text-gray-500 text-[11px] uppercase tracking-wider">실시간 자가 진단 스펙</h4>
          <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 text-[11px] font-mono space-y-1 text-gray-600">
            <div class="flex justify-between border-b border-gray-100/30 pb-1">
              <span class="text-gray-400">요청 파일 주소:</span>
              <span class="text-gray-800 font-bold break-all max-w-[280px] text-right">${report.url}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100/30 py-1">
              <span class="text-gray-400">HTTP 응답 코드:</span>
              <span class="font-bold ${report.status === 200 ? 'text-emerald-600' : 'text-rose-600'}">${report.status || '연결 실패'} ${report.statusText || ''}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100/30 py-1">
              <span class="text-gray-400">Content-Type 헤더:</span>
              <span class="text-gray-800 font-bold">${report.contentType || 'N/A'}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100/30 py-1">
              <span class="text-gray-400">수신 파일 크기:</span>
              <span class="text-gray-800 font-bold">${report.actualBytes !== undefined ? `${report.actualBytes.toLocaleString()} bytes` : '0 bytes'}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100/30 py-1">
              <span class="text-gray-400">헤더 시그니처 (Hex):</span>
              <span class="text-gray-800 font-bold">${report.magicBytesHex || 'N/A'}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-gray-400">정상 ZIP 여부:</span>
              <span class="font-extrabold ${report.isZipSignature ? 'text-emerald-600' : 'text-rose-600'}">${report.isZipSignature ? '일치 (PK\\x03\\x04)' : '불일치 (손상됨)'}</span>
            </div>
          </div>
        </div>

        <!-- Full logs collapsed -->
        <details class="group border border-gray-100 rounded-xl overflow-hidden">
          <summary class="list-none flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-50 cursor-pointer select-none">
            <span class="text-[11px] font-bold text-gray-500 group-open:text-gray-800">상세 디버그 로그 및 호출 스택</span>
            <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </summary>
          <div class="p-3 bg-gray-900 border-t border-gray-800">
            <pre class="text-[9px] text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-[150px] leading-relaxed">${debugText}</pre>
          </div>
        </details>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t border-gray-100 shrink-0">
        <button id="excel-btn-fix" class="flex-1 bg-brand-dark hover:bg-brand-blue text-white text-xs font-extrabold py-2.5 px-4 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center space-x-1.5 focus:outline-none">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17m0 0V4"></path>
          </svg>
          <span>서비스 워커 및 캐시 완전 삭제 후 리로드</span>
        </button>
        <div class="flex space-x-2 shrink-0">
          <button id="excel-btn-copy" class="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 focus:outline-none">
            로그 복사
          </button>
          <button id="excel-btn-close" class="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 focus:outline-none">
            닫기
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Set up event listeners
  const btnClose = modal.querySelector('#excel-btn-close');
  if (btnClose) {
    btnClose.addEventListener('click', () => modal.remove());
  }

  const btnCopy = modal.querySelector('#excel-btn-copy');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(debugText)
        .then(() => {
          const originalText = btnCopy.textContent;
          btnCopy.textContent = '복사 완료!';
          setTimeout(() => btnCopy.textContent = originalText, 1500);
        })
        .catch(err => {
          console.error('Failed to copy text:', err);
          alert('로그 복사에 실패했습니다. 세부 정보 영역의 텍스트를 마우스 드래그로 수동 복사해 주세요.');
        });
    });
  }

  const btnFix = modal.querySelector('#excel-btn-fix');
  if (btnFix) {
    btnFix.addEventListener('click', async () => {
      btnFix.innerHTML = '<span>처리 중...</span>';
      btnFix.setAttribute('disabled', 'true');
      
      try {
        // 1. Unregister Service Workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('Unregistered service worker:', registration);
          }
        }
        // 2. Clear all cache keys
        if ('caches' in window) {
          const cacheNames = await window.caches.keys();
          for (const name of cacheNames) {
            await window.caches.delete(name);
            console.log('Deleted cache namespace:', name);
          }
        }
        
        btnFix.innerHTML = '<span>성공! 리로드 중...</span>';
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err: any) {
        console.error('Failure clearing service workers:', err);
        btnFix.innerHTML = '<span>오류 발생 (콘솔 확인)</span>';
        btnFix.removeAttribute('disabled');
        alert(`자가 해결 실패: ${err.message}. 브라우저 설정에서 캐시 및 사이트 데이터를 초기화하고 새로고침해 주세요.`);
      }
    });
  }
};

export const exportToXLSX = async (currentDateStr: string, allRecords: VisitorRecord[], mode: 'daily' | 'monthly' = 'daily') => {
  const diagnostics: DiagnosticReport = {
    url: 'Inlined Base64 (Local Resource)',
    isZipSignature: true,
    errorMessage: '',
    status: 200,
    statusText: 'OK',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  try {
    // Decode inlined base64 template directly (guarantees 100% integrity and zero network dependency)
    const arrayBuffer = base64ToArrayBuffer(EXCEL_TEMPLATE_BASE64);
    diagnostics.actualBytes = arrayBuffer.byteLength;
    diagnostics.contentLengthHeader = String(arrayBuffer.byteLength);

    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 8));
    const hexArray = Array.from(headerBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase());
    diagnostics.magicBytesHex = hexArray.join(' ');

    const decoder = new TextDecoder('utf-8', { fatal: false });
    diagnostics.magicBytesAscii = decoder.decode(headerBytes).replace(/[\x00-\x1F\x7F-\x9F]/g, '.');
    diagnostics.isZipSignature = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B && headerBytes[2] === 0x03 && headerBytes[3] === 0x04;
    diagnostics.rawSampleText = decoder.decode(new Uint8Array(arrayBuffer.slice(0, 300)));

    // 4. ExcelJS 워크북 로딩
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(arrayBuffer);
    } catch (zipError: any) {
      console.error('ExcelJS zip load error details:', zipError);
      diagnostics.errorStack = zipError.stack;
      throw new Error(`엑셀 템플릿을 해석하는 도중 오류가 발생했습니다 (ZIP 해제 오류): ${zipError.message || zipError}`);
    }
    
    const [year, month, day] = currentDateStr.split('-').map(Number);
    const validDay = day || 1; 
    const dateObj = new Date(year, month - 1, validDay);
    
    const dayOfWeek = dateObj.getDay(); 
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let targetWorksheet: ExcelJS.Worksheet;
    let baseRowRoom1: number;
    let baseRowRoom2: number;
    let titleCell = 'B1';
    let tableTitleCell: string;

    if (isWeekend) {
      targetWorksheet = workbook.worksheets[1]; 
      const otherSheet = workbook.worksheets[0];
      if (otherSheet) workbook.removeWorksheet(otherSheet.id);
      baseRowRoom1 = 43;
      baseRowRoom2 = 50;
      tableTitleCell = 'B41';
    } else {
      targetWorksheet = workbook.worksheets[0]; 
      const otherSheet = workbook.worksheets[1];
      if (otherSheet) workbook.removeWorksheet(otherSheet.id); 
      baseRowRoom1 = 42;
      baseRowRoom2 = 49;
      tableTitleCell = 'B40';
    }

    if (mode === 'daily') {
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const formattedDateTitle = `${format(dateObj, 'MM')}월 ${format(dateObj, 'dd')}일(${days[dayOfWeek]}요일) 일일 운영 결과 보고`;
      targetWorksheet.getCell(titleCell).value = formattedDateTitle;
    } else {
      const formattedDateTitle = `${format(dateObj, 'MM')}월 월간 운영 결과 보고`;
      targetWorksheet.getCell(titleCell).value = formattedDateTitle;
      targetWorksheet.getCell(tableTitleCell).value = `□ ${format(dateObj, 'yyyy')}년 ${format(dateObj, 'MM')}월 교육장 관람인원 (월간 누계)`;
    }

    let recordsToAggregate = allRecords;
    if (mode === 'monthly') {
      const currentMonthPrefix = currentDateStr.substring(0, 7);
      recordsToAggregate = allRecords.filter(r => r.date.startsWith(currentMonthPrefix));
    } else {
      recordsToAggregate = allRecords.filter(r => r.date === currentDateStr);
    }

    const getAggregatedData = (program: string, isAuto: boolean, specificSession?: string, limit?: number) => {
      const filtered = recordsToAggregate.filter(r => {
        const isMatchProgram = program === '무인자동차' ? (!r.program || r.program === '무인자동차') : r.program === program;
        if (!isMatchProgram) return false;
        if (isAuto) {
          return r.type === 'autonomous' || r.session === '단체';
        }
        return r.type === 'reserved' && r.session === specificSession;
      });

      let total = 0;
      let noShow = 0;
      let cancelled = 0;
      let walkIn = 0;
      let reserved = 0;
      let memo = '';

      filtered.forEach(r => {
        if (r.counts) {
          const rTotal = (r.counts.adult_m || 0) + (r.counts.adult_f || 0) +
                    (r.counts.youth_m || 0) + (r.counts.youth_f || 0) +
                    (r.counts.child_m || 0) + (r.counts.child_f || 0) +
                    (r.counts.infant_m || 0) + (r.counts.infant_f || 0);
          const rNoShow = (r.counts.noShow || 0);
          const rCancelled = (r.counts.cancelled || 0);

          let rRawReserved = isAuto ? 0 : rTotal + rNoShow + rCancelled;
          let rReserved = rRawReserved;
          let rWalkIn = 0;

          if (!isAuto && limit !== undefined && rRawReserved > limit) {
            rWalkIn = rRawReserved - limit;
            rReserved = limit;
          }

          total += rTotal;
          noShow += rNoShow;
          cancelled += rCancelled;
          walkIn += rWalkIn;
          reserved += rReserved;
        }
        if (r.memo) {
          memo += (memo ? "\n" : "") + r.memo;
        }
      });

      return { total, noShow, reserved, cancelled, walkIn, memo };
    };

    const fillRow = (rowNumber: number, data: { total: number, noShow: number, reserved: number, cancelled: number, walkIn: number, memo: string }) => {
      targetWorksheet.getCell(`E${rowNumber}`).value = data.reserved || 0; 
      targetWorksheet.getCell(`F${rowNumber}`).value = data.cancelled || 0; 
      targetWorksheet.getCell(`G${rowNumber}`).value = data.noShow || 0; 
      targetWorksheet.getCell(`H${rowNumber}`).value = data.walkIn || 0; 
      targetWorksheet.getCell(`I${rowNumber}`).value = data.total || 0; 
      if (data.memo) {
        targetWorksheet.getCell(`J${rowNumber}`).value = data.memo;
      } else {
        targetWorksheet.getCell(`J${rowNumber}`).value = '';
      }
    };

    const room1Config = [
      { row: baseRowRoom1, isAuto: true }, 
      { row: baseRowRoom1 + 1, session: '1회차 (10:30)' },
      { row: baseRowRoom1 + 2, session: '2회차 (13:00)' },
      { row: baseRowRoom1 + 3, session: '3회차 (13:30)' },
      { row: baseRowRoom1 + 4, session: '4회차 (15:30)' },
      { row: baseRowRoom1 + 5, session: '5회차 (16:00)' },
    ];
    let subTotalNoShow1 = 0, subTotalTotal1 = 0, subTotalReserved1 = 0, subTotalCancelled1 = 0, subTotalWalkIn1 = 0;
    room1Config.forEach(config => {
      const data = getAggregatedData('무인자동차', !!config.isAuto, config.session, 10);
      fillRow(config.row, data);
      subTotalNoShow1 += data.noShow;
      subTotalTotal1 += data.total;
      subTotalReserved1 += data.reserved;
      subTotalCancelled1 += data.cancelled;
      subTotalWalkIn1 += data.walkIn;
    });
    
    targetWorksheet.getCell(`E${baseRowRoom1 + 6}`).value = subTotalReserved1;
    targetWorksheet.getCell(`F${baseRowRoom1 + 6}`).value = subTotalCancelled1;
    targetWorksheet.getCell(`G${baseRowRoom1 + 6}`).value = subTotalNoShow1;
    targetWorksheet.getCell(`H${baseRowRoom1 + 6}`).value = subTotalWalkIn1;
    targetWorksheet.getCell(`I${baseRowRoom1 + 6}`).value = subTotalTotal1;

    let room2Config = [
      { row: baseRowRoom2, isAuto: true },
      { row: baseRowRoom2 + 1, session: '1회차 (11:00)' },
      { row: baseRowRoom2 + 2, session: '2회차 (11:30)' },
      { row: baseRowRoom2 + 3, session: '3회차 (14:00)' },
      { row: baseRowRoom2 + 4, session: '4px (14:30)' }, // note: maintaining mapping of snack hunter sessions
      { row: baseRowRoom2 + 4, session: '4회차 (14:30)' },
      { row: baseRowRoom2 + 5, session: '5회차 (16:30)' },
    ];
    let subTotalNoShow2 = 0, subTotalTotal2 = 0, subTotalReserved2 = 0, subTotalCancelled2 = 0, subTotalWalkIn2 = 0;
    room2Config.forEach(config => {
      const data = getAggregatedData('스낵헌터', !!config.isAuto, config.session, 10);
      fillRow(config.row, data);
      subTotalNoShow2 += data.noShow;
      subTotalTotal2 += data.total;
      subTotalReserved2 += data.reserved;
      subTotalCancelled2 += data.cancelled;
      subTotalWalkIn2 += data.walkIn;
    });

    targetWorksheet.getCell(`E${baseRowRoom2 + 6}`).value = subTotalReserved2;
    targetWorksheet.getCell(`F${baseRowRoom2 + 6}`).value = subTotalCancelled2;
    targetWorksheet.getCell(`G${baseRowRoom2 + 6}`).value = subTotalNoShow2;
    targetWorksheet.getCell(`H${baseRowRoom2 + 6}`).value = subTotalWalkIn2;
    targetWorksheet.getCell(`I${baseRowRoom2 + 6}`).value = subTotalTotal2;

    // Room 3 (다목적실3 - 메디봇)
    const baseRowRoom3 = isWeekend ? 57 : 56;
    let room3Config;
    if (isWeekend) {
      room3Config = [
        { row: baseRowRoom3, isAuto: true },
        { row: baseRowRoom3 + 1, session: '1회차 (11:00)', disabled: true },
        { row: baseRowRoom3 + 2, session: '2회차 (13:30)', disabled: true },
        { row: baseRowRoom3 + 3, session: '3회차 (14:30)' },
        { row: baseRowRoom3 + 4, session: '4회차 (15:30)' },
        { row: baseRowRoom3 + 5, session: '5회차 (16:30)', disabled: true },
      ];
    } else {
      room3Config = [
        { row: baseRowRoom3, isAuto: true },
        { row: baseRowRoom3 + 1, session: '1회차 (11:00)' },
        { row: baseRowRoom3 + 2, session: '2회차 (13:30)' },
        { row: baseRowRoom3 + 3, session: '3회차 (14:30)' },
        { row: baseRowRoom3 + 4, session: '4회차 (15:30)' },
        { row: baseRowRoom3 + 5, session: '5회차 (16:30)' },
      ];
    }

    let subTotalNoShow3 = 0, subTotalTotal3 = 0, subTotalReserved3 = 0, subTotalCancelled3 = 0, subTotalWalkIn3 = 0;
    room3Config.forEach(config => {
      const data = config.disabled 
        ? { total: 0, noShow: 0, reserved: 0, cancelled: 0, walkIn: 0, memo: '' } 
        : getAggregatedData('메디봇', !!config.isAuto, config.session, 4);
      fillRow(config.row, data);
      subTotalNoShow3 += data.noShow;
      subTotalTotal3 += data.total;
      subTotalReserved3 += data.reserved;
      subTotalCancelled3 += data.cancelled;
      subTotalWalkIn3 += data.walkIn;
    });

    targetWorksheet.getCell(`E${baseRowRoom3 + 6}`).value = subTotalReserved3;
    targetWorksheet.getCell(`F${baseRowRoom3 + 6}`).value = subTotalCancelled3;
    targetWorksheet.getCell(`G${baseRowRoom3 + 6}`).value = subTotalNoShow3;
    targetWorksheet.getCell(`H${baseRowRoom3 + 6}`).value = subTotalWalkIn3;
    targetWorksheet.getCell(`I${baseRowRoom3 + 6}`).value = subTotalTotal3;

    toast.info('파일 생성 중...');
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const fileNameDate = mode === 'monthly' ? `${currentDateStr.substring(0, 7).replace(/-/g, '')}_월간` : currentDateStr.replace(/-/g, '');
    saveAs(blob, `${fileNameDate}_교육장_관람인원.xlsx`);
    toast.success('다운로드가 완료되었습니다.');
  } catch (error: any) {
    console.error('Excel Export Error:', error);
    diagnostics.errorMessage = error.message || String(error);
    diagnostics.errorStack = error.stack;
    
    // Trigger the dynamic diagnostic UI
    showDiagnosticsModal(diagnostics);
    
    toast.error(`엑셀 파일 생성 중 오류가 발생했습니다: ${error.message}`);
  }
};
