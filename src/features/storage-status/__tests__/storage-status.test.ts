import {
  isLowSpace,
  isStorageFullError,
  LOW_SPACE_BYTES,
  saveFailureBody,
} from '../storage-status';

describe('isLowSpace', () => {
  test('남은 용량이 기준보다 적으면 부족하다', () => {
    expect(isLowSpace(LOW_SPACE_BYTES - 1)).toBe(true);
  });

  test('남은 용량이 기준 이상이면 부족하지 않다', () => {
    expect(isLowSpace(LOW_SPACE_BYTES)).toBe(false);
  });

  test('용량을 모르면(웹 등) 경고하지 않는다', () => {
    expect(isLowSpace(null)).toBe(false);
    expect(isLowSpace(Number.NaN)).toBe(false);
  });
});

describe('isStorageFullError', () => {
  test('SQLite의 디스크 가득 참 오류를 알아본다', () => {
    expect(isStorageFullError(new Error('database or disk is full'))).toBe(true);
    expect(isStorageFullError(new Error('Call to function failed: SQLITE_FULL'))).toBe(true);
  });

  test('다른 오류와 Error가 아닌 값은 아니다', () => {
    expect(isStorageFullError(new Error('database is locked'))).toBe(false);
    expect(isStorageFullError('database or disk is full')).toBe(false);
    expect(isStorageFullError(undefined)).toBe(false);
  });
});

describe('saveFailureBody', () => {
  test('저장 공간 부족이면 원인과 다음 행동을 알린다', () => {
    const body = saveFailureBody(new Error('database or disk is full'));

    expect(body).toContain('저장 공간');
    expect(body).toContain('정리');
  });

  test('그 밖의 오류는 잠시 뒤 다시 하라고 알린다', () => {
    expect(saveFailureBody(new Error('boom'))).toBe(
      '입력한 내용은 그대로예요. 잠시 뒤 다시 해 주세요.',
    );
  });
});
