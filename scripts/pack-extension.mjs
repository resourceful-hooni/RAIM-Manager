/**
 * 크롬 확장(extension/)을 크롬 웹스토어에 올릴 zip으로 묶는다.
 *
 *   npm run ext:pack              → release/raim-extension-<버전>-store.zip  (manifest의 key 제거)
 *   npm run ext:pack -- --keep-key → release/raim-extension-<버전>-dev.zip    (key 유지, 압축해제 설치용)
 *   npm run ext:pack:site         → public/downloads/raim-extension.zip      (key 유지, 설명서의 '내려받기' 파일)
 *
 * 웹스토어는 처음 올릴 때 확장 ID를 새로 정하므로 key를 빼고 올린다.
 * 게시 후에는 대시보드의 공개 키를 manifest의 key로 바꿔 개발용 ID도 스토어 ID와 같게 맞춘다 (extension/README.md).
 *
 * --site는 `npm run build`가 매번 실행한다. 사이트에서 받는 zip이 늘 지금 extension/ 내용과 같도록
 * 저장소에는 넣지 않고(.gitignore) 빌드할 때 새로 만든다. 직원이 압축해제 설치로 쓰므로 key를 남겨
 * 확장 ID(RAIM_EXTENSION_IDS)가 바뀌지 않게 한다. 파일 이름은 설명서 링크가 바뀌지 않도록 버전을 붙이지 않는다.
 *
 * 묶기 전에 안전 점검을 한다:
 * - localhost 등 개발용 주소가 남아 있으면 멈춘다 (배포본은 raim.kimjihoon.me하고만 통신해야 한다)
 * - manifest와 shared.js의 RAIM 주소가 다르면 멈춘다
 * - downloads 권한, console 출력, data: URL 다운로드가 들어 있으면 멈춘다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

// URL.pathname은 윈도우에서 '/C:/…'가 되어 경로가 깨지므로 fileURLToPath로 바꾼다
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'extension');
const forSite = process.argv.includes('--site');
const keepKey = forSite || process.argv.includes('--keep-key');
const OUT_DIR = path.join(ROOT, forSite ? 'public/downloads' : 'release');

/** zip에 넣지 않는 것: 문서, 스토어 등록용 자료 */
const EXCLUDE = [/^README\.md$/, /^store\//, /(^|\/)\.DS_Store$/];

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const shared = fs.readFileSync(path.join(SRC, 'shared.js'), 'utf8');
const files = walk(SRC)
  .map((full) => path.relative(SRC, full).split(path.sep).join('/'))
  .filter((rel) => !EXCLUDE.some((pattern) => pattern.test(rel)));

// ── 안전 점검 ──
const raimOrigin = (shared.match(/RAIM_ORIGIN:\s*'([^']+)'/) || [])[1];
if (!raimOrigin) fail('shared.js에서 RAIM_ORIGIN을 찾지 못했습니다.');
const connectable = (manifest.externally_connectable && manifest.externally_connectable.matches) || [];
if (connectable.length !== 1 || connectable[0] !== `${raimOrigin}/*`) {
  fail(`manifest의 externally_connectable(${connectable.join(', ')})과 shared.js의 RAIM_ORIGIN(${raimOrigin})이 다릅니다.`);
}
const everything = [JSON.stringify(manifest), ...files.filter((rel) => /\.(js|html)$/.test(rel)).map((rel) => fs.readFileSync(path.join(SRC, rel), 'utf8'))].join('\n');
if (/localhost|127\.0\.0\.1/.test(everything)) fail('개발용 주소(localhost)가 남아 있습니다. README의 로컬 개발 설정을 되돌려 주세요.');
if ((manifest.permissions || []).includes('downloads')) fail('downloads 권한은 넣지 않습니다.');
for (const rel of files.filter((name) => name.endsWith('.js'))) {
  const code = fs.readFileSync(path.join(SRC, rel), 'utf8');
  if (/\bconsole\./.test(code)) fail(`${rel}: console 출력이 있습니다.`);
  if (/['"`]data:[^'"`]*;base64,/.test(code)) fail(`${rel}: data: URL을 만드는 코드가 있습니다.`);
}

// ── 묶기 ──
if (!keepKey) delete manifest.key;
const zip = new JSZip();
for (const rel of files) {
  if (rel === 'manifest.json') {
    zip.file(rel, `${JSON.stringify(manifest, null, 2)}\n`);
  } else {
    zip.file(rel, fs.readFileSync(path.join(SRC, rel)));
  }
}
fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(
  OUT_DIR,
  forSite ? 'raim-extension.zip' : `raim-extension-${manifest.version}-${keepKey ? 'dev' : 'store'}.zip`,
);
fs.writeFileSync(outFile, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));

console.log(`✓ ${path.relative(ROOT, outFile)} (${files.length}개 파일, key ${keepKey ? '유지' : '제거'})`);
