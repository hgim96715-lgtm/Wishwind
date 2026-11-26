import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListCasesQuery } from './dto/cases.dto.js';
import { CasesRepository } from './cases.repository.js';
import { toCaseDetail, toCaseListItem, toCasePage } from './cases.mapper.js';
import { draftsVisible } from './draft-preview.js';
import { photoCountries } from './public-suspect.js';

@Injectable()
export class CasesService {
  constructor(private readonly repo: CasesRepository) {}

  async list(query: ListCasesQuery) {
    const preview = draftsVisible();
    const rows = await this.repo.findPage(query, preview);
    return toCasePage(rows, query.take, preview);
  }

  async filePicks() {
    const preview = draftsVisible();
    const rows = await this.repo.findFilePicks(preview);
    return { items: rows.map((row) => toCaseListItem(row, preview)) };
  }

  async homeFeatured() {
    const preview = draftsVisible();
    const rows = await this.repo.findHomeFeatured(preview);
    return { items: rows.map((row) => toCaseListItem(row, preview)) };
  }

  /** 인스타 릴스에서 최근 다룬 사건: 릴스를 보고 프로필 링크로 들어온 사람이 홈에서 바로 찾도록 */
  async reelCases() {
    const preview = draftsVisible();
    const rows = await this.repo.findReelCases(preview);
    return { items: rows.map((row) => toCaseListItem(row, preview)) };
  }

  /** 다큐·방송·영화로 다뤄진 사건: 사건방에서 "이 작품의 그 사건"으로 이어 줌 */
  async mediaCases() {
    const preview = draftsVisible();
    const rows = await this.repo.findMediaCases(preview);
    return { items: rows.map((row) => ({ ...toCaseListItem(row, preview), media: row.relatedContents })) };
  }

  /** 사건이 바꾼 것(법·기념일·제도) 모아 보기 */
  async changes() {
    const rows = await this.repo.findChanges(draftsVisible());
    return { items: rows };
  }

  async findBySlug(slug: string) {
    const preview = draftsVisible();
    const found = await this.repo.findVisibleBySlug(slug, preview);
    if (!found) throw new NotFoundException(`사건을 찾을 수 없습니다: ${slug}`);
    return toCaseDetail(found, preview, {
      countries: photoCountries(process.env.SUSPECT_PHOTO_COUNTRIES),
      baseUrl: process.env.SUSPECT_PHOTO_BASE_URL,
    });
  }
}
