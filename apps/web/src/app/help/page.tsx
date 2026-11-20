import type { Metadata } from "next";
import Link from "next/link";
import { LuHeartHandshake, LuPhone } from "react-icons/lu";
import { ContactCard } from "@/components/help/ContactCard";
import {
  COUNTRY_NAME,
  HELP_CONTACTS,
  HELP_VERIFIED_AT,
  SITUATIONS,
  contactsFor,
  type HelpCountry,
} from "@/lib/help/contacts";

export const metadata: Metadata = {
  title: "도움받는 곳",
  description: "신고·상담 번호를 상황별로 모았습니다. 몰라서 도움을 못 받는 일이 없도록.",
};

const FAQ = [
  {
    q: "확실하지 않아도 신고해도 되나요?",
    a: "괜찮습니다. 학대나 실종이 의심되는 정도라도 알려 주세요. 사실인지 확인하는 일은 경찰과 전문기관이 합니다. 어떻게 해야 할지 모르겠다면 상담 번호로 먼저 물어봐도 됩니다.",
  },
  {
    q: "신고하면 어떻게 되나요?",
    a: "상황에 따라 경찰이나 전문기관이 사실을 확인하고, 필요한 보호나 지원으로 이어 줍니다. 무엇이 진행되는지는 신고한 기관에 물어보면 안내받을 수 있습니다.",
  },
  {
    q: "누가 신고했는지 알려지나요?",
    a: "신고한 사람의 정보를 보호하는 제도가 있습니다. 걱정된다면 신고하면서 기관에 물어보면 자세히 안내받을 수 있습니다.",
  },
  {
    q: "상담이나 치료를 받는 건 약한 걸까요?",
    a: "아닙니다. 몸이 아프면 병원에 가듯, 마음이 힘들 때 도움을 받는 것은 자신을 지키는 일입니다. 나를 해칠 것 같은 생각이 들거나, 누군가를 해칠까 걱정될 때도 먼저 상담해 주세요. 109는 24시간 이야기를 들어 줍니다.",
  },
];

const ABROAD: HelpCountry[] = ["US", "GB", "JP"];

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
      <Link href="/" className="inline-flex items-center rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted shadow-sm transition-colors hover:bg-white hover:text-foreground">
        홈으로
      </Link>

      <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-subtle">Help</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">도움받는 곳</h1>
      <p className="mt-3 leading-7 text-muted">
        어디에 연락해야 할지 몰라서 도움을 받지 못하는 일이 없도록, 신고·상담 번호를 상황별로 모았습니다. 휴대폰에서는 번호를 누르면
        바로 전화가 걸립니다.
      </p>

      <a
        href="tel:112"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-[#c4473b]/30 bg-[#c4473b]/8 px-5 py-4 hover:bg-[#c4473b]/12"
      >
        <LuPhone aria-hidden className="size-5 shrink-0 text-[#c4473b]" />
        <span>
          <span className="block font-semibold">지금 위험하다면 112</span>
          <span className="block text-sm text-muted">말하기 어려우면 문자 112, 또는 전화 연결 뒤 아무 숫자 버튼을 누릅니다.</span>
        </span>
      </a>

      <section className="mt-6 rounded-2xl bg-[#fbf3d9] px-6 py-6 text-center shadow-[0_1px_3px_rgb(47_44_40/0.08)]">
        <LuHeartHandshake aria-hidden className="mx-auto size-6 text-[#c46a4b]" />
        <p className="mt-3 space-y-1 leading-7 text-foreground [word-break:keep-all] sm:leading-8">
          <span className="block">누군가는 피해자에게도 잘못이 있다고 말합니다.</span>
          <span className="block">하지만 당신은 아무것도 잘못하지 않았습니다.</span>
          <span className="block">도움을 청하는 그 첫걸음을 진심으로 응원합니다.</span>
        </p>
      </section>

      <nav aria-label="상황 바로가기" className="mt-8 flex flex-wrap gap-2">
        {SITUATIONS.map((s) => (
          <a
            key={s.key}
            href={`#${s.key}`}
            className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted hover:text-foreground"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-10">
        {SITUATIONS.map((s) => {
          const list = contactsFor(s.key, "KR");
          if (list.length === 0) return null;
          return (
            <section key={s.key} id={s.key} aria-labelledby={`${s.key}-title`} className="scroll-mt-6">
              <h2 id={`${s.key}-title`} className="text-lg font-semibold">
                {s.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{s.lead}</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {list.map((c) => (
                  // 112는 맨 위 '지금 위험해요'에 자세히 있으므로 다른 묶음에서는 짧게
                  <ContactCard key={c.id} contact={c} compact={c.id === "kr-112" && s.key !== "danger"} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <section aria-labelledby="faq-title" className="mt-12">
        <h2 id="faq-title" className="text-lg font-semibold">
          자주 묻는 것
        </h2>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
          {FAQ.map((f) => (
            <li key={f.q}>
              <details className="group px-5 py-4">
                <summary className="cursor-pointer list-none font-medium">
                  <span className="mr-2 text-subtle group-open:hidden">+</span>
                  <span className="mr-2 hidden text-subtle group-open:inline">−</span>
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-7 text-muted">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="abroad-title" className="mt-12">
        <h2 id="abroad-title" className="text-lg font-semibold">
          해외에 있다면
        </h2>
        <p className="mt-1 text-sm text-muted">사건방에 있는 나라의 번호입니다. 그 나라 안에서 걸 수 있습니다.</p>
        <div className="mt-3 space-y-2">
          {ABROAD.map((country) => {
            const list = HELP_CONTACTS.filter((c) => c.country === country);
            return (
              <details key={country} className="group rounded-xl border border-line bg-surface">
                <summary className="cursor-pointer list-none px-5 py-3 font-medium">
                  {COUNTRY_NAME[country]} <span className="text-sm text-subtle">({list.length}곳)</span>
                  <span className="float-right text-subtle group-open:hidden">↓</span>
                  <span className="float-right hidden text-subtle group-open:inline">↑</span>
                </summary>
                <ul className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
                  {list.map((c) => (
                    <ContactCard key={c.id} contact={c} />
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      <p className="mt-10 text-xs leading-6 text-subtle">
        번호 확인일 {HELP_VERIFIED_AT}. 각 번호 아래 &lsquo;출처 확인&rsquo;에서 공식 자료를 볼 수 있습니다. 운영 시간이나 번호가 바뀌었다면
        문의하기로 알려 주세요.
      </p>
    </main>
  );
}
