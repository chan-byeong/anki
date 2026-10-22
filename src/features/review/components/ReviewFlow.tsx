import { ReviewBar } from '@/features/review/components/ReviewBar';
import { ReviewCard } from '@/features/review/components/ReviewCard';
import { ReviewDone } from '@/features/review/components/ReviewDone';
import type { ReviewScreenInput } from '@/features/review/review-screen-input';
import { useReviewProgress } from '@/features/review/use-review-progress';
import type { Card } from '@/storage/store';

// 대기열이 준비된 뒤의 복습. 카드를 하나씩 평가하고, 카드가 떨어지면 완료 화면을 보인다.
interface ReviewFlowProps extends ReviewScreenInput {
  cards: Card[];
  insetBottom: number;
}

export function ReviewFlow({
  cards,
  insetBottom,
  nextCardAfterRating,
  tomorrowCount,
}: ReviewFlowProps) {
  const { progress, saving, pendingRating, rate } = useReviewProgress(cards, nextCardAfterRating);

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
        // 같은 카드가 재등장해도 새 앞면으로 시작한다. 순서와 남은 수는 주입된 API의 결과만 쓴다.
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
