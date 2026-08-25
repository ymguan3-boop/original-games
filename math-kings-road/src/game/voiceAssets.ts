import { getMonsterDialogue, type MonsterSpeechMood } from "./dialogue";
import { gameAsset } from "./assetPath";

export const STORY_VOICE_ASSETS = [
  gameAsset("/audio/voice/story-page-1.mp3"),
  gameAsset("/audio/voice/story-page-2.mp3"),
  gameAsset("/audio/voice/story-page-3.mp3"),
] as const;

export const ELDER_REQUEST_VOICE_ASSET = gameAsset("/audio/voice/elder-request.mp3");

const stageFileLabel = (stage: number) =>
  String(Math.min(10, Math.max(1, Math.round(stage)))).padStart(2, "0");

export const getMonsterVoiceAsset = (
  stage: number,
  mood: MonsterSpeechMood,
  line: string,
): string => {
  const dialogue = getMonsterDialogue(stage);
  const prefix = gameAsset(`/audio/voice/stage-${stageFileLabel(stage)}`);

  if (mood === "entrance") return `${prefix}-entrance.mp3`;
  if (mood === "defeat") return `${prefix}-defeat.mp3`;

  const lines = mood === "hurt" ? dialogue.hurt : dialogue.attack;
  const lineIndex = Math.max(0, lines.indexOf(line));
  return `${prefix}-${mood}-${lineIndex + 1}.mp3`;
};
