/**
 * public/sheets/출석부양식.xlsx → src/lib/attendanceTemplateBase64.ts 생성기.
 *
 * 출석부 양식을 수정했다면 이 스크립트를 다시 실행한다.
 *   node scripts/generate-attendance-template.mjs
 *
 * 템플릿을 base64로 인라인하는 이유는 exportUtils.ts와 같다.
 * 서비스 워커가 이진 xlsx를 UTF-8로 잘못 캐싱해 손상시키는 문제를 원천 차단하고,
 * 네트워크가 끊긴 현장에서도 출석부를 뽑을 수 있게 하기 위해서다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public', 'sheets', '출석부양식.xlsx');
const target = path.join(root, 'src', 'lib', 'attendanceTemplateBase64.ts');

const bytes = fs.readFileSync(source);
if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
  throw new Error(`템플릿이 xlsx(zip) 파일이 아닙니다: ${source}`);
}

const base64 = bytes.toString('base64');
const banner = `// 이 파일은 scripts/generate-attendance-template.mjs 로 생성됩니다. 직접 수정하지 마세요.
// 원본: public/sheets/출석부양식.xlsx (${bytes.length} bytes)
`;

fs.writeFileSync(
  target,
  `${banner}export const ATTENDANCE_TEMPLATE_BASE64 =\n  '${base64}';\n`,
  'utf8',
);

console.log(`generated ${path.relative(root, target)} (${base64.length} base64 chars)`);
