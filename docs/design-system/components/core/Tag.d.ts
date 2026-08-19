/**
 * 결과 카드의 우선순위 태그. 두 종류만 존재합니다.
 */
export interface TagProps {
  /** follow = 회신 필요, urgent = 지연 */
  tone?: "follow" | "urgent";
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Tag(props: TagProps): JSX.Element;
