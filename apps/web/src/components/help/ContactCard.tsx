import { LuPhone } from "react-icons/lu";
import type { HelpContact } from "@/lib/help/contacts";

/** 번호 하나. 휴대폰에서는 번호를 누르면 바로 전화가 걸림 */
export function ContactCard({ contact, compact = false }: { contact: HelpContact; compact?: boolean }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <a
          href={`tel:${contact.tel}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#3f8f84]/10 px-2.5 py-1 font-mono text-lg font-bold tabular-nums text-[#2f7469] hover:bg-[#3f8f84]/20"
          aria-label={`${contact.name} ${contact.number}로 전화 걸기`}
        >
          <LuPhone aria-hidden className="size-4" />
          {contact.number}
        </a>
        <span className="font-semibold">{contact.name}</span>
        {contact.hours && <span className="text-xs text-subtle">{contact.hours}</span>}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{contact.what}</p>
      {!compact && contact.channels && (
        <ul className="mt-1.5 space-y-0.5 text-xs leading-5 text-muted">
          {contact.channels.map((ch) => (
            <li key={ch}>· {ch}</li>
          ))}
        </ul>
      )}
      {!compact && (
        <a
          href={contact.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-block text-[11px] text-subtle underline-offset-2 hover:underline"
        >
          출처 확인
        </a>
      )}
    </li>
  );
}
