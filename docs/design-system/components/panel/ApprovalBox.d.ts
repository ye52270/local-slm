/**
 * 승인 게이트. 외부를 바꾸는 모든 동작(발송·등록·저장)은 실행 직전 이 카드를 지납니다.
 */
export interface ApprovalBoxProps {
  /** 실행할 동작 — "메일 발송", "일정 등록", "파일 저장" */
  verb?: string;
  /** 대상 한 줄 요약 (받는 사람 · 제목) */
  target: string;
  /** 본문 미리보기. 있으면 접힌 영역에 표시 */
  preview?: string;
  /** 외부 전송 여부 · 되돌림 가능 여부 */
  meta?: string;
  onApprove?: () => void;
  onReject?: () => void;
}
export function ApprovalBox(props: ApprovalBoxProps): JSX.Element;
