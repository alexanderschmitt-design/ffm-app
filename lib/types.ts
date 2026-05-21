export type GameStatus = "draft" | "live" | "finished";

export type Booth = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  created_at: string;
};

export type Game = {
  id: string;
  name: string;
  status: GameStatus;
  current_question_id: string | null;
  reveal_active: boolean;
  booth_id: string;
  created_at: string;
};

export type Question = {
  id: string;
  game_id: string;
  slug: string;
  position: number;
  prompt: string;
  explanation: string | null;
  created_at: string;
};

export type AnswerOption = {
  id: string;
  question_id: string;
  label: string;
  is_correct: boolean;
  position: number;
};

export type Vote = {
  id: string;
  question_id: string;
  option_id: string;
  created_at: string;
};

export type QuestionWithOptions = Question & { options: AnswerOption[] };
