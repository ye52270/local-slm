/**
 * 추천 칩(followup). 에이전트가 제안한 다음 행동을 그 자리에서 실행합니다.
 */
export interface ChipProps {
  /** 첫 칩(가장 추천)만 true — 나머지는 중립 */
  accent?: boolean;
  icon?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Chip(props: ChipProps): JSX.Element;
