/**
 * 몰두봇 버튼. 액션은 화면당 primary 하나까지.
 */
export interface ButtonProps {
  /** primary는 그 화면의 주 동작, ok는 승인 전용 */
  variant?: "primary" | "secondary" | "ghost" | "ok";
  size?: "sm" | "md";
  /** Tabler 아이콘 이름 ("send" → ti-send) */
  icon?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Button(props: ButtonProps): JSX.Element;
