export interface Obligation {
  party: string;
  clause_reference: string;
  original_text: string;
  summary: string;
  type: 'ongoing' | 'one-off' | 'conditional' | 'recurring';
  deadline: string;
  dependencies: string;
}

export interface Deadline {
  clause_reference: string;
  original_text: string;
  deadline_type: 'notice_period' | 'fixed_date' | 'timeframe';
  value: string;
  converted_date: string;
  explanation: string;
}

export interface TerminationRight {
  type: string;
  notice_period: string;
  method: string;
  clause_reference: string;
  original_text: string;
}

export interface RenewalTermination {
  term_length: string;
  auto_renewal: string;
  renewal_conditions: string;
  termination_rights: TerminationRight[];
}

export interface CalendarEvent {
  event_title: string;
  event_description: string;
  date_or_rule: string;
  related_clause: string;
}

export interface ContractAnalysis {
  parties: string[];
  obligations: Obligation[];
  deadlines: Deadline[];
  renewal_termination: RenewalTermination;
  calendar_feed: CalendarEvent[];
}

export interface AppState {
  step: 'input' | 'processing' | 'results';
  contractText: string;
  partyName: string;
  analysis: ContractAnalysis | null;
  error: string | null;
}
