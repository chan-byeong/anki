// 작업을 들어온 순서대로 하나씩 실행한다(ADR 0010). 앞 작업이 실패해도 뒤 작업은 실행된다.
export type Enqueue = <T>(task: () => Promise<T>) => Promise<T>;

export const createSerialQueue = (): Enqueue => {
  let tail: Promise<unknown> = Promise.resolve();

  return (task) => {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  };
};
