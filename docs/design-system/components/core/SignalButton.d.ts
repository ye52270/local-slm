/**
 * 입력창 오른쪽 '신호 기둥' 버튼. 0건이면 렌더하지 않습니다(숨김).
 */
export interface SignalButtonProps {
  kind?: "cal" | "mail" | "todo" | "bell" | "timer";
  /** 없으면 뱃지를 그리지 않습니다 */
  count?: number;
  /** 즉시 조치 1건일 때만 빨강 */
  urgent?: boolean;
  title?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function SignalButton(props: SignalButtonProps): JSX.Element;
