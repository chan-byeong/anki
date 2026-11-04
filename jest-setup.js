// jest에서 reanimated가 웹 구현으로 돌고, 가짜 타이머로 애니메이션을 진행시킬 수 있게 한다.
require('react-native-reanimated').setUpTests();
// 제스처 핸들러의 네이티브 모듈을 모의한다.
require('react-native-gesture-handler/jestSetup');
// Jest의 worklets는 UI 런타임이 없어서 제스처 핸들러가 UI 런타임에 바인딩을 심으려다 던진다. 심을 필요가 없으니 건너뛴다.
jest.mock(
  'react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings',
  () => ({
    installUIRuntimeBindings: () => {},
  }),
);
// 테스트는 뿌리 뷰(GestureHandlerRootView) 없이 화면만 그린다. 뿌리 안에 있는 것으로 본다.
jest.mock('react-native-gesture-handler/lib/module/GestureHandlerRootViewContext', () => ({
  __esModule: true,
  default: require('react').createContext(true),
}));
