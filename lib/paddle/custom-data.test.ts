import { describe, expect, it } from 'vitest';
import { isCareerPulseUserId, userIdFromCustomData } from '@/lib/paddle/custom-data';

describe('checkout custom data', () => {
  it('accepts the CareerPulse user UUID only', () => {
    const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    expect(isCareerPulseUserId(id)).toBe(true);
    expect(userIdFromCustomData({ careerPulseUserId: id })).toBe(id);
    expect(userIdFromCustomData({ careerPulseUserId: 'not-a-user' })).toBeNull();
    expect(userIdFromCustomData({ email: 'a@test.com' })).toBeNull();
  });
});
