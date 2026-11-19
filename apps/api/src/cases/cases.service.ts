import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListCasesQuery } from './dto/cases.dto.js';
import { CasesRepository } from './cases.repository.js';
import { toCaseDetail, toCasePage } from './cases.mapper.js';
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
