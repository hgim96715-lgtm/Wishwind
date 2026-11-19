import { Module } from '@nestjs/common';
import { InboxImportService } from './inbox/inbox-import.service.js';

/** 서버 안에서 도는 사건 가져오기 (예약 작업이 넣은 inbox 파일 → 비공개 초안). CLI는 cli.ts */
@Module({ providers: [InboxImportService] })
export class CaseImportModule {}
