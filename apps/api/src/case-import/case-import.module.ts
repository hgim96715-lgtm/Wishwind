import { Module } from '@nestjs/common';
import { CaseImportController } from './case-import.controller.js';
import { InboxImportService } from './inbox/inbox-import.service.js';

/** 서버 안에서 도는 사건 가져오기 (inbox 파일·'사건 파일 올리기' API → 비공개 초안). CLI는 cli.ts */
@Module({ controllers: [CaseImportController], providers: [InboxImportService] })
export class CaseImportModule {}
