import { ReviewBar } from '@/features/review/components/ReviewBar';
import { ReviewCard } from '@/features/review/components/ReviewCard';
import { ReviewDone } from '@/features/review/components/ReviewDone';
import { useReviewProgress } from '@/features/review/use-review-progress';
import { useTomorrowCount } from '@/features/review/use-tomorrow-count';
import type { Card } from '@/storage/store';

// 대기열이 준비된 뒤의 복습. 카드를 하나씩 평가하고, 카드가 떨어지면 완료 화면을 보인다.
interface ReviewFlowProps {
  deckIds: string[];
  cards: Card[];
  insetBottom: number;
}

export function ReviewFlow({ deckIds, cards, insetBottom }: ReviewFlowProps) {
  const { progress, saving, pendingRating, rate } = useReviewProgress(cards);
  // 복습이 끝났을 때 저장된 이력으로 센다.
  const tomorrowCount = useTomorrowCount(deckIds, !progress.card);

  if (!progress.card) {
    return (
      <ReviewDone
        ratings={progress.ratings}
        tomorrowCount={tomorrowCount}
        insetBottom={insetBottom}
      />
    );
  }

  return (
    <>
      <ReviewBar remaining={progress.remaining} />
      <ReviewCard
        // 같은 카드가 재등장해도 새 앞면으로 시작한다. 순서와 남은 수는 nextCardAfterRating의 결과만 쓴다.
        key={progress.ratings.length}
        card={progress.card}
        insetBottom={insetBottom}
        onRate={rate}
        ratingDisabled={saving}
        pendingRating={pendingRating}
      />
    </>
  );
}
