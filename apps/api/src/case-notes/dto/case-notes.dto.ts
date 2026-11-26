import { z } from 'zod';

export const answerSchema = z.object({ body: z.string().trim().min(1).max(500) });
export const questionSchema = z.object({ body: z.string().trim().min(5).max(200) });
export const reportSchema = z.object({
  target: z.enum(['answer', 'question']),
  id: z.uuid(),
  reason: z.string().trim().max(200).optional(),
});

export type AnswerInput = z.output<typeof answerSchema>;
export type QuestionInput = z.output<typeof questionSchema>;
export type ReportInput = z.output<typeof reportSchema>;
export type ReportTarget = ReportInput['target'];

export const pollSchema = z.object({ choice: z.number().int().min(0).max(9) });
export type PollInput = z.infer<typeof pollSchema>;
