import { Body, Controller, Delete, Get, Headers, HttpCode, Post, Put, Query } from '@nestjs/common';
import { OptionalVoterId } from '../common/decorators/voter-id.decorator.js';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { AccountService } from './account.service.js';
import {
  authorizeQuerySchema,
  loginSchema,
  nicknameSchema,
  activityQuerySchema,
  type AuthorizeQuery,
  type LoginInput,
  type NicknameInput,
  type ActivityQuery,
} from './dto/account.dto.js';

/** Next 서버만 호출함. 세션 토큰은 httpOnly 쿠키에서 꺼내 x-user-session 헤더로 넘김 */
@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('providers')
  providers() {
    return this.account.providers();
  }

  @Get('authorize-url')
  authorizeUrl(@Query(new ZodPipe(authorizeQuerySchema)) query: AuthorizeQuery) {
    return this.account.authorizeUrl(query);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodPipe(loginSchema)) input: LoginInput, @OptionalVoterId() voterId?: string) {
    return this.account.login(input, voterId);
  }

  @Get('me')
  me(@Headers('x-user-session') token?: string) {
    return this.account.me(token);
  }

  @Get('me/activity')
  activity(@Headers('x-user-session') token: string | undefined, @Query(new ZodPipe(activityQuerySchema)) query: ActivityQuery) {
    return this.account.moreActivity(token, query.kind, query.before);
  }

  @Get('profile')
  profile(@Headers('x-user-session') token?: string) {
    return this.account.profile(token);
  }

  @Put('me/nickname')
  setNickname(@Headers('x-user-session') token: string | undefined, @Body(new ZodPipe(nicknameSchema)) input: NicknameInput) {
    return this.account.setNickname(token, input.nickname);
  }

  @Delete('me')
  withdraw(@Headers('x-user-session') token?: string) {
    return this.account.withdraw(token);
  }
}
