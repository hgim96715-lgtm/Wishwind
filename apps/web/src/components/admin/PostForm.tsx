import { ActionForm, Button } from "@/components/admin/ActionForm";
import { Field, inputClass } from "@/components/admin/ui";
import { BRIEFING_KIND_LABEL } from "@/lib/admin/labels";
import type { ActionState, AdminCaseRow, BriefingPost } from "@/lib/admin/types";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function PostForm({
  action,
  post,
  cases,
  defaultCaseId,
  submitLabel,
}: {
  action: Action;
  post?: BriefingPost;
  cases: AdminCaseRow[];
  defaultCaseId?: string;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="종류">
          <select name="kind" defaultValue={post?.kind ?? (defaultCaseId ? "CASE_UPDATE" : "NOTICE")} className={inputClass}>
            {Object.entries(BRIEFING_KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="관련 사건 (선택)">
          <select name="caseId" defaultValue={post?.caseId ?? defaultCaseId ?? ""} className={inputClass}>
            <option value="">없음</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.isPublished ? "" : " (비공개)"}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="제목">
        <input name="title" defaultValue={post?.title} required maxLength={200} className={inputClass} />
      </Field>
      <Field label="내용" hint="~습니다 말투로 씁니다. 재판 중 사건은 ‘~한 혐의로 재판 중’처럼 단정하지 않습니다.">
        <textarea name="body" defaultValue={post?.body} required rows={12} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPinned" defaultChecked={post?.isPinned} />
        브리핑룸 맨 위에 고정
      </label>
      <input type="hidden" name="status" value={post?.status ?? "DRAFT"} />
      <Button tone="primary">{submitLabel}</Button>
    </ActionForm>
  );
}
