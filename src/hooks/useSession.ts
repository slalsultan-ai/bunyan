'use client';
import { useState, useCallback, useRef } from 'react';
import { Question, AgeGroup, SkillArea, Difficulty } from '@/types';

export type SessionPhase = 'loading' | 'answering' | 'reviewing' | 'completed';

export interface AnswerRecord {
  questionId: string;
  selectedOption: number | null;
  isCorrect: boolean;
  timeSpentMs: number;
}

export function useSession() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const questionStartTime = useRef(Date.now());

  const loadQuestions = useCallback(async (ageGroup: AgeGroup, skillArea: SkillArea, difficulty: Difficulty = 'mixed') => {
    setPhase('loading');
    try {
      const res = await fetch(`/api/questions?age_group=${ageGroup}&skill_area=${skillArea}&difficulty=${difficulty}&count=10`);
      const data = await res.json();
      if (data.questions?.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setAnswers([]);
        setSelectedOption(null);
        questionStartTime.current = Date.now();
        setPhase('answering');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const selectAnswer = useCallback((optionIndex: number) => {
    if (phase !== 'answering') return;
    const q = questions[currentIndex];
    const isCorrect = optionIndex === q.correctOptionIndex;
    const timeSpent = Date.now() - questionStartTime.current;
    setSelectedOption(optionIndex);
    setAnswers(prev => [...prev, {
      questionId: q.id,
      selectedOption: optionIndex,
      isCorrect,
      timeSpentMs: timeSpent,
    }]);
    setPhase('reviewing');
  }, [phase, questions, currentIndex]);

  const nextQuestion = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= questions.length) {
      setPhase('completed');
    } else {
      setCurrentIndex(next);
      setSelectedOption(null);
      questionStartTime.current = Date.now();
      setPhase('answering');
    }
  }, [currentIndex, questions.length]);

  const score = answers.filter(a => a.isCorrect).length;
  const timeTakenMs = Date.now() - sessionStartTime;
  const currentQuestion = questions[currentIndex] || null;
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;

  return {
    questions,
    currentQuestion,
    currentIndex,
    phase,
    answers,
    selectedOption,
    score,
    timeTakenMs,
    progress,
    loadQuestions,
    selectAnswer,
    nextQuestion,
  };
}
