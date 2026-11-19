export type FilterCategory = 'URL' | 'PHONE' | 'EMAIL' | 'ADDRESS' | 'PROTECTED_NAME';

const PATTERNS: { category: FilterCategory; pattern: RegExp }[] = [
  { category: 'EMAIL', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  {
    category: 'URL',
    pattern:
      /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|co\.kr|kr|io|me|gg|ly)\b\S*/gi,
  },
  {
    category: 'PHONE',
    pattern:
      /(?:\+?82[-.\s]?)?0?1[016789][-.\s]?\d{3,4}[-.\s]?\d{4}|\b0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}\b/g,
  },
  {
    category: 'ADDRESS',
    pattern:
      /[가-힣]+(?:시|군|구)\s+[가-힣0-9]+(?:로|길)\s?\d+(?:-\d+)?|[가-힣0-9]+[동리]\s?\d+(?:-\d+)?번지|\d+동\s?\d+호/g,
  },
];

const REDACTED = '[삭제됨]';

const namePattern = (name: string) =>
  new RegExp(
    [...name.replace(/\s/g, '')]
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s*'),
    'g',
  );

/** 걸린 부분은 차단된 글에도 남기지 않도록 지운 본문을 함께 돌려줌 */
export function filterContent(body: string, protectedNames: string[]) {
  let redacted = body;
  let category: FilterCategory | null = null;
  const apply = (found: FilterCategory, pattern: RegExp) => {
    const next = redacted.replace(pattern, REDACTED);
    if (next !== redacted) category ??= found;
    redacted = next;
  };
  PATTERNS.forEach((p) => apply(p.category, p.pattern));
  protectedNames
    .filter((name) => name.replace(/\s/g, '').length >= 2)
    .forEach((name) => apply('PROTECTED_NAME', namePattern(name)));
  return { category: category as FilterCategory | null, redacted };
}
