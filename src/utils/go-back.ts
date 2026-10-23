import { router, type Href } from 'expo-router';

/** 이전 화면으로 돌아간다. 돌아갈 곳이 없으면(딥링크로 바로 연 화면) fallback으로 바꿔 끼운다. */
export const goBack = (fallback: Href): void => {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
};
