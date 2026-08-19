/**
 * 상태 오브. 얇은 림 + 검은 LED 패널 안의 21×16 도트 얼굴(Controls/DotMatrixDisplay.cs와 동일한 그리드).
 * 글자로 설명하지 않고 표정으로 알립니다. 신호 우선순위: 사용자 조작 > 대화 상태 > 진행 중 작업 > 알림.
 */
export interface OrbLedProps {
  /**
   * 표정(눈) — idle 평상 · grin 채팅 열림 · look 호버(동공 확장) · wink 답변 완료 ·
   * sleepy 오래 조용할 때 · sorry 유감
   * 신호(스프라이트) — mail 새 메일 · bell 알림 · cal 다가온 일정 · check 완료 ·
   * clock 작업 중(모래시계) · heart 칭찬 · ouch 클릭
   */
  face?: "idle" | "grin" | "look" | "wink" | "sleepy" | "sorry" | "mail" | "bell" | "cal" | "check" | "clock" | "heart" | "ouch";
  /** 무지개 conic 림 + 회전 — '작업 중 / 듣는 중'에만 (EmotionRing thinking 팔레트) */
  busy?: boolean;
  /** 기본 80 (창 슬롯은 88) */
  size?: number;
  title?: string;
  onClick?: () => void;
}
export function OrbLed(props: OrbLedProps): JSX.Element;
