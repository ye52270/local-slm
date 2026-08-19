/**
 * 창을 오브에 끌어다 놓았을 때 뜨는 말풍선(ContextPromptWindow).
 * 무엇을 받았는지 먼저 알려주고, 클릭하면 화면 분석 결과로 이어집니다.
 */
export interface OrbPeekProps {
  /** 끌어온 프로그램 — 실제 앱은 창 아이콘을 쓰고, 없으면 한 글자로 대체합니다 */
  app?: string;
  /** 받은 창의 제목 */
  label: string;
  /** 다음 행동 한 줄. 되지 않는 길은 제안하지 않습니다 */
  action?: string;
  onClick?: () => void;
  onClose?: () => void;
}
export function OrbPeek(props: OrbPeekProps): JSX.Element;
