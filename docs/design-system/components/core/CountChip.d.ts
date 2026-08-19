/**
 * 브리핑 헤더의 카운트 칩(일정·할 일·후속·지연). 숫자는 모노.
 */
export interface CountChipProps {
  label: string;
  count: number | string;
  /** 즉시 조치가 필요한 하나에만 — 화면에 한 개까지 */
  urgent?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function CountChip(props: CountChipProps): JSX.Element;
