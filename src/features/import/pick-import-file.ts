import type { DocumentPickerResult } from 'expo-document-picker';
import { File } from 'expo-file-system';

import { MAX_FILE_BYTES, type ImportFailure } from './read-import-file';

/**
 * 파일을 고른 뒤 바이트까지 읽지 못한 이유.
 * - unsupported-type: .md·.txt·.tsv가 아닌 확장자(엑셀 .xlsx, .csv 등). 직접 읽지 않는다.
 * - open-failed: 고른 파일을 열거나 읽지 못했다.
 * - picker-unavailable: 파일 선택기를 쓸 수 없다. 네이티브 모듈이 들어 있지 않은 빌드다(설치 뒤 개발 빌드를 다시 만들지 않은 경우).
 * - too-large: 읽기 전에 크기만 보고 거른다.
 */
export type FileFailure = ImportFailure | 'unsupported-type' | 'open-failed' | 'picker-unavailable';

export type PickedFile =
  | { kind: 'bytes'; name: string; bytes: Uint8Array }
  | { kind: 'failed'; name: string; failure: FileFailure };

const SUPPORTED_EXTENSIONS = ['md', 'txt', 'tsv'];

// 확장자가 없는 이름(일부 파일 제공자)은 내용으로 판단한다. 있는데 목록에 없을 때만 거른다.
export const hasSupportedExtension = (name: string): boolean => {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return true;
  return SUPPORTED_EXTENSIONS.includes(name.slice(dot + 1).toLowerCase());
};

/** 시스템 파일 선택기를 연다. 고르지 않고 닫으면 null이다. */
export async function pickImportFile(): Promise<PickedFile | null> {
  // 확장자와 MIME 이름이 제공자마다 달라서(.md는 text/markdown, 일부는 octet-stream) 모두 보이게 하고 이름으로 거른다.
  // 네이티브 모듈은 불러오는 순간 없으면 던진다. 화면이 아예 열리지 못하지 않게 여기서 불러서 알린다.
  let picker: typeof import('expo-document-picker');
  try {
    picker = await import('expo-document-picker');
  } catch {
    return { kind: 'failed', name: '선택한 파일', failure: 'picker-unavailable' };
  }
  let result: DocumentPickerResult;
  try {
    result = await picker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  } catch {
    return { kind: 'failed', name: '선택한 파일', failure: 'open-failed' };
  }
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return null;

  const { name, uri } = asset;
  if (!hasSupportedExtension(name)) return { kind: 'failed', name, failure: 'unsupported-type' };
  if ((asset.size ?? 0) > MAX_FILE_BYTES) return { kind: 'failed', name, failure: 'too-large' };
  try {
    return { kind: 'bytes', name, bytes: await new File(uri).bytes() };
  } catch {
    return { kind: 'failed', name, failure: 'open-failed' };
  }
}
