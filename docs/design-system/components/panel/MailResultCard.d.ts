/**
 * mail_list 결과 카드의 한 행. 보낸사람 아바타 + 제목 + 미리보기 + 우선순위 태그.
 * raw 필드는 노출하지 않습니다 — 사람이 읽을 것만.
 */
export interface MailResultCardProps {
  /** 보낸사람 이름. 첫 글자가 아바타가 됩니다 */
  sender: string;
  subject: string;
  /** 본문 앞부분 한 줄 */
  preview?: string;
  /** <Tag> 엘리먼트 */
  tag?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function MailResultCard(props: MailResultCardProps): JSX.Element;
