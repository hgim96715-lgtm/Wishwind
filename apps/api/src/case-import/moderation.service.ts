import type { PrismaClient } from '../generated/prisma/client.js';
import {
  ModerationStage,
  ModerationVerdict,
  UserContentStatus,
} from '../generated/prisma/enums.js';

const select = {
  id: true,
  body: true,
  updatedAt: true,
  moderations: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { category: true, reason: true },
  },
} as const;

export async function listHeld(prisma: PrismaClient) {
  const where = { status: UserContentStatus.HELD };
  const [answers, questions] = await Promise.all([
    prisma.userAnswer.findMany({ where, select, orderBy: { updatedAt: 'asc' } }),
    prisma.userQuestion.findMany({ where, select, orderBy: { updatedAt: 'asc' } }),
  ]);
  const row = (type: string) => (item: (typeof answers)[number]) => ({
    type,
    id: item.id,
    category: item.moderations[0]?.category ?? '-',
    body: item.body,
  });
  return [...answers.map(row('answer')), ...questions.map(row('question'))];
}

export async function moderateContent(
  prisma: PrismaClient,
  action: 'publish' | 'block',
  target: 'answer' | 'question',
  id: string,
) {
  const publish = action === 'publish';
  const data = {
    status: publish ? UserContentStatus.PUBLISHED : UserContentStatus.BLOCKED,
    moderations: {
      create: {
        stage: ModerationStage.ADMIN,
        verdict: publish ? ModerationVerdict.ALLOW : ModerationVerdict.BLOCK,
        category: publish ? 'NONE' : 'ADMIN',
      },
    },
  };
  if (target === 'answer') await prisma.userAnswer.update({ where: { id }, data });
  else await prisma.userQuestion.update({ where: { id }, data });
}
