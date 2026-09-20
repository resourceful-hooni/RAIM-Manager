import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 인라인된 엑셀 템플릿(base64)을 ArrayBuffer로 디코딩한다.
 * 서비스 워커가 이진 xlsx를 UTF-8로 캐싱해 손상시키는 문제를 피하려고
 * 템플릿을 base64로 번들에 넣어두고 이 함수로 복원한다.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function validatePin(pin: string): { isValid: boolean; error?: string } {
  if (!/^\d+$/.test(pin)) {
    return { isValid: false, error: '비밀번호는 숫자만 입력 가능합니다.' };
  }
  if (pin.length !== 6 && pin.length !== 8) {
    return { isValid: false, error: '비밀번호는 6자리 또는 8자리여야 합니다.' };
  }
  
  // 1. 동일 숫자 반복 (e.g. 111111, 000000)
  if (new Set(pin).size === 1) {
    return { isValid: false, error: '동일한 숫자가 반복되는 취약한 비밀번호는 사용할 수 없습니다.' };
  }

  // 2. 연속된 숫자 (e.g. 123456, 654321, 12345678, 87654321)
  let ascending = true;
  let descending = true;
  for (let i = 1; i < pin.length; i++) {
    const prev = Number(pin[i - 1]);
    const curr = Number(pin[i]);
    if (curr !== prev + 1) ascending = false;
    if (curr !== prev - 1) descending = false;
  }
  if (ascending || descending) {
    return { isValid: false, error: '연속된 숫자로 이루어진 취약한 비밀번호는 사용할 수 없습니다.' };
  }

  // 3. 단순 반복 패턴 (e.g. 121212, 12121212, 123123)
  if (pin === pin.slice(0, 2).repeat(pin.length / 2)) {
    return { isValid: false, error: '단순히 반복되는 패턴(예: 121212)은 사용할 수 없습니다.' };
  }
  if (pin.length === 6 && pin === pin.slice(0, 3).repeat(2)) {
    return { isValid: false, error: '단순히 반복되는 패턴(예: 123123)은 사용할 수 없습니다.' };
  }
  if (pin.length === 8 && pin === pin.slice(0, 4).repeat(2)) {
    return { isValid: false, error: '단순히 반복되는 패턴(예: 12341234)은 사용할 수 없습니다.' };
  }

  // 4. 생년월일/특정 연도 패턴 (예: 19XX, 20XX로 시작하는 연도나 월일 조합)
  if (pin.length === 6) {
    const yearPrefix = pin.slice(0, 2);
    if (yearPrefix === '19' || yearPrefix === '20') {
      const month = Number(pin.slice(2, 4));
      const day = Number(pin.slice(4, 6));
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { isValid: false, error: '생년월일 형식(YYMMDD)의 비밀번호는 사용할 수 없습니다.' };
      }
    }
  }

  return { isValid: true };
}

export function vibrate(pattern: number | number[] = 50) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore if not supported
    }
  }
}
