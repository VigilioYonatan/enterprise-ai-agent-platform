import { describe, expect, it } from 'vitest';
import { mayDecideApproval } from '@/approvals/domain/policies/approval.policy';

describe('Four eyes approvals', () => {
  const future = new Date(Date.now() + 86_400_000);
  it('rejects self approval', () =>
    expect(mayDecideApproval('owner', 'same', 'same', future, 'pending')).toBe(
      false,
    ));
  it('requires owner or admin', () =>
    expect(mayDecideApproval('editor', 'a', 'b', future, 'pending')).toBe(
      false,
    ));
  it('allows authorized distinct approver', () =>
    expect(mayDecideApproval('admin', 'a', 'b', future, 'pending')).toBe(true));
  it('rejects expired', () =>
    expect(mayDecideApproval('owner', 'a', 'b', new Date(0), 'pending')).toBe(
      false,
    ));
});
