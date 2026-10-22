import { studyDayOf } from '@/utils/study-day';

/** 휴지통 행의 "어제", "3일 전", "2주 전". 시각이 아니라 기기의 달력 날짜 차이로 센다(ADR 0013). */
export const formatDeletedAgo = (deletedAt: number, now: number): string => {
  const days = Math.max(0, studyDayOf(now) - studyDayOf(deletedAt));
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
};
