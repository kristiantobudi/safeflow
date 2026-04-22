export interface CreateModuleData {
  title: string;
  description?: string;
}

export interface ModuleCreator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ModuleFile {
  id: string;
  moduleId: string;
  filename: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamSummary {
  id: string;
  moduleId: string;
  duration: number;
  maxAttempts: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSummary {
  id: string;
  examId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamListItem {
  id: string;
  moduleId: string;
  duration: number;
  maxAttempts: number | null;
  createdAt: string;
  updatedAt: string;
  module: {
    id: string;
    title: string;
  };
  creator: {
    firstName: string;
    lastName: string;
  };
  _count: {
    question: number;
  };
}

export interface ModuleListItem {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  creator: ModuleCreator;
  _count: {
    files: number;
    exam: number;
    question: number;
  };
}

export interface ModuleDetail {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  creator: ModuleCreator;
  files: ModuleFile[];
  exam: ExamDetail | null;
  question: QuestionSummary[];
}

export interface ExamCreator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ExamDetail {
  id: string;
  moduleId: string;
  duration: number;
  maxAttempts: number | null;
  createdAt: string;
  updatedAt: string;
  module: {
    id: string;
    title: string;
    description: string | null;
  };
  question: QuestionDetail[];
  creator: ExamCreator;
}

export interface QuestionDetail {
  id: string;
  examId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  imageUrl?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
