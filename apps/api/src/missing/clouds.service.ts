import { HttpException, HttpStatus, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { assertNotBlocked } from '../common/voter/blocked-voter.js';
import { ContentModerator } from '../case-notes/content-moderator.js';
import { UserContentStatus } from '../generated/prisma/enums.js';
import { CloudsRepository } from './clouds.repository.js';
import { filterCloud } from './cloud-filter.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_LIMIT = 5;
const RECENT_LIMIT = 40;
const PENDING_LIMIT = 10;
/** 글 내용이 아니라 검사 장치 문제(키 없음·시간 초과 등)로 보류된 구름 → 나중에 다시 검사해도 됨 */
const RETRYABLE = ['NO_API_KEY', 'TIMEOUT', 'RATE_LIMITED', 'API_ERROR', 'AUTH_ERROR', 'INVALID_RESPONSE'];
const RECHECK_BATCH = 20;
const RECHECK_DELAY_MS = 15_000;
const RECHECK_INTERVAL_MS = 60 * 60 * 1000;
const MODERATION_CONTEXT = {
  title: '실종자 모두에게 남기는 응원 메시지',
  summary: '실종된 분들이 무사히 가족 품으로 돌아오길 바라는 짧은 응원 메시지를 모으는 곳입니다.',
  protectedNames: [] as string[],
};

/**
 * 닉네임도 정원에 공개되므로 메시지와 함께 한 번에 검사함 (AI 호출은 한 번).
 * 검사에 붙인 닉네임 줄은 저장하지 않고, 메시지 본문은 원래대로 저장함
 */
export function moderationText(body: string, nickname?: string | null) {
  return nickname ? `${body}\n\n[닉네임] ${nickname}` : body;
}

/** 정원 전체에 모인 바람개비(응원 메시지) 기준: 햇살 → 집으로 가는 길(등대 점등) */
export const MILESTONES = { sunlight: 10, homePath: 50 } as const;

/**
 * 구름 놓기는 특정 실종자가 아니라 길 위의 모든 분에게 건네는 응원
 * → 한 사람 카드에 글이 쌓여 부담을 주지 않고, 길 전체가 함께 이어짐
 */
@Injectable()
export class CloudsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(CloudsService.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly repo: CloudsRepository,
    private readonly moderator: ContentModerator,
  ) {}

  /** 서버가 켜진 뒤 + 1시간마다 보류된 구름 재검사 (API 키를 나중에 넣은 경우 등) */
  onApplicationBootstrap() {
    const run = () => void this.recheckHeld().catch((e: Error) => this.logger.warn(`구름 재검사 실패: ${e.message}`));
    this.timers.push(setTimeout(run, RECHECK_DELAY_MS), setInterval(run, RECHECK_INTERVAL_MS));
  }

  onApplicationShutdown() {
    for (const t of this.timers) clearTimeout(t);
  }

  /** 검사 장치 문제로 HELD된 구름만 다시 검사. AI가 "애매함"으로 보류한 글은 사람이 확인해야 하므로 제외 */
  async recheckHeld() {
    const held = await this.repo.findHeldIn(RETRYABLE, RECHECK_BATCH);
    let published = 0;
    for (const c of held) {
      const r = await this.moderator.moderate(moderationText(c.body, c.nickname), MODERATION_CONTEXT);
      // 아직도 키가 없거나 오류면 그대로 두고 다음 주기에 다시 시도
      if (r.status === UserContentStatus.HELD && RETRYABLE.includes(r.log.category)) break;
      await this.repo.updateModeration(c.id, r.status, r.log.category);
      if (r.status === UserContentStatus.PUBLISHED) published++;
    }
    if (held.length) this.logger.log(`보류된 구름 재검사: ${held.length}개 중 ${published}개 공개`);
  }

  private count() {
    return this.repo.countPublished();
  }

  /** 공개된 구름 최근 순 + 내가 남겼지만 확인 중인 구름 */
  async list(voterId?: string) {
    const [cloudCount, clouds, pending] = await Promise.all([
      this.count(),
      this.repo.findRecentPublished(RECENT_LIMIT),
      voterId ? this.repo.findMyHeld(voterId, PENDING_LIMIT) : [],
    ]);
    return { cloudCount, milestones: MILESTONES, clouds, pending };
  }

  async place(voterId: string, body: string, position?: { x: number; z: number }, nickname?: string) {
    const filtered = filterCloud(body);
    if (!filtered.ok) {
      return { status: UserContentStatus.BLOCKED, message: filtered.message, cloudCount: await this.count() };
    }

    await assertNotBlocked(this.repo.prisma, voterId);
    const today = await this.repo.countSince(voterId, new Date(Date.now() - DAY_MS));
    if (today >= DAILY_LIMIT) {
      throw new HttpException('오늘은 바람개비를 충분히 꽂아 주셨습니다. 내일 다시 찾아와 주세요.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const result = await this.moderator.moderate(moderationText(body, nickname), MODERATION_CONTEXT);
    if (result.status === UserContentStatus.BLOCKED) {
      return { status: result.status, message: result.message, cloudCount: await this.count() };
    }

    const cloud = await this.repo.create({
      voterId,
      // 검사용으로 붙인 닉네임 줄은 빼고 원래 메시지만 저장 (차단이 아니면 본문은 바뀌지 않음)
      body,
      nickname,
      status: result.status,
      category: result.log.category,
      posX: position?.x,
      posZ: position?.z,
    });
    const published = cloud.status === UserContentStatus.PUBLISHED;
    return {
      status: cloud.status,
      message: published ? '바람개비 하나를 꽂았습니다.' : '확인 후 언덕에 꽂힙니다.',
      cloud,
      cloudCount: await this.count(),
    };
  }
}
