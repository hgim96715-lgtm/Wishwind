import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const TIMEOUT_MS = 20_000;
const MAX_BYTES = 5_000_000;
const MAX_REDIRECTS = 5;
const MIN_TEXT_LENGTH = 200;
/** 한 출처가 토큰을 독점하지 않게 자름. 잘리면 truncated로 보고함 */
export const MAX_SOURCE_CHARS = 120_000;

export type FetchedSource =
  | { ok: true; url: string; text: string; truncated: boolean }
  | { ok: false; url: string; error: string };

const privateRanges = new BlockList();
privateRanges.addSubnet('0.0.0.0', 8, 'ipv4');
privateRanges.addSubnet('10.0.0.0', 8, 'ipv4');
privateRanges.addSubnet('100.64.0.0', 10, 'ipv4');
privateRanges.addSubnet('127.0.0.0', 8, 'ipv4');
privateRanges.addSubnet('169.254.0.0', 16, 'ipv4');
privateRanges.addSubnet('172.16.0.0', 12, 'ipv4');
privateRanges.addSubnet('192.168.0.0', 16, 'ipv4');
privateRanges.addAddress('::1', 'ipv6');
privateRanges.addSubnet('fc00::', 7, 'ipv6');
privateRanges.addSubnet('fe80::', 10, 'ipv6');

async function assertPublicUrl(url: URL) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`지원하지 않는 프로토콜입니다: ${url.protocol}`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true });
  for (const { address, family } of addresses) {
    if (privateRanges.check(address, family === 6 ? 'ipv6' : 'ipv4')) {
      throw new Error('내부 네트워크 주소는 가져올 수 없습니다');
    }
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
};

function decodeEntities(text: string) {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (whole, code: string) => {
      if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? whole;
      const hex = code[1] === 'x' || code[1] === 'X';
      const point = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : whole;
    },
  );
}

export function htmlToText(html: string) {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(
      /<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1\s*>/gi,
      ' ',
    )
    .replace(
      /<\/?(p|div|br|li|ul|ol|tr|table|h[1-6]|article|section|blockquote)\b[^>]*>/gi,
      '\n',
    )
    .replace(/<[^>]+>/g, '');
  return decodeEntities(stripped)
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n[ \n]*/g, '\n')
    .trim();
}

function detectCharset(contentType: string, bytes: Uint8Array) {
  const fromHeader = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  if (fromHeader) return fromHeader;
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 4096));
  return /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8';
}

function decodeBody(contentType: string, bytes: Uint8Array) {
  try {
    return new TextDecoder(detectCharset(contentType, bytes)).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

async function readLimited(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error('문서가 너무 큽니다');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function request(startUrl: string) {
  let current = new URL(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
        'accept-language': 'ko,en;q=0.8,ja;q=0.6',
        'user-agent': 'Mozilla/5.0 (compatible; CaseSourceVerifier/1.0)',
      },
    });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      return response;
    }
    await response.body?.cancel();
    current = new URL(location, current);
  }
  throw new Error('리다이렉트가 너무 많습니다');
}

export async function fetchSource(url: string): Promise<FetchedSource> {
  try {
    const response = await request(url);
    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, url, error: `HTTP ${response.status}` };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!/text\/|xhtml|xml/i.test(contentType)) {
      await response.body?.cancel();
      return { ok: false, url, error: `지원하지 않는 형식: ${contentType}` };
    }
    const body = decodeBody(contentType, await readLimited(response));
    const text = /html|xml/i.test(contentType) ? htmlToText(body) : body.trim();
    if (text.length < MIN_TEXT_LENGTH) {
      return { ok: false, url, error: '본문을 찾지 못했습니다' };
    }
    return {
      ok: true,
      url,
      text: text.slice(0, MAX_SOURCE_CHARS),
      truncated: text.length > MAX_SOURCE_CHARS,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, url, error: message };
  }
}
