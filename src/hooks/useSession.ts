'use client';
import { useState, useCallback, useRef } from 'react';
import { PublicQuestion, AgeGroup, SkillArea, Difficulty } from '@/types';

export type SessionPhase = 'loading' | 'answering' | 'reviewing' | 'completed';

export interface AnswerRecord {
  questionId: string;
  selectedOption: number | null;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface Reveal {
  correctOptionIndex: number;
  explanationAr: string;
  isCorrect: boolean;
}

export function useSession() {
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
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
        setReveal(null);
        questionStartTime.current = Date.now();
        setPhase('answering');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const selectAnswer = useCallback((optionIndex: number, onResult?: (isCorrect: boolean) => void) => {
    if (phase !== 'answering') return;
    const q = questions[currentIndex];
    const timeSpent = Date.now() - questionStartTime.current;

    // Immediate visual feedback — transition to reviewing
    setSelectedOption(optionIndex);
    setReveal(null);
    setPhase('reviewing');

    fetch('/api/questions/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q.id, selectedOption: optionIndex }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Reveal) => {
        setReveal(data);
        setAnswers(prev => [...prev, {
          questionId: q.id,
          selectedOption: optionIndex,
          isCorrect: data.isCorrect,
          timeSpentMs: timeSpent,
        }]);
        onResult?.(data.isCorrect);
      })
      .catch(() => {
        // Network error: record as unanswered and allow continuing
        setAnswers(prev => [...prev, {
          questionId: q.id,
          selectedOption: optionIndex,
          isCorrect: false,
          timeSpentMs: timeSpent,
        }]);
        onResult?.(false);
      });
  }, [phase, questions, currentIndex]);

  const nextQuestion = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= questions.length) {
      setPhase('completed');
    } else {
      setCurrentIndex(next);
      setSelectedOption(null);
      setReveal(null);
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
    reveal,
    score,
    timeTakenMs,
    progress,
    loadQuestions,
    selectAnswer,
    nextQuestion,
  };
}
