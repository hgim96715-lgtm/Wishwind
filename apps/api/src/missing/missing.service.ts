import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MissingSource } from '../generated/prisma/enums.js';
import type { ListMissingQuery } from './dto/missing.dto.js';
import { toMissingDetail, toMissingPage, toRegionCounts } from './missing.mapper.js';
import { MissingRepository, missingCursorWhere } from './missing.repository.js';
import { MissingTranslator } from './missing-translator.js';

@Injectable()
export class MissingService {
  constructor(
    private readonly repo: MissingRepository,
    private readonly translator: MissingTranslator,
  ) {}

  /**
   * 카드의 "번역하기": 원문이 바뀌지 않았으면 저장된 번역을 그대로 돌려줌.
   * 동시에 여러 명이 눌러도 결과는 같으므로 잠금 없이 마지막 저장이 이김
   */
  async translation(id: string) {
    const p = await this.repo.findTranslationSource(id);
    if (!p) throw new NotFoundException('실종자 정보를 찾을 수 없습니다');
    if (p.source !== MissingSource.FBI || !p.description) {
      throw new BadRequestException('번역할 원문이 없습니다');
    }
    const hash = createHash('sha256').update(p.description).digest('hex');
    if (p.descriptionKo && p.descriptionKoSourceHash === hash) {
      return { descriptionKo: p.descriptionKo, cached: true };
    }
    const descriptionKo = await this.translator.toKorean(p.description);
    await this.repo.saveTranslation(id, descriptionKo, hash);
    return { descriptionKo, cached: false };
  }

  /** 구간 목록: 지역별 인원 수 */
  async regions() {
    return toRegionCounts(await this.repo.countByRegion());
  }

  /** 구간 안의 실종자: 최근 실종자 순, 키셋 페이지네이션 */
  async list(q: ListMissingQuery) {
    let after = {};
    if (q.cursor) {
      const c = await this.repo.findCursor(q.cursor);
      if (!c) throw new BadRequestException('cursor가 올바르지 않습니다');
      after = missingCursorWhere(c);
    }
    return toMissingPage(await this.repo.findPage(q, after), q.take);
  }

  async findOne(id: string) {
    const p = await this.repo.findActive(id);
    if (!p) throw new NotFoundException('실종자 정보를 찾을 수 없습니다');
    return toMissingDetail(p);
  }
}
