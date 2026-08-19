/**
 * 오브 옆에 붙는 알림 말풍선(OrbNotificationWindow). 알림 창을 따로 띄우지 않고 이것으로 대신합니다.
 * 급한 것만 이유와 함께 알리고, 나머지는 침묵합니다.
 */
export interface NotificationToastProps {
  /** Tabler 아이콘 이름 (WPF: Segoe Fluent 글리프) */
  icon?: string;
  /** 무슨 일인지 한 줄 */
  title: string;
  /** 왜 알리는지 한 줄 */
  message?: string;
  /** 꼬리 방향 — 오브가 어느 쪽에 있는지에 따라 */
  side?: "left" | "right";
  onClick?: () => void;
  onClose?: () => void;
}
export function NotificationToast(props: NotificationToastProps): JSX.Element;
