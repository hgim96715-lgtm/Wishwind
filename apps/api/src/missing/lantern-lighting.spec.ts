import { describe, expect, it, vi } from 'vitest';
import { MissingService } from './missing.service.js';
import type { MissingRepository } from './missing.repository.js';
import type { MissingTranslator } from './missing-translator.js';

describe('missing lantern lighting',()=>{
  it('does not permit lighting an unavailable person',async()=>{
    const repo={findActive:vi.fn().mockResolvedValue(null),light:vi.fn()};
    const service=new MissingService(repo as unknown as MissingRepository,{} as MissingTranslator);
    await expect(service.light('missing','visitor')).rejects.toThrow('실종자 정보를 찾을 수 없습니다');
    expect(repo.light).not.toHaveBeenCalled();
  });
  it('returns the authoritative idempotent count without treating a repeated request as another vote',async()=>{
    const repo={findActive:vi.fn().mockResolvedValue({id:'person'}),light:vi.fn().mockResolvedValue({count:12,lit:true,added:false})};
    const service=new MissingService(repo as unknown as MissingRepository,{} as MissingTranslator);
    expect(await service.light('person','visitor')).toEqual({count:12,lit:true,added:false});
    expect(repo.light).toHaveBeenCalledWith('person','visitor');
  });
  it('allows anonymous read access without inventing a visitor identity',async()=>{
    const repo={findActive:vi.fn().mockResolvedValue({id:'person'}),lightingStats:vi.fn().mockResolvedValue({count:12,lit:false})};
    const service=new MissingService(repo as unknown as MissingRepository,{} as MissingTranslator);
    expect(await service.lighting('person')).toEqual({count:12,lit:false});
    expect(repo.lightingStats).toHaveBeenCalledWith('person',undefined);
  });
});
