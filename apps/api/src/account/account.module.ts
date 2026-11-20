import { Module } from '@nestjs/common';
import { CaseNotesModule } from '../case-notes/case-notes.module.js';
import { AccountController } from './account.controller.js';
import { AccountRepository } from './account.repository.js';
import { AccountService } from './account.service.js';
import { OAuthClient } from './oauth.client.js';

@Module({
  // 닉네임도 공개되므로 글 검사(ContentModerator)를 함께 씀
  imports: [CaseNotesModule],
  controllers: [AccountController],
  providers: [AccountService, AccountRepository, OAuthClient],
})
export class AccountModule {}
