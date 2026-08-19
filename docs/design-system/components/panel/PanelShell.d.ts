/**
 * 우측 작업물 패널의 껍데기. 보기 + 결정 버튼만 들어가고 대화 입력은 넣지 않습니다.
 */
export interface PanelShellProps {
  title: string;
  /** Tabler 아이콘 이름 */
  icon?: string;
  onClose?: () => void;
  /** 하단 액션 영역 (Button 조합) */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function PanelShell(props: PanelShellProps): JSX.Element;
