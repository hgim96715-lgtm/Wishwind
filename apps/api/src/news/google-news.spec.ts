import { googleNewsUrl, parseGoogleNewsRss, titleKey } from './google-news.js';

const SAMPLE = `<rss><channel><title>x</title>
<item><title>’15세 소녀 살해’ 피의자 전연인 구속…증거인멸 우려 - 연합뉴스TV</title><link>https://news.google.com/rss/articles/ABC?oc=5</link><guid isPermaLink="false">ABC</guid><pubDate>Wed, 18 Nov 2026 20:38:00 GMT</pubDate><description>&lt;a href="x"&gt;y&lt;/a&gt;</description><source url="https://www.yonhapnewstv.co.kr">연합뉴스TV</source></item>
<item><title>A &amp; B 사건 - 한겨레</title><link>http://insecure</link><source url="x">한겨레</source></item>
</channel></rss>`;

describe('google news rss', () => {
  it('제목·링크·언론사·시각을 뽑고 제목 끝 언론사를 뗌', () => {
    const items = parseGoogleNewsRss(SAMPLE);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      url: 'https://news.google.com/rss/articles/ABC?oc=5',
      title: '’15세 소녀 살해’ 피의자 전연인 구속…증거인멸 우려',
      publisher: '연합뉴스TV',
      publishedAt: new Date('2026-11-18T20:38:00Z'),
    });
  });

  it('검색어에 기간을 붙임', () => {
    expect(googleNewsUrl('실종', 'KR', 2)).toContain(encodeURIComponent('실종 when:2d'));
    expect(googleNewsUrl('murder', 'US')).toContain('ceid=US:en');
  });

  it('같은 제목은 기호가 달라도 같은 키', () => {
    expect(titleKey('[속보] ‘15세 소녀 살해’ 피의자')).toBe(titleKey('15세 소녀 살해 피의자'));
  });
});
