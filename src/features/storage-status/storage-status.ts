// 남은 용량이 이보다 적으면 새 카드와 이미지를 저장하지 못할 수 있다고 미리 알린다.
export const LOW_SPACE_BYTES = 100 * 1024 * 1024;

// 용량을 읽을 수 없는 곳(웹)에서는 null이다.
export const isLowSpace = (availableBytes: number | null): boolean =>
  availableBytes !== null && Number.isFinite(availableBytes) && availableBytes < LOW_SPACE_BYTES;

// expo-sqlite는 SQLite의 메시지를 그대로 Error에 담는다.
export const isStorageFullError = (error: unknown): boolean =>
  error instanceof Error && /disk is full|SQLITE_FULL/i.test(error.message);

// 저장 실패 안내의 본문. 입력한 내용은 화면에 그대로 남아 있으므로 다음 행동만 알린다.
export const saveFailureMessage = (error: unknown): string =>
  isStorageFullError(error)
    ? '기기 저장 공간이 부족해요. 입력한 내용은 그대로 있어요. 공간을 정리한 뒤 다시 저장해 주세요.'
    : '입력한 내용은 그대로예요. 잠시 뒤 다시 해 주세요.';
