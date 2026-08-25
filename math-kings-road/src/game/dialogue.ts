import monsterDialogueData from "../data/monsterDialogues.json";

export type MonsterSpeechMood = "entrance" | "hurt" | "attack" | "defeat";

export type MonsterDialogue = {
  readonly entrance: string;
  readonly hurt: readonly string[];
  readonly attack: readonly string[];
  readonly defeat: string;
};

export const MONSTER_DIALOGUES = monsterDialogueData satisfies readonly MonsterDialogue[];

export const getMonsterDialogue = (stage: number): MonsterDialogue =>
  MONSTER_DIALOGUES[Math.min(MONSTER_DIALOGUES.length - 1, Math.max(0, stage - 1))];
