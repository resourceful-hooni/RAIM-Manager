import type { ReservationGroup } from './reservationUtils';

/**
 * 문자 내용(.txt) 만들기.
 *
 * 프로그램마다 시간·장소·안내 문구는 고정이고, 회차의 이용일에 맞춰 날짜만 바뀐다.
 * 예약 시스템의 회차명과 문자 제목의 표기가 달라서('Da Vinci' ↔ '다빈치' 등)
 * 회차명에 든 낱말로 양식을 고른다.
 *
 * [양식 추가·수정]
 * SMS_MESSAGE_TEMPLATES에 프로그램을 추가하거나 고친다. keywords는 공백·기호를 빼고
 * 소문자로 바꾼 회차명에 들어 있는지로 비교하므로, 같은 규칙으로 적는다.
 *
 * 신청자 정보는 다루지 않지만, 출석부 기능 규칙(AGENTS.md 3번)에 맞춰
 * 네트워크 요청·콘솔 출력을 하지 않는다.
 */

export interface SmsMessageTemplate {
  /** 양식 이름 */
  name: string;
  /** 회차명에서 찾을 낱말 */
  keywords: string[];
  /** 문자 제목에 들어가는 프로그램 표기 */
  title: string;
  /** 수업 시간 (고정) */
  time: string;
  /** 수업 장소 (고정) */
  place: string;
}

export const SMS_MESSAGE_TEMPLATES: SmsMessageTemplate[] = [
  { name: '픽셀메이커', keywords: ['픽셀메이커'], title: '픽셀:메이커', time: '10:00-12:00', place: '2층 다목적실1' },
  { name: '레코딩', keywords: ['레코딩', '레고로코딩'], title: '레.코.딩', time: '10:00-12:00', place: '2층 다목적실2' },
  { name: '라임북스', keywords: ['라임북스'], title: '라임북스 : 움직이는 동화책', time: '10:00-12:00', place: '2층 세미나실' },
  {
    name: '아이크리에이터',
    keywords: ['아이크리에이터', 'ai크리에이터'],
    title: 'AI(아이크리에이터)',
    time: '14:00-16:00',
    place: '2층 다목적실1',
  },
  { name: '빈치봇', keywords: ['빈치봇'], title: '빈치봇:비전ON!', time: '14:00-16:00', place: '2층 다목적실2' },
  { name: '다빈치', keywords: ['다빈치', 'davinci'], title: '도와줘 AI, 구해줘 다빈치', time: '14:00-16:00', place: '2층 세미나실' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** "2026-10-18" → "10월 18일(일)" (날짜를 읽을 수 없으면 빈 문자열) */
export const formatMessageDate = (useDate: string): string => {
  const matched = useDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return '';
  const [year, month, day] = matched.slice(1).map(Number);
  // 브라우저 시간대와 상관없이 같은 요일이 나오도록 UTC로 계산한다
  const date = new Date(Date.UTC(year, month - 1, day));
  // 2월 31일처럼 없는 날짜는 다음 달로 넘어가므로 걸러낸다
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${month}월 ${day}일(${WEEKDAYS[date.getUTCDay()]})`;
};

/** 공백·기호를 빼고 소문자로 ("도와줘AI, 구해줘 Da Vinci" → "도와줘ai구해줘davinci") */
const normalizeForMatch = (text: string): string =>
  text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export const findSmsTemplate = (programName: string): SmsMessageTemplate | null => {
  const key = normalizeForMatch(programName);
  if (!key) return null;
  return (
    SMS_MESSAGE_TEMPLATES.find((template) =>
      template.keywords.some((keyword) => key.includes(normalizeForMatch(keyword))),
    ) ?? null
  );
};

/** "10:00~12:00", "9:00-11:00" → "10:00-12:00", "09:00-11:00" (시각이 없으면 빈 문자열) */
const normalizeTimeRange = (text: string): string =>
  (text.match(/\d{1,2}:\d{2}/g) ?? []).map((time) => time.padStart(5, '0')).join('-');

const renderMessage = (template: SmsMessageTemplate, date: string): string =>
  [
    '안녕하세요.',
    `[주말/가족] 라임 위크앤드 / ${template.title} 수업 안내드립니다.`,
    '',
    `날짜 : ${date} ${template.time}`,
    `장소 : 서울로봇인공지능과학관 ${template.place}`,
    '준비물 : 없음',
    '',
    '* 본 수업은 성인 보호자 동반 필수 수업입니다.',
    '* 교육 수업은 전시 관람 명찰 없이 참여하실 수 있습니다. 계단 또는 엘리베이터를 이용해 2층 강의실로 바로 이동해 주세요.',
    '* 원활한 수업 진행을 위해 수업 시작 5분 전까지 도착해 주시기 바랍니다.',
    '',
    '감사합니다.',
    '',
    '문의: 02-920-4320',
  ].join('\n');

export type SmsMessageResult =
  | {
      status: 'ok';
      template: SmsMessageTemplate;
      text: string;
      /** 예약 시간과 양식의 고정 시간이 다르다 (문자에는 양식 시간이 들어간다) */
      timeMismatch: boolean;
    }
  | { status: 'no-template' }
  | { status: 'no-date'; template: SmsMessageTemplate };

/** 회차에 맞는 양식을 찾아 날짜만 바꾼 문자 내용을 만든다 */
export const buildSmsMessage = (
  group: Pick<ReservationGroup, 'programName' | 'useDate' | 'timeRange'>,
): SmsMessageResult => {
  const template = findSmsTemplate(group.programName);
  if (!template) return { status: 'no-template' };

  const date = formatMessageDate(group.useDate);
  if (!date) return { status: 'no-date', template };

  const reservedTime = normalizeTimeRange(group.timeRange);
  return {
    status: 'ok',
    template,
    text: renderMessage(template, date),
    timeMismatch: reservedTime !== '' && reservedTime !== normalizeTimeRange(template.time),
  };
};
