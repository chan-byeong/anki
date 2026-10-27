import { isInQueue } from '@/features/review/is-in-queue';
import { scheduleCard } from '@/features/review/schedule-card';
import type { CardWithHistory, Store } from '@/storage/store';

export const FORECAST_DAYS = 7;

/**
 * 오늘부터 7일 동안 날마다 복습할 카드 수.
 * 오늘은 대기열 전체(밀린 카드, 신규 카드, 오늘 다시 볼 카드)로 덱 목록의 숫자와 같다.
 * 내일부터는 복습일이 정확히 그날인 카드 수다(countDueOn과 같은 기준).
 */
export const forecast = (rows: CardWithHistory[], today: number): number[] =>
  Array.from({ length: FORECAST_DAYS }, (_, offset) =>
    offset === 0
      ? rows.filter(({ history }) => isInQueue(history, today)).length
      : rows.filter(({ history }) => scheduleCard(history)?.dueDay === today + offset).length,
  );

/** 살아 있는 모든 덱의 카드로 forecast를 낸다. countQueue와 같은 경로로 읽는다. */
export const readForecast = async (store: Store, today: number): Promise<number[]> => {
  const rows: CardWithHistory[] = [];
  for (const deck of await store.listDecks()) {
    rows.push(...(await store.listCardsWithHistory(deck.id)));
  }
  return forecast(rows, today);
};
