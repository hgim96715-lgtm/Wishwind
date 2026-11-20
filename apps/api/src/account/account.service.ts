import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentModerator } from '../case-notes/content-moderator.js';
import { AuthProvider, ModerationStage, UserContentStatus } from '../generated/prisma/enums.js';
import type { Env } from '../config/env.js';
import { AccountRepository } from './account.repository.js';
import { accountNickname, toMe } from './account.mapper.js';
import type { AuthorizeQuery, LoginInput, ProviderName } from './dto/account.dto.js';
import { OAuthClient } from './oauth.client.js';
import { issueUserToken, verifyUserToken } from './user-session.js';

const PROVIDER: Record<ProviderName, AuthProvider> = { naver: AuthProvider.NAVER, google: AuthProvider.GOOGLE };
const RELOGIN = '다시 로그인해 주세요.';

/** 무작위 기본 이름('바람 123')과 헷갈리는 닉네임 */
const DEFAULT_NAME = /^바람\s*\d+$/;
const NICKNAME_CONTEXT = {
  title: '사이트 닉네임',
  summary: '사건 기록 사이트에서 다른 사람에게 보이는 닉네임입니다. 욕설·비하·혐오, 실존 인물이나 사건 관련자 이름, 가해자 미화는 쓸 수 없습니다.',
  protectedNames: [] as string[],
};

@Injectable()
export class AccountService {
  constructor(
    private readonly repo: AccountRepository,
    private readonly oauth: OAuthClient,
    private readonly config: ConfigService<Env, true>,
    private readonly moderator: ContentModerator,
  ) {}

  providers() {
    const ready = !!this.config.get('USER_SESSION_SECRET', { infer: true });
    const p = this.oauth.available();
    return { naver: ready && p.naver, google: ready && p.google };
  }

  authorizeUrl({ provider, redirectUri, state }: AuthorizeQuery) {
    this.secret();
    this.assertRedirect(redirectUri, provider);
    return { url: this.oauth.authorizeUrl(provider, redirectUri, state) };
  }

  /**
   * 로그인
   * - 처음 온 계정: 지금 브라우저의 익명 ID를 계정 ID로 삼음 → 그동안의 활동이 그대로 이어짐
   * - 이미 있는 계정: 이 브라우저에서 익명으로 한 활동을 계정 ID로 옮기고, 앞으로는 계정 ID를 씀
   * 다른 계정의 익명 ID(로그아웃 전 쿠키 등)는 절대 옮기지 않음
   */
  async login(input: LoginInput, currentVoterId?: string) {
    const secret = this.secret();
    this.assertRedirect(input.redirectUri, input.provider);
    const provider = PROVIDER[input.provider];
    const providerUserId = await this.oauth.userId(input.provider, input.code, input.state, input.redirectUri);

    const user = await this.repo.prisma.$transaction(async (tx) => {
      const found = await this.repo.findAccount(provider, providerUserId, tx);
      const currentFree = !!currentVoterId && !(await this.repo.voterOwned(currentVoterId, tx));
      if (!found) {
        return this.repo.createUser(tx, currentFree ? currentVoterId! : randomUUID(), provider, providerUserId);
      }
      if (currentFree && currentVoterId !== found.user.voterId) {
        await this.repo.mergeVoter(tx, currentVoterId!, found.user.voterId);
      }
      return found.user;
    });
    await this.repo.touchLogin(user.id);
    return { ...issueUserToken(user.id, secret), voterId: user.voterId };
  }

  async me(token: string | undefined) {
    const user = await this.userFrom(token);
    return toMe(user, await this.repo.activity(user.voterId));
  }

  /** 화면 머리·실종방에 쓰는 가벼운 정보 (닉네임만) */
  async profile(token: string | undefined) {
    const user = await this.userFrom(token);
    return { nickname: accountNickname(user) };
  }

  /**
   * 닉네임 바꾸기 ('○○님의 기록'에서만).
   * 형식(2~10자, 연락처·운영자 사칭 금지)은 DTO가 먼저 막고, 여기서
   * ① 무작위 기본 이름('바람 123') 흉내 금지 ② 다른 사람과 겹치지 않게 ③ AI 글 검사(욕설·비하·실명 등)를 거침
   */
  async setNickname(token: string | undefined, nickname: string) {
    const user = await this.userFrom(token);
    if (nickname === user.nickname) return { nickname, message: '지금 쓰는 닉네임입니다.' };
    if (DEFAULT_NAME.test(nickname)) {
      throw new BadRequestException("'바람 + 숫자'는 기본 이름이라 쓸 수 없습니다.");
    }
    if (await this.repo.nicknameTaken(nickname, user.id)) {
      throw new ConflictException('이미 다른 사람이 쓰는 닉네임입니다.');
    }
    const checked = await this.moderator.moderate(nickname, NICKNAME_CONTEXT);
    if (checked.status !== UserContentStatus.PUBLISHED) {
      const unavailable = checked.log.stage === ModerationStage.FALLBACK;
      throw unavailable
        ? new ServiceUnavailableException('지금은 닉네임을 확인할 수 없습니다. 잠시 뒤 다시 시도해 주세요.')
        : new BadRequestException('쓸 수 없는 닉네임입니다. 다른 닉네임을 정해 주세요.');
    }
    try {
      await this.repo.updateNickname(user.id, nickname);
    } catch (error) {
      // 같은 순간 다른 사람이 먼저 정한 경우 (DB 고유 제약)
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('이미 다른 사람이 쓰는 닉네임입니다.');
      }
      throw error;
    }
    return { nickname, message: '닉네임을 바꿨습니다.' };
  }

  /** 탈퇴: 계정·연결 정보만 지움. 남긴 글은 익명 글로 남음 (지우고 싶으면 각 글에서 지우거나 문의) */
  async withdraw(token: string | undefined) {
    const user = await this.userFrom(token);
    await this.repo.deleteUser(user.id);
    return { ok: true };
  }

  private async userFrom(token: string | undefined) {
    const userId = token ? verifyUserToken(token, this.secret()) : null;
    if (!userId) throw new UnauthorizedException(RELOGIN);
    const user = await this.repo.findUser(userId);
    if (!user) throw new UnauthorizedException(RELOGIN);
    return user;
  }

  private secret() {
    const s = this.config.get('USER_SESSION_SECRET', { infer: true });
    if (!s) throw new ServiceUnavailableException('로그인이 아직 설정되지 않았습니다.');
    return s;
  }

  /** 다른 사이트로 code가 새지 않게, 우리 웹의 콜백 주소만 허용 */
  private assertRedirect(redirectUri: string, provider: ProviderName) {
    const origins = (this.config.get('WEB_ORIGINS', { infer: true }) ?? 'http://localhost:3001')
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    if (!origins.some((o) => redirectUri === `${o}/api/auth/${provider}/callback`)) {
      throw new BadRequestException('허용되지 않은 로그인 주소입니다.');
    }
  }
}
