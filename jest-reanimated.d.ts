// jest-setup.js의 setUpTests()가 등록하는 reanimated 매처의 타입.
// reanimated는 이 선언을 .native.ts 소스에만 두어서 타입 검사가 찾지 못한다(4.7.1).
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAnimatedStyle(
        style: Record<string, unknown>[] | Record<string, unknown>,
        config?: { shouldMatchAllProps?: boolean },
      ): R;
      toHaveAnimatedProps(props: Record<string, unknown>): R;
    }
  }
}

export {};
