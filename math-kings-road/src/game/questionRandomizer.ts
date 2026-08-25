import type { MathQuestion } from "../data/questionBank";

export type ChoiceIndex = 0 | 1 | 2;

type RandomSource = () => number;

const safeRandom = (random: RandomSource): number =>
  Math.min(0.999999999, Math.max(0, random()));

/** Unbiased Fisher–Yates shuffle. A copy is returned so source data stays immutable. */
export const shuffleValues = <Value>(
  values: readonly Value[],
  random: RandomSource = Math.random,
): Value[] => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(safeRandom(random) * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
};

export const createQuestionBag = (
  questionCount: number,
  random: RandomSource = Math.random,
): number[] => shuffleValues(
  Array.from({ length: Math.max(0, questionCount) }, (_, index) => index),
  random,
);

export const drawQuestionIndex = (
  questionCount: number,
  currentBag: readonly number[],
  lastQuestionIndex: number | null,
  random: RandomSource = Math.random,
): { index: number; remainingBag: number[] } => {
  if (questionCount <= 0) throw new Error("Question bank must contain at least one question");

  const bag = currentBag.length > 0
    ? [...currentBag]
    : createQuestionBag(questionCount, random);

  if (bag.length > 1 && bag[0] === lastQuestionIndex) {
    const replacement = bag.findIndex((value) => value !== lastQuestionIndex);
    [bag[0], bag[replacement]] = [bag[replacement], bag[0]];
  }

  return { index: bag[0], remainingBag: bag.slice(1) };
};

/** Each three-question cycle contains A, B, and C exactly once, in random order. */
export const createAnswerSlotBag = (
  random: RandomSource = Math.random,
): ChoiceIndex[] => shuffleValues<ChoiceIndex>([0, 1, 2], random);

export const placeCorrectAnswer = (
  question: MathQuestion,
  correctSlot: ChoiceIndex,
  random: RandomSource = Math.random,
): MathQuestion => {
  const correctOption = question.options[question.correctOptionIndex];
  const wrongOptions = shuffleValues(
    question.options.filter((_, index) => index !== question.correctOptionIndex),
    random,
  );
  const options: [string, string, string] = ["", "", ""];
  let wrongCursor = 0;

  for (let index = 0; index < options.length; index += 1) {
    if (index === correctSlot) {
      options[index] = correctOption;
    } else {
      options[index] = wrongOptions[wrongCursor];
      wrongCursor += 1;
    }
  }

  return { ...question, options, correctOptionIndex: correctSlot };
};
