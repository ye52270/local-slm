/**
 * 작업 과정 공개(tool-use disclosure). 기본 접힘 — 숨기지 않되 묻어둡니다.
 */
export interface AgentTraceStep {
  /** "메일 검색 — 첨부·동의어 확장으로 12건 조회" */
  label: string;
  /** 담당 에이전트 (mail · calendar · file · web · supervisor) */
  agent?: string;
  done?: boolean;
}
export interface AgentTraceProps {
  steps: AgentTraceStep[];
  defaultOpen?: boolean;
}
export function AgentTrace(props: AgentTraceProps): JSX.Element;
