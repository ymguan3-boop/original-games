"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { questionBank, type MathQuestion } from "./data/questionBank";
import { gameAudio } from "./game/audio";
import { gameAsset } from "./game/assetPath";
import { gameBgm } from "./game/bgm";
import { CHAPTER_ONE } from "./game/config";
import { getMonsterDialogue, type MonsterSpeechMood } from "./game/dialogue";
import {
  ELDER_REQUEST_VOICE_ASSET,
  getMonsterVoiceAsset,
  STORY_VOICE_ASSETS,
} from "./game/voiceAssets";
import {
  getItemById,
  getUnlockedItems,
  type EquipmentSlot,
  type ItemEffect,
} from "./game/items";
import {
  createAnswerSlotBag,
  drawQuestionIndex,
  placeCorrectAnswer,
  type ChoiceIndex,
} from "./game/questionRandomizer";

type Phase =
  | "intro"
  | "storybook"
  | "travel"
  | "battle"
  | "advance"
  | "reward"
  | "shop"
  | "gameOver"
  | "chapterComplete";

type CombatFx =
  | "idle"
  | "heroAttack"
  | "enemyHit"
  | "enemyAttack"
  | "heroHit"
  | "guard"
  | "enemyDefeat"
  | "ultimate";

type VoiceProfile = "story" | "monster" | "boss";
type GameDifficulty = "easy" | "normal" | "hard";
type QuestStep = "request" | "difficulty" | "reward";

type StarterReward = {
  difficulty: GameDifficulty;
  charmId: string;
  coins: number;
};

const COMBAT_CALLOUT: Partial<Record<CombatFx, string>> = {
  heroAttack: "算術斬擊！",
  enemyHit: "命中！",
  enemyAttack: "怪物反擊！",
  heroHit: "勇者受傷！",
  guard: "完美防禦！",
  enemyDefeat: "敵人擊破！",
  ultimate: "護符大絕招！",
};

type SaveData = {
  stage: number;
  difficulty: GameDifficulty;
  hp: number;
  coins: number;
  inventory: Record<string, number>;
  equipped: Partial<Record<EquipmentSlot, string>>;
  completed: boolean;
};

const SAVE_KEY = "math-kings-road:v2";
const CHOICE_KEYS = ["A", "B", "C"] as const;
const BASE_ATTACK = 26;
const BASE_MAX_HP = 100;
const DIFFICULTY_CONFIG = {
  easy: {
    label: "簡單",
    grade: 2,
    multiplier: 1,
    startingCoins: 0,
    scene: "數字森林",
    description: "國小二年級・目前森林場景",
  },
  normal: {
    label: "普通",
    grade: 3,
    multiplier: 1.2,
    startingCoins: 100,
    scene: "楓葉秋境",
    description: "國小三年級・秋天場景",
  },
  hard: {
    label: "困難",
    grade: 4,
    multiplier: 1.3,
    startingCoins: 150,
    scene: "古羅馬戰場",
    description: "國小四年級・古羅馬場景",
  },
} as const satisfies Record<GameDifficulty, {
  label: string;
  grade: 2 | 3 | 4;
  multiplier: number;
  startingCoins: number;
  scene: string;
  description: string;
}>;
const STARTER_CHARM_IDS = [
  "egg-yolk-lazy-charm",
  "giant-leek-ultimate-charm",
  "pearl-boba-ultimate-charm",
  "eraser-rescue-charm",
] as const;
const isGameDifficulty = (value: unknown): value is GameDifficulty =>
  value === "easy" || value === "normal" || value === "hard";
const questionsForDifficulty = (difficulty: GameDifficulty) => {
  const grade = DIFFICULTY_CONFIG[difficulty].grade;
  return questionBank.filter((entry) => entry.grade === grade);
};
const scaledEnemyValue = (value: number, difficulty: GameDifficulty) =>
  Math.round(value * DIFFICULTY_CONFIG[difficulty].multiplier);
const MONSTER_ART_BY_STAGE = [
  gameAsset("/monsters/moss-number-slime.webp"),
  gameAsset("/monsters/pinecone-collector.webp"),
  gameAsset("/monsters/nine-cap-mushroom.webp"),
  gameAsset("/monsters/division-beetle.webp"),
  gameAsset("/monsters/ruler-lizard.webp"),
  gameAsset("/monsters/pendulum-bat.webp"),
  gameAsset("/monsters/place-value-golem.webp"),
  gameAsset("/monsters/long-calculation-drake.webp"),
  gameAsset("/monsters/grid-knight.webp"),
  gameAsset("/game-boss.webp"),
] as const;
const MONSTER_ANTICS = ["😜", "😤", "🤪", "😏", "😝", "😵", "🙃", "💨", "🤓", "🔥"] as const;
const EGG_YOLK_ART = gameAsset("/monsters/forest-sprout-yolk-r1-f1.webp");
const STORY_PAGES = [
  {
    image: gameAsset("/storybook/math-adventure-page-1-textless.webp"),
    title: "數字會發光的地方",
    summary: "孩子們用加減乘除，讓小鎮充滿光芒。",
  },
  {
    image: gameAsset("/storybook/math-adventure-page-2-textless.webp"),
    title: "混算大魔王奪走算術水晶",
    summary: "道路裂開，鐘樓也忘了時間。",
  },
  {
    image: gameAsset("/storybook/math-adventure-page-3-textless.webp"),
    title: "答對數學題，打倒怪物",
    summary: "取回算術水晶，拯救數光小鎮。",
  },
] as const;
const ELDER_REQUEST = "村長的委託。見習勇者，請你用數學智慧打敗混算大魔王，取回算術水晶，讓數光小鎮重新發光！";
const PAPER_DOLL_WEAPON_ASSETS: Record<string, string> = {
  "weapon-starter-blade": gameAsset("/paper-doll/v3/doll-weapon-starter.webp"),
  "weapon-cedar-sword": gameAsset("/paper-doll/v3/doll-weapon-cedar.webp"),
  "weapon-firefly-wand": gameAsset("/paper-doll/v3/doll-weapon-firefly.webp"),
  "weapon-giant-leek": gameAsset("/paper-doll/v3/doll-weapon-leek.webp"),
  "weapon-giant-pencil": gameAsset("/paper-doll/v3/doll-weapon-pencil.webp"),
};
const PAPER_DOLL_SHIELD_ASSETS: Record<string, string> = {
  "armor-starter-shield": gameAsset("/paper-doll/v3/doll-shield-starter.webp"),
  "armor-rattan-shield": gameAsset("/paper-doll/v3/doll-shield-rattan.webp"),
  "armor-pot-lid": gameAsset("/paper-doll/v3/doll-shield-pot-lid.webp"),
  "armor-star-hero-shield": gameAsset("/paper-doll/v3/doll-shield-star-hero.webp"),
};
const BATTLE_WEAPON_ASSETS: Record<string, string> = {
  "weapon-starter-blade": gameAsset("/paper-doll/v3/battle-weapon-starter.webp"),
  "weapon-cedar-sword": gameAsset("/paper-doll/v3/battle-weapon-cedar.webp"),
  "weapon-firefly-wand": gameAsset("/paper-doll/v3/battle-weapon-firefly.webp"),
  "weapon-giant-leek": gameAsset("/paper-doll/v3/battle-weapon-leek.webp"),
  "weapon-giant-pencil": gameAsset("/paper-doll/v3/battle-weapon-pencil.webp"),
};
const BATTLE_SHIELD_ASSETS: Record<string, string> = {
  "armor-starter-shield": gameAsset("/paper-doll/v3/battle-shield-starter.webp"),
  "armor-rattan-shield": gameAsset("/paper-doll/v3/battle-shield-rattan.webp"),
  "armor-pot-lid": gameAsset("/paper-doll/v3/battle-shield-pot-lid.webp"),
  "armor-star-hero-shield": gameAsset("/paper-doll/v3/battle-shield-star-hero.webp"),
};
const SHOP_EQUIPMENT_ICON_ASSETS: Record<string, string> = {
  "weapon-starter-blade": gameAsset("/paper-doll/v3/icon-weapon-starter.webp"),
  "weapon-cedar-sword": gameAsset("/paper-doll/v3/icon-weapon-cedar.webp"),
  "weapon-firefly-wand": gameAsset("/paper-doll/v3/icon-weapon-firefly.webp"),
  "weapon-giant-leek": gameAsset("/paper-doll/v3/icon-weapon-leek.webp"),
  "weapon-giant-pencil": gameAsset("/paper-doll/v3/icon-weapon-pencil.webp"),
  "armor-starter-shield": gameAsset("/paper-doll/v3/icon-shield-starter.webp"),
  "armor-rattan-shield": gameAsset("/paper-doll/v3/icon-shield-rattan.webp"),
  "armor-pot-lid": gameAsset("/paper-doll/v3/icon-shield-pot-lid.webp"),
  "armor-star-hero-shield": gameAsset("/paper-doll/v3/icon-shield-star-hero.webp"),
  "charm-egg-yolk": gameAsset("/charms/egg-yolk.webp"),
  "charm-giant-leek": gameAsset("/charms/giant-leek.webp"),
  "charm-pearl-boba": gameAsset("/charms/pearl-boba.webp"),
  "charm-eraser-rescue": gameAsset("/charms/eraser-rescue.webp"),
};
const clampStage = (value: number) => Math.min(10, Math.max(1, Math.round(value)));

const preloadGameImages = (sources: Array<string | undefined>) => {
  for (const source of new Set(sources.filter((entry): entry is string => Boolean(entry)))) {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    void image.decode().catch(() => undefined);
  }
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("easy");
  const [questStep, setQuestStep] = useState<QuestStep>("request");
  const [starterReward, setStarterReward] = useState<StarterReward | null>(null);
  const [stage, setStage] = useState(1);
  const [encounterStage, setEncounterStage] = useState(1);
  const [hp, setHp] = useState(BASE_MAX_HP);
  const [enemyHp, setEnemyHp] = useState<number>(CHAPTER_ONE.levels[0].enemy.maxHp);
  const [coins, setCoins] = useState(0);
  const [inventory, setInventory] = useState<Record<string, number>>({
    "mountain-rice-ball": 1,
  });
  const [equipped, setEquipped] = useState<Partial<Record<EquipmentSlot, string>>>({});
  const [questionCursor, setQuestionCursor] = useState(0);
  const [question, setQuestion] = useState<MathQuestion>(() => questionsForDifficulty("easy")[0] ?? questionBank[0]);
  const [selected, setSelected] = useState<number | null>(null);
  const [removedOption, setRemovedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [combatFx, setCombatFx] = useState<CombatFx>("idle");
  const [impactDamage, setImpactDamage] = useState(0);
  const [attackStreak, setAttackStreak] = useState(0);
  const [damageStreak, setDamageStreak] = useState(0);
  const [ultimateReady, setUltimateReady] = useState(false);
  const [ultimateSource, setUltimateSource] = useState<"attack" | "damage" | null>(null);
  const [bobaShieldCharges, setBobaShieldCharges] = useState(0);
  const [eggYolkMode, setEggYolkMode] = useState(false);
  const [leekDoubleReady, setLeekDoubleReady] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [muted, setMuted] = useState(false);
  const [monsterLine, setMonsterLine] = useState("");
  const [monsterSpeechMood, setMonsterSpeechMood] = useState<MonsterSpeechMood>("entrance");
  const [storyPage, setStoryPage] = useState(0);
  const [storyFinished, setStoryFinished] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const timers = useRef<number[]>([]);
  const monsterUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const activeVoiceAudio = useRef<HTMLAudioElement | null>(null);
  const activeSpeechCleanup = useRef<(() => void) | null>(null);
  const mutedRef = useRef(false);
  const questionBag = useRef<number[]>([]);
  const answerSlotBag = useRef<ChoiceIndex[]>([]);
  const lastQuestionIndex = useRef<number | null>(null);

  const currentLevel = CHAPTER_ONE.levels[stage - 1] ?? CHAPTER_ONE.levels[0];
  const encounterLevel = CHAPTER_ONE.levels[encounterStage - 1] ?? CHAPTER_ONE.levels[0];
  const difficultyInfo = DIFFICULTY_CONFIG[difficulty];
  const encounterEnemyMaxHp = scaledEnemyValue(encounterLevel.enemy.maxHp, difficulty);
  const currentEnemyDamage = scaledEnemyValue(currentLevel.enemy.wrongAnswerDamage, difficulty);
  const monsterDialogue = getMonsterDialogue(encounterStage);
  const equippedCharm = equipped.charm ? getItemById(equipped.charm) : undefined;

  const equipmentEffects = useMemo(
    () =>
      Object.values(equipped)
        .map((id) => (id ? getItemById(id) : undefined))
        .filter(Boolean)
        .flatMap((item) => item?.effects ?? []),
    [equipped],
  );

  const effectAmount = useCallback(
    (type: ItemEffect["type"]) =>
      equipmentEffects.reduce((sum, effect) => {
        if (effect.type !== type || !("amount" in effect)) return sum;
        return sum + effect.amount;
      }, 0),
    [equipmentEffects],
  );

  const playerMaxHp = BASE_MAX_HP + effectAmount("maxHpBonus");
  const attackDamage = BASE_ATTACK + effectAmount("attackBonus");
  const defense = effectAmount("damageReduction");
  const coinMultiplier =
    equipmentEffects.find((effect) => effect.type === "coinBonus")?.multiplier ?? 1;

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const drawNextQuestion = useCallback((targetDifficulty: GameDifficulty = difficulty) => {
    const activeQuestionBank = questionsForDifficulty(targetDifficulty);
    const draw = drawQuestionIndex(
      activeQuestionBank.length,
      questionBag.current,
      lastQuestionIndex.current,
    );
    if (answerSlotBag.current.length === 0) {
      answerSlotBag.current = createAnswerSlotBag();
    }
    const correctSlot = answerSlotBag.current.shift() ?? 0;
    questionBag.current = draw.remainingBag;
    lastQuestionIndex.current = draw.index;
    setQuestion(placeCorrectAnswer(activeQuestionBank[draw.index], correctSlot));
  }, [difficulty]);

  const chooseNaturalVoice = useCallback((voices: SpeechSynthesisVoice[], profile: VoiceProfile) => {
    const chineseVoices = voices.filter((candidate) => candidate.lang.toLowerCase().startsWith("zh"));
    return chineseVoices.sort((left, right) => {
      const score = (candidate: SpeechSynthesisVoice) => {
        const descriptor = `${candidate.name} ${candidate.voiceURI}`;
        const taiwanese = candidate.lang.toLowerCase().startsWith("zh-tw") ? 500 : 0;
        const neural = /natural|neural|online|premium|enhanced/i.test(descriptor) ? 260 : 0;
        const friendly = /hsiaochen|yating|hanhan|mei-jia|meijia|ting-ting|google.*taiwan/i.test(descriptor) ? 150 : 0;
        const warmBoss = profile === "boss" && /yunjhe|yun-jhe|yunxi|male/i.test(descriptor) ? 130 : 0;
        const cuteHero = profile !== "boss" && /hsiaochen|yating|hanhan|mei-jia|meijia/i.test(descriptor) ? 90 : 0;
        return taiwanese + neural + friendly + warmBoss + cuteHero;
      };
      return score(right) - score(left);
    })[0];
  }, []);

  const speakNaturally = useCallback((line: string, profile: VoiceProfile, onFinish?: () => void) => {
    activeSpeechCleanup.current?.();
    gameBgm.setVoiceDucked(true);
    let disposed = false;
    let waitTimer: number | undefined;
    let silentTimer: number | undefined;
    const synth = typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis
      : undefined;
    let voiceListener: (() => void) | undefined;
    let dispose = () => {};

    const clearWaiting = () => {
      if (waitTimer !== undefined) window.clearTimeout(waitTimer);
      if (silentTimer !== undefined) window.clearTimeout(silentTimer);
      if (synth && voiceListener) synth.removeEventListener("voiceschanged", voiceListener);
      waitTimer = undefined;
      silentTimer = undefined;
      voiceListener = undefined;
    };
    const finish = () => {
      if (disposed) return;
      disposed = true;
      clearWaiting();
      monsterUtterance.current = null;
      gameBgm.setVoiceDucked(false);
      if (activeSpeechCleanup.current === dispose) activeSpeechCleanup.current = null;
      onFinish?.();
    };
    dispose = () => {
      if (disposed) return;
      disposed = true;
      clearWaiting();
      if (synth && monsterUtterance.current) synth.cancel();
      monsterUtterance.current = null;
      gameBgm.setVoiceDucked(false);
      if (activeSpeechCleanup.current === dispose) activeSpeechCleanup.current = null;
    };
    activeSpeechCleanup.current = dispose;

    const estimatedDuration = Math.max(2600, Math.min(9000, line.replace(/\s/g, "").length * 185 + 900));
    if (mutedRef.current || !synth) {
      if (onFinish) silentTimer = window.setTimeout(finish, estimatedDuration);
      return dispose;
    }

    synth.cancel();
    const begin = () => {
      if (disposed || !synth) return;
      clearWaiting();
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = "zh-TW";
      utterance.rate = profile === "story" ? 0.98 : profile === "boss" ? 0.97 : 1.05;
      utterance.pitch = profile === "story" ? 1.03 : profile === "boss" ? 0.95 : 1.08;
      utterance.volume = 1;
      const voice = chooseNaturalVoice(synth.getVoices(), profile);
      if (voice) utterance.voice = voice;
      monsterUtterance.current = utterance;
      utterance.addEventListener("end", finish, { once: true });
      utterance.addEventListener("error", finish, { once: true });
      synth.speak(utterance);
    };

    if (synth.getVoices().length > 0) {
      begin();
    } else {
      voiceListener = begin;
      synth.addEventListener("voiceschanged", voiceListener, { once: true });
      waitTimer = window.setTimeout(begin, 1200);
    }
    return dispose;
  }, [chooseNaturalVoice]);

  const playVoiceAsset = useCallback((src: string, line: string, profile: VoiceProfile, onFinish?: () => void) => {
    activeSpeechCleanup.current?.();
    gameBgm.setVoiceDucked(true);
    const audio = new Audio(src);
    activeVoiceAudio.current = audio;
    audio.preload = "auto";
    audio.volume = 1;
    audio.muted = mutedRef.current;
    let disposed = false;
    let fallbackStarted = false;
    let fallbackCleanup: (() => void) | undefined;

    const detach = () => {
      audio.removeEventListener("ended", finish);
      audio.removeEventListener("error", useFallback);
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      detach();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      fallbackCleanup?.();
      gameBgm.setVoiceDucked(false);
      if (activeVoiceAudio.current === audio) activeVoiceAudio.current = null;
      if (activeSpeechCleanup.current === dispose) activeSpeechCleanup.current = null;
    };
    const finish = () => {
      if (disposed) return;
      disposed = true;
      detach();
      gameBgm.setVoiceDucked(false);
      if (activeVoiceAudio.current === audio) activeVoiceAudio.current = null;
      if (activeSpeechCleanup.current === dispose) activeSpeechCleanup.current = null;
      onFinish?.();
    };
    const useFallback = () => {
      if (disposed || fallbackStarted) return;
      fallbackStarted = true;
      detach();
      audio.pause();
      if (activeVoiceAudio.current === audio) activeVoiceAudio.current = null;
      if (activeSpeechCleanup.current === dispose) activeSpeechCleanup.current = null;
      fallbackCleanup = speakNaturally(line, profile, onFinish);
    };

    activeSpeechCleanup.current = dispose;
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", useFallback, { once: true });
    void audio.play().catch(useFallback);
    return dispose;
  }, [speakNaturally]);

  const speakMonster = useCallback((line: string, mood: MonsterSpeechMood, boss = false) => {
    setMonsterLine(line);
    setMonsterSpeechMood(mood);
    playVoiceAsset(getMonsterVoiceAsset(stage, mood, line), line, boss ? "boss" : "monster");
  }, [playVoiceAsset, stage]);

  const speakStory = useCallback((line: string, asset: string, onFinish?: () => void) => (
    playVoiceAsset(asset, line, "story", onFinish)
  ), [playVoiceAsset]);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<SaveData>;
          const savedStage = clampStage(Number(saved.stage ?? 1));
          const savedDifficulty = isGameDifficulty(saved.difficulty) ? saved.difficulty : "normal";
          setDifficulty(savedDifficulty);
          setStage(savedStage);
          setEncounterStage(savedStage);
          setHp(Math.max(1, Number(saved.hp ?? BASE_MAX_HP)));
          setCoins(Math.max(0, Number(saved.coins ?? 0)));
          const savedInventory = saved.inventory ?? { "mountain-rice-ball": 1 };
          setInventory(Object.fromEntries(
            Object.entries(savedInventory).filter(([itemId]) => Boolean(getItemById(itemId))),
          ));
          const savedEquipped = saved.equipped ?? {};
          setEquipped(Object.fromEntries(
            Object.entries(savedEquipped).filter(([slot, itemId]) => {
              const item = typeof itemId === "string" ? getItemById(itemId) : undefined;
              return item?.kind === "equipment" && item.slot === slot;
            }),
          ));
          setEnemyHp(scaledEnemyValue(CHAPTER_ONE.levels[savedStage - 1].enemy.maxHp, savedDifficulty));
          setHasSave(true);
          if (saved.completed) setPhase("chapterComplete");
        }
      } catch {
        window.localStorage.removeItem(SAVE_KEY);
      }
      setHydrated(true);
    }, 0);

    return () => {
      window.clearTimeout(hydrationTimer);
      clearTimers();
      gameAudio.dispose();
      gameBgm.dispose();
      activeSpeechCleanup.current?.();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!hydrated || !hasSave) return;
    const save: SaveData = {
      stage,
      difficulty,
      hp,
      coins,
      inventory,
      equipped,
      completed: phase === "chapterComplete",
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }, [coins, difficulty, equipped, hasSave, hp, hydrated, inventory, phase, stage]);

  useEffect(() => {
    const usesStoryBossTheme = phase === "storybook" || (stage === 10 && phase !== "intro");
    gameBgm.setTheme(usesStoryBossTheme ? "storybookBoss" : "journey");
    const volume = phase === "storybook" ? 0.22 : phase === "battle" || phase === "travel" || phase === "advance" ? 0.2 : 0.15;
    gameBgm.setVolume(volume);
  }, [phase, stage]);

  useEffect(() => {
    if (phase !== "storybook" || storyFinished) return;
    const isFinalPage = storyPage === STORY_PAGES.length - 1;
    const currentStoryPage = STORY_PAGES[storyPage] ?? STORY_PAGES[0];
    const stopNarration = speakStory(`${currentStoryPage.title}。${currentStoryPage.summary}`, STORY_VOICE_ASSETS[storyPage], () => {
      if (isFinalPage) {
        setStoryFinished(true);
      } else {
        setStoryPage((value) => value + 1);
        void gameAudio.play("click");
      }
    });
    return stopNarration;
  }, [phase, speakStory, storyFinished, storyPage]);

  useEffect(() => {
    if (phase !== "storybook" || !storyFinished) return;
    return speakStory(ELDER_REQUEST, ELDER_REQUEST_VOICE_ASSET);
  }, [phase, speakStory, storyFinished]);

  useEffect(() => {
    if (phase !== "travel") return;
    const encounterDelay = currentLevel.isBoss ? 8200 : 3200;
    if (currentLevel.isBoss) {
      gameBgm.setTheme("storybookBoss", true);
      void gameBgm.play();
    }
    void gameAudio.play(currentLevel.isBoss ? "boss" : "click");
    schedule(() => speakMonster(monsterDialogue.entrance, "entrance", currentLevel.isBoss), 0);
    schedule(() => {
      setCombatFx("idle");
      setFeedback("");
      setMonsterLine("");
      setPhase("battle");
    }, encounterDelay);
  }, [currentLevel.isBoss, monsterDialogue.entrance, phase, schedule, speakMonster]);

  const prepareEncounter = useCallback((targetStage: number, targetDifficulty: GameDifficulty = difficulty) => {
    const level = CHAPTER_ONE.levels[targetStage - 1] ?? CHAPTER_ONE.levels[0];
    setEncounterStage(targetStage);
    setEnemyHp(scaledEnemyValue(level.enemy.maxHp, targetDifficulty));
    setQuestionCursor(0);
    setSelected(null);
    setRemovedOption(null);
    setShowHint(false);
    setResolving(false);
    setFeedback("");
    setMonsterLine("");
    setCombatFx("idle");
    setImpactDamage(0);
    setAttackStreak(0);
    setDamageStreak(0);
    setUltimateReady(false);
    setUltimateSource(null);
    setBobaShieldCharges(0);
    setEggYolkMode(false);
    setLeekDoubleReady(false);
    drawNextQuestion(targetDifficulty);
  }, [difficulty, drawNextQuestion]);

  const continueSave = useCallback(() => {
    clearTimers();
    setHasSave(true);
    prepareEncounter(stage, difficulty);
    setPhase("travel");
    gameBgm.setTheme(stage === 10 ? "storybookBoss" : "journey", true);
    void gameBgm.play();
  }, [clearTimers, difficulty, prepareEncounter, stage]);

  const openStorybook = useCallback(() => {
    clearTimers();
    setStoryPage(0);
    setStoryFinished(false);
    setQuestStep("request");
    setStarterReward(null);
    setPhase("storybook");
    setMonsterLine("");
    void gameAudio.play("click");
    gameBgm.setTheme("storybookBoss", true);
    void gameBgm.play();
  }, [clearTimers]);

  const restartGame = useCallback(() => {
    if (!window.confirm("確定要清除目前進度並重新開始嗎？")) return;
    clearTimers();
    activeSpeechCleanup.current?.();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    window.localStorage.removeItem(SAVE_KEY);
    setDifficulty("easy");
    setQuestStep("request");
    setStarterReward(null);
    setStage(1);
    setEncounterStage(1);
    setHp(BASE_MAX_HP);
    setCoins(0);
    setInventory({ "mountain-rice-ball": 1 });
    setEquipped({});
    setEarnedCoins(0);
    setStoryPage(0);
    setStoryFinished(false);
    setHasSave(false);
    questionBag.current = [];
    answerSlotBag.current = [];
    lastQuestionIndex.current = null;
    prepareEncounter(1, "easy");
    setPhase("intro");
    gameBgm.setTheme("journey", true);
    gameBgm.pause();
    void gameAudio.play("click");
  }, [clearTimers, prepareEncounter]);

  const acceptQuest = useCallback(() => {
    setQuestStep("difficulty");
    setStarterReward(null);
    void gameAudio.play("click");
  }, []);

  const chooseDifficulty = useCallback((selectedDifficulty: GameDifficulty) => {
    clearTimers();
    const selectedInfo = DIFFICULTY_CONFIG[selectedDifficulty];
    const charmId = STARTER_CHARM_IDS[Math.floor(Math.random() * STARTER_CHARM_IDS.length)] ?? STARTER_CHARM_IDS[0];
    const charmItem = getItemById(charmId);
    const reward: StarterReward = {
      difficulty: selectedDifficulty,
      charmId,
      coins: selectedInfo.startingCoins,
    };
    setDifficulty(selectedDifficulty);
    setStage(1);
    setHp(BASE_MAX_HP);
    setCoins(selectedInfo.startingCoins);
    setInventory({ "mountain-rice-ball": 1, [charmId]: 1 });
    setEquipped({ charm: charmId });
    setEarnedCoins(0);
    setHasSave(false);
    questionBag.current = [];
    answerSlotBag.current = [];
    lastQuestionIndex.current = null;
    prepareEncounter(1, selectedDifficulty);
    setStarterReward(reward);
    setQuestStep("reward");
    const coinLine = selectedInfo.startingCoins > 0 ? `，還有 ${selectedInfo.startingCoins} 枚金幣` : "";
    const line = `你選擇了${selectedInfo.label}難度。我送你${charmItem?.name ?? "神祕護符"}${coinLine}。護符能施放強力大絕招，記得優先配戴，充能後馬上使用！`;
    speakNaturally(line, "story");
    void gameAudio.play("buy");
  }, [clearTimers, prepareEncounter, speakNaturally]);

  const beginRewardedQuest = useCallback(() => {
    if (!starterReward) return;
    clearTimers();
    setHasSave(true);
    setPhase("travel");
    void gameAudio.play("click");
    gameBgm.setTheme("journey", true);
    void gameBgm.play();
  }, [clearTimers, starterReward]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    gameAudio.setMuted(next);
    gameBgm.setMuted(next);
    if (activeVoiceAudio.current) activeVoiceAudio.current.muted = next;
    if (next && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (!next) void gameAudio.play("click");
  }, [muted]);

  const loadNextQuestion = useCallback(() => {
    setQuestionCursor((value) => value + 1);
    drawNextQuestion();
    setSelected(null);
    setRemovedOption(null);
    setShowHint(false);
    setResolving(false);
    setFeedback("");
    setMonsterLine("");
    setCombatFx("idle");
  }, [drawNextQuestion]);

  const useUltimate = useCallback(() => {
    const ultimate = equippedCharm?.ultimate;
    if (phase !== "battle" || resolving || !ultimateReady || !ultimate) return;

    setResolving(true);
    setUltimateReady(false);
    setUltimateSource(null);
    setAttackStreak(0);
    setDamageStreak(0);
    setSelected(null);
    setCombatFx("ultimate");
    setFeedback("護符大絕招啟動！");
    void gameAudio.play("ultimate");

    schedule(() => {
      if (ultimate === "egg-yolk-lazy") {
        setEggYolkMode(true);
        setFeedback("森林嫩芽蛋黃哥登場！敵人接下來會偷懶一次。");
        setResolving(false);
        setCombatFx("idle");
        return;
      }

      if (ultimate === "pearl-boba-guard") {
        setBobaShieldCharges(2);
        setFeedback("珍珠泡泡盾展開！接下來兩次答錯會被泡泡擋下。");
        setResolving(false);
        setCombatFx("idle");
        return;
      }

      if (ultimate === "eraser-rescue") {
        const wrongIndex = question.options.findIndex((_, index) => index !== question.correctOptionIndex);
        setRemovedOption(wrongIndex);
        setFeedback("橡皮擦救援！一個錯誤選項被擦掉了。");
        setResolving(false);
        setCombatFx("idle");
        return;
      }

      setLeekDoubleReady(true);
      setFeedback("大蔥嗆辣蓄力完成！下一次答對會連續攻擊兩次。");
      setResolving(false);
      setCombatFx("idle");
    }, 900);
  }, [
    equippedCharm?.ultimate,
    phase,
    question,
    resolving,
    schedule,
    ultimateReady,
  ]);

  const answerQuestion = useCallback(
    (answerIndex: number) => {
      if (phase !== "battle" || resolving || answerIndex === removedOption) return;

      setSelected(answerIndex);
      setResolving(true);

      if (answerIndex === question.correctOptionIndex) {
        const doubleAttack = leekDoubleReady;
        const hitCount = doubleAttack ? 2 : 1;
        const totalDamage = attackDamage * hitCount;
        const finalHitDelay = doubleAttack ? 1450 : 720;
        const nextAttackStreak = attackStreak + 1;
        setAttackStreak(nextAttackStreak >= 3 ? 0 : nextAttackStreak);
        setDamageStreak(0);
        if (nextAttackStreak >= 3) {
          setUltimateReady(true);
          setUltimateSource("attack");
        }
        const nextEnemyHp = Math.max(0, enemyHp - totalDamage);
        if (doubleAttack) setLeekDoubleReady(false);
        setImpactDamage(attackDamage);
        setFeedback(doubleAttack ? "答對了！大蔥嗆辣二連斬開始！" : "答對了！揮出算術斬擊！");
        setCombatFx("heroAttack");
        void gameAudio.play("correct");
        schedule(() => void gameAudio.play("attack"), 80);
        schedule(() => {
          setEnemyHp(Math.max(0, enemyHp - attackDamage));
          setCombatFx("enemyHit");
          setFeedback(doubleAttack ? `第一擊命中！造成 ${attackDamage} 點傷害。` : `命中！造成 ${attackDamage} 點傷害。`);
          void gameAudio.play("hit");
          if (!doubleAttack) {
            speakMonster(
              monsterDialogue.hurt[questionCursor % monsterDialogue.hurt.length],
              "hurt",
              currentLevel.isBoss,
            );
          }
        }, 720);

        if (doubleAttack) {
          schedule(() => {
            setCombatFx("heroAttack");
            setFeedback("大蔥嗆辣連擊・第二斬！");
            void gameAudio.play("attack");
          }, 1010);
          schedule(() => {
            setEnemyHp(nextEnemyHp);
            setCombatFx("enemyHit");
            setFeedback(`二連斬完成！共造成 ${totalDamage} 點傷害。`);
            void gameAudio.play("hit");
            speakMonster(
              monsterDialogue.hurt[questionCursor % monsterDialogue.hurt.length],
              "hurt",
              currentLevel.isBoss,
            );
          }, finalHitDelay);
        }

        if (nextEnemyHp <= 0) {
          const reward = Math.round(currentLevel.firstClearCoinReward * coinMultiplier);
          schedule(() => {
            setEarnedCoins(reward);
            setCoins((value) => value + reward);
            setCombatFx("enemyDefeat");
            setFeedback(`擊敗 ${currentLevel.enemy.name}！`);
            void gameAudio.play("victory");
            speakMonster(monsterDialogue.defeat, "defeat", currentLevel.isBoss);
          }, finalHitDelay + 700);
          schedule(() => {
            setCombatFx("idle");
            setMonsterLine("");
            setPhase("advance");
            void gameAudio.play("step");
          }, finalHitDelay + 1730);
          schedule(() => void gameAudio.play("step"), finalHitDelay + 2100);
          schedule(() => void gameAudio.play("step"), finalHitDelay + 2470);
          schedule(() => void gameAudio.play("step"), finalHitDelay + 2840);
          schedule(() => void gameAudio.play("step"), finalHitDelay + 3210);
          schedule(() => setPhase("reward"), finalHitDelay + 4030);
        } else {
          schedule(loadNextQuestion, finalHitDelay + 780);
        }
        return;
      }

      const featherCount = inventory["owl-feather"] ?? 0;
      const bobaBlocked = bobaShieldCharges > 0;
      const eggBlocked = eggYolkMode;
      const blocked = featherCount > 0 || bobaBlocked || eggBlocked;
      const damage = blocked ? 0 : Math.max(1, currentEnemyDamage - defense);
      const nextHp = Math.max(0, hp - damage);
      const nextDamageStreak = blocked ? 0 : damageStreak + 1;
      setDamageStreak(nextDamageStreak >= 1 ? 0 : nextDamageStreak);
      if (nextDamageStreak >= 1) {
        setUltimateReady(true);
        setUltimateSource("damage");
      }
      setImpactDamage(damage);
      setFeedback("答案不對，怪物發動反擊！");
      setCombatFx("enemyAttack");
      void gameAudio.play("wrong");
      speakMonster(
        monsterDialogue.attack[questionCursor % monsterDialogue.attack.length],
        "attack",
        currentLevel.isBoss,
      );
      schedule(() => void gameAudio.play("enemyAttack"), 80);

      if (blocked) {
        if (featherCount > 0) {
          setInventory((items) => ({ ...items, "owl-feather": featherCount - 1 }));
        }
        if (bobaBlocked) setBobaShieldCharges((value) => Math.max(0, value - 1));
        if (eggBlocked) setEggYolkMode(false);
      }

      schedule(() => {
        if (blocked) {
          setCombatFx("guard");
          setFeedback(
            bobaBlocked
              ? `珍珠泡泡盾擋下攻擊！剩餘 ${Math.max(0, bobaShieldCharges - 1)} 層。`
              : eggBlocked
                ? "蛋黃哥打哈欠，敵人的攻擊落空了！"
                : "護盾羽毛擋下攻擊！",
          );
          void gameAudio.play("guard");
          return;
        }
        setHp(nextHp);
        setCombatFx("heroHit");
        setFeedback(`受到 ${damage} 點傷害。別急，再算一次！`);
        void gameAudio.play("heroHit");
      }, 780);

      schedule(() => {
        if (nextHp <= 0 && !blocked) {
          setPhase("gameOver");
          return;
        }
        loadNextQuestion();
      }, 1780);
    },
    [
      attackDamage,
      attackStreak,
      bobaShieldCharges,
      coinMultiplier,
      currentLevel.enemy.name,
      currentLevel.isBoss,
      currentEnemyDamage,
      currentLevel.firstClearCoinReward,
      defense,
      damageStreak,
      enemyHp,
      eggYolkMode,
      hp,
      inventory,
      leekDoubleReady,
      loadNextQuestion,
      monsterDialogue.attack,
      monsterDialogue.defeat,
      monsterDialogue.hurt,
      phase,
      question.correctOptionIndex,
      questionCursor,
      removedOption,
      resolving,
      schedule,
      speakMonster,
    ],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "m") {
        toggleMute();
        return;
      }
      if (phase !== "battle") return;
      const numberIndex = ["1", "2", "3"].indexOf(event.key);
      const letterIndex = ["a", "b", "c"].indexOf(event.key.toLowerCase());
      const choice = numberIndex >= 0 ? numberIndex : letterIndex;
      if (choice >= 0) answerQuestion(choice);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answerQuestion, phase, toggleMute]);

  const useRiceBall = () => {
    const count = inventory["mountain-rice-ball"] ?? 0;
    if (count <= 0 || hp >= playerMaxHp || resolving) return;
    setInventory((items) => ({ ...items, "mountain-rice-ball": count - 1 }));
    setHp((value) => Math.min(playerMaxHp, value + 30));
    setFeedback("吃下山林飯糰，回復 30 點體力！");
    void gameAudio.play("buy");
  };

  const useFocusCandy = () => {
    const count = inventory["plum-focus-candy"] ?? 0;
    if (count <= 0 || removedOption !== null || resolving) return;
    const wrongIndex = question.options.findIndex((_, index) => index !== question.correctOptionIndex);
    setRemovedOption(wrongIndex);
    setInventory((items) => ({ ...items, "plum-focus-candy": count - 1 }));
    setFeedback("專心糖排除了一個錯誤選項。");
    void gameAudio.play("click");
  };

  const buyOrEquip = (itemId: string) => {
    const item = getItemById(itemId);
    if (!item) return;
    const owned = inventory[item.id] ?? 0;
    const equipItem = (slot: EquipmentSlot) => {
      const nextGear = { ...equipped, [slot]: item.id };
      const nextMaxHp = BASE_MAX_HP + Object.values(nextGear)
        .map((id) => (id ? getItemById(id) : undefined))
        .filter(Boolean)
        .flatMap((gear) => gear?.effects ?? [])
        .reduce((total, effect) => effect.type === "maxHpBonus" ? total + effect.amount : total, 0);
      setEquipped(nextGear);
      setHp((value) => Math.min(value, nextMaxHp));
    };

    if (item.kind === "equipment" && owned > 0 && item.slot) {
      equipItem(item.slot);
      void gameAudio.play("click");
      return;
    }
    if (coins < item.price) return;

    setCoins((value) => value - item.price);
    setInventory((items) => ({ ...items, [item.id]: owned + 1 }));
    if (item.kind === "equipment" && item.slot) {
      equipItem(item.slot);
    }
    void gameAudio.play("buy");
  };

  const continueJourney = () => {
    if (stage >= 10) {
      setPhase("chapterComplete");
      return;
    }
    const nextStage = stage + 1;
    setStage(nextStage);
    setHp((value) => Math.min(playerMaxHp, value + Math.round(playerMaxHp * 0.25)));
    prepareEncounter(nextStage);
    setPhase("travel");
  };

  const retryStage = () => {
    setHp(Math.max(60, Math.round(playerMaxHp * 0.6)));
    prepareEncounter(stage);
    setPhase("travel");
  };

  const unlockedItems = getUnlockedItems(stage);
  const hpPercent = Math.max(0, Math.min(100, (hp / playerMaxHp) * 100));
  const enemyHpPercent = Math.max(0, Math.min(100, (enemyHp / encounterEnemyMaxHp) * 100));
  const isClearedState = phase === "advance" || phase === "reward" || phase === "shop" || phase === "chapterComplete";
  const weapon = equipped.weapon ? getItemById(equipped.weapon) : undefined;
  const armor = equipped.armor ? getItemById(equipped.armor) : undefined;
  const charm = equippedCharm;
  const monsterArt = MONSTER_ART_BY_STAGE[encounterStage - 1] ?? MONSTER_ART_BY_STAGE[0];
  const visibleMonsterArt = eggYolkMode ? EGG_YOLK_ART : monsterArt;
  const story = STORY_PAGES[storyPage] ?? STORY_PAGES[0];
  const weaponArtKey = weapon?.artKey ?? "weapon-starter-blade";
  const armorArtKey = armor?.artKey ?? "armor-starter-shield";
  const paperDollWeapon = PAPER_DOLL_WEAPON_ASSETS[weaponArtKey] ?? PAPER_DOLL_WEAPON_ASSETS["weapon-starter-blade"];
  const paperDollShield = PAPER_DOLL_SHIELD_ASSETS[armorArtKey];
  const battleWeapon = BATTLE_WEAPON_ASSETS[weaponArtKey] ?? BATTLE_WEAPON_ASSETS["weapon-starter-blade"];
  const battleShield = BATTLE_SHIELD_ASSETS[armorArtKey];
  const weaponIconArt = SHOP_EQUIPMENT_ICON_ASSETS[weaponArtKey] ?? SHOP_EQUIPMENT_ICON_ASSETS["weapon-starter-blade"];
  const shieldIconArt = SHOP_EQUIPMENT_ICON_ASSETS[armorArtKey];
  const charmIconArt = charm ? SHOP_EQUIPMENT_ICON_ASSETS[charm.artKey] : undefined;
  const starterCharm = starterReward ? getItemById(starterReward.charmId) : undefined;
  const questElderArt = questStep === "reward"
    ? gameAsset("/npc/elder-charm-v1.webp")
    : questStep === "difficulty"
      ? gameAsset("/npc/elder-welcome-v1.webp")
      : gameAsset("/npc/elder-request-v1.webp");
  const shopItemArt = (artKey: string) => SHOP_EQUIPMENT_ICON_ASSETS[artKey];
  const equipmentBonusSummary = [
    effectAmount("attackBonus") > 0 ? `攻擊力 +${effectAmount("attackBonus")}` : null,
    defense > 0 ? `每次受傷減少 ${defense} 點` : null,
    playerMaxHp > BASE_MAX_HP ? `最大體力 +${playerMaxHp - BASE_MAX_HP}` : null,
    coinMultiplier > 1 ? `過關金幣 +${Math.round((coinMultiplier - 1) * 100)}%` : null,
    charm?.ultimate ? `${charm.name}：${charm.description}` : null,
  ].filter((entry): entry is string => Boolean(entry)).join("；") || "尚無附加能力；購買並穿戴裝備後會顯示於此。";

  useEffect(() => {
    const sources = phase === "intro"
      ? [STORY_PAGES[0].image, gameAsset("/npc/elder-request-v1.webp")]
      : phase === "storybook"
        ? [
            ...STORY_PAGES.slice(storyPage + 1).map((page) => page.image),
            gameAsset("/npc/elder-request-v1.webp"),
            gameAsset("/npc/elder-welcome-v1.webp"),
            gameAsset("/npc/elder-charm-v1.webp"),
          ]
        : [
            visibleMonsterArt,
            MONSTER_ART_BY_STAGE[Math.min(encounterStage, MONSTER_ART_BY_STAGE.length - 1)],
            battleShield,
            battleWeapon,
          ];
    const timer = window.setTimeout(() => preloadGameImages(sources), phase === "intro" ? 0 : 80);
    return () => window.clearTimeout(timer);
  }, [battleShield, battleWeapon, encounterStage, phase, storyPage, visibleMonsterArt]);

  return (
    <main className={`kings-game stage-${stage} phase-${phase} difficulty-${difficulty}`}>
      <aside className="journey-rail" aria-label="冒險進度">
        <div className="rail-brand"><b>數戰勇者</b><span>KING&apos;S MATH PATH</span></div>
        <div className="route-list">
          {CHAPTER_ONE.levels.map((level) => {
            const cleared = level.order < stage || (level.order === stage && isClearedState);
            const current = level.order === stage && !cleared;
            return (
              <div className={`route-step ${cleared ? "cleared" : ""} ${current ? "current" : ""}`} key={level.id}>
                <i>{cleared ? "✓" : level.isBoss ? "♛" : level.order}</i>
                <span><b>{level.name}</b><small>{level.isBoss ? "魔王戰" : `第 ${level.order} 戰`}</small></span>
              </div>
            );
          })}
        </div>
      </aside>

      <section className={`portrait-game fx-${combatFx}`} aria-label="第一人稱數學冒險">
        <header className="game-hud">
          <div className="hero-avatar"><img src={gameAsset("/game-hero-avatar.webp")} alt="見習勇者大頭照" width="320" height="320" decoding="async" fetchPriority="high" /></div>
          <div className="hero-status">
            <div><strong>見習勇者</strong></div>
            <div className="hud-hp"><i style={{ width: `${hpPercent}%` }} /></div>
            <small>HP {hp}/{playerMaxHp}</small>
          </div>
          <div className="hud-stage">
            <span>{currentLevel.isBoss ? "BOSS" : `STAGE ${stage}`}・{difficultyInfo.label}</span>
            <strong>{currentLevel.name}</strong>
          </div>
          <div className="hud-tools">
            <div className="hud-currency"><span>◆</span><strong>{coins}</strong></div>
            <button className="restart-toggle" onClick={restartGame} aria-label="清除進度並重新開始">↻<small>重玩</small></button>
            <button className="sound-toggle" onClick={toggleMute} aria-label={muted ? "開啟音效" : "關閉音效"}>{muted ? "🔇" : "🔊"}</button>
          </div>
        </header>

        <div className="first-person-world">
          <div className="sky-glow" aria-hidden="true" />
          <div className="cloud cloud-a" aria-hidden="true" />
          <div className="cloud cloud-b" aria-hidden="true" />
          <div className="distant-castle" aria-hidden="true"><i /><i /><i /><b /></div>
          <div className="mountain mountain-left" aria-hidden="true" />
          <div className="mountain mountain-right" aria-hidden="true" />
          <div className="tree-wall tree-left" aria-hidden="true" />
          <div className="tree-wall tree-right" aria-hidden="true" />
          <div className="road" aria-hidden="true"><i /><i /><i /><i /><i /></div>

          <div className={`enemy-encounter ${encounterLevel.isBoss ? "boss-encounter" : ""} ${eggYolkMode ? "egg-yolk-encounter" : ""}`}>
            <div className="enemy-nameplate">
              <div><small>{encounterLevel.isBoss ? "森林魔王" : "道路遭遇"}</small><strong>{encounterLevel.enemy.name}</strong></div>
              <span>{enemyHp}/{encounterEnemyMaxHp}</span>
              <div className="enemy-hp"><i style={{ width: `${enemyHpPercent}%` }} /></div>
            </div>
            <div className="enemy-character">
              <img src={visibleMonsterArt} alt={`${encounterLevel.enemy.name}，正面看向玩家`} decoding="async" fetchPriority="high" />
              <span className="monster-antics" aria-hidden="true">{eggYolkMode ? "😪" : MONSTER_ANTICS[encounterStage - 1]}</span>
            </div>
          </div>

          {monsterLine && (
            <div className={`monster-speech speech-${monsterSpeechMood} ${encounterLevel.isBoss ? "boss-speech" : ""}`} role="status">
              <small>{encounterLevel.isBoss ? "魔王宣言" : `${encounterLevel.enemy.name} 說`}</small>
              <p>{monsterLine}</p>
              <i aria-hidden="true">▾</i>
            </div>
          )}

          <div className="slash-arc" aria-hidden="true"><i /><i /><i /></div>
          <div className="enemy-swipe" aria-hidden="true"><i /><i /><i /></div>
          <div className="enemy-impact" aria-hidden="true"><i /><b>−{impactDamage}</b></div>
          <div className="hero-impact" aria-hidden="true"><b>−{impactDamage}</b></div>
          <div className="world-hit" aria-hidden="true" />
          <div className="guard-ring" aria-hidden="true"><b>BLOCK!</b></div>
          {bobaShieldCharges > 0 && <div className="bubble-shield" aria-label={`珍珠泡泡盾剩餘 ${bobaShieldCharges} 層`} />}

          {combatFx === "ultimate" && (
            <div className={`ultimate-overlay ultimate-${equippedCharm?.ultimate ?? "none"}`} aria-live="assertive">
              <div className="ultimate-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              <strong>{equippedCharm?.name ?? "護符大絕招"}</strong>
              <span>ULTIMATE!</span>
            </div>
          )}

          {combatFx !== "idle" && (
            <div className={`combat-callout callout-${combatFx}`} aria-live="assertive">
              <span>{COMBAT_CALLOUT[combatFx]}</span>
              {(combatFx === "enemyHit" || combatFx === "heroHit") && <b>−{impactDamage}</b>}
            </div>
          )}

          <div className="first-person-arms" aria-label={`目前手持 ${weapon?.name ?? "見習木劍"}${paperDollShield ? `，盾牌 ${armor?.name ?? "見習圓盾"}` : ""}`}>
            {battleShield && <div className="shield-hand"><img src={battleShield} alt="" decoding="async" /></div>}
            {battleWeapon && <div className="weapon-hand"><img src={battleWeapon} alt="" decoding="async" /></div>}
          </div>

          {phase === "travel" && (
            <div className="travel-banner" aria-live="polite">
              <span>沿路前進中</span>
              <strong>{currentLevel.isBoss ? "魔王就在王城深處！" : "前方出現新的敵人！"}</strong>
            </div>
          )}

          {stage === 10 && (phase === "travel" || phase === "battle") && (
            <div className="boss-theme-credit" aria-label="魔王主題曲 Heroic Number Quest">♪ Heroic Number Quest</div>
          )}

          {phase === "advance" && (
            <div className="advance-sequence" aria-live="polite">
              <div className="advance-speed-lines" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
              <div className="advance-banner">
                <i>✓</i>
                <span>STAGE {stage} CLEAR</span>
                <strong>道路已打通！</strong>
                <p>勇者正朝下一段旅程前進⋯⋯</p>
                <div><b /><b /><b /></div>
              </div>
            </div>
          )}

          {phase === "battle" && (
            <section className="battle-question" aria-label="數學戰鬥題目">
              <header>
                <div><span>{question.topic}</span><small>小學 {question.grade} 年級</small></div>
              <p>{feedback || "答對即可揮劍攻擊"}</p>
              </header>
              <h1>{question.prompt}</h1>
              <div className="answer-row" role="group" aria-label="答案選項">
                {question.options.map((option, index) => {
                  const correct = selected !== null && index === question.correctOptionIndex;
                  const wrong = selected === index && !correct;
                  const removed = removedOption === index;
                  return (
                    <button
                      className={`${correct ? "correct" : ""} ${wrong ? "wrong" : ""} ${removed ? "removed" : ""}`}
                      key={`${question.id}-${option}`}
                      onClick={() => answerQuestion(index)}
                      disabled={resolving || removed}
                    >
                      <span>{CHOICE_KEYS[index]}</span><b>{removed ? "排除" : option}</b>
                    </button>
                  );
                })}
              </div>
              <footer>
                <button onClick={useRiceBall} disabled={(inventory["mountain-rice-ball"] ?? 0) <= 0 || hp >= playerMaxHp || resolving}>🍙 ×{inventory["mountain-rice-ball"] ?? 0}</button>
                <button onClick={useFocusCandy} disabled={(inventory["plum-focus-candy"] ?? 0) <= 0 || removedOption !== null || resolving}>🔴 ×{inventory["plum-focus-candy"] ?? 0}</button>
                <button className={showHint ? "hint-toggle active" : "hint-toggle"} aria-expanded={showHint} onClick={() => setShowHint((value) => !value)}>{showHint ? "✕ 關閉提示" : "💡 提示"}</button>
                <button className={`ultimate-button ${ultimateReady ? "ready" : ""} ${leekDoubleReady ? "leek-armed" : ""}`} onClick={useUltimate} disabled={leekDoubleReady || !ultimateReady || resolving || !equippedCharm?.ultimate} aria-label={leekDoubleReady ? "大蔥二連擊待命，下一次答對會連續攻擊兩次" : ultimateReady ? `大絕招已充能，來源：${ultimateSource === "attack" ? "累計攻擊三次" : "受到一次攻擊"}` : "大絕招充能中"}>
                  {leekDoubleReady ? "🥬 二連擊待命" : ultimateReady ? `✨ ${equippedCharm?.name ?? "大絕招"}` : `大絕 ${Math.max(0, 3 - attackStreak)}次攻擊`}
                </button>
                <span>🪶 ×{inventory["owl-feather"] ?? 0}</span>
              </footer>
              {showHint && <div className="concept-hint"><span>先找出題目要問什麼，再把數字依照順序列成算式。這題屬於「{question.topic}」。</span><button onClick={() => setShowHint(false)} aria-label="關閉提示">×</button></div>}
            </section>
          )}

          {phase === "intro" && (
            <div className="inside-overlay intro-screen">
              <div className="intro-emblem">＋</div>
              <p>第一人稱數學冒險</p>
              <h1>數戰勇者<br /><em>王者之路</em></h1>
              <div className="intro-loop"><span>沿路探索</span><i>→</i><span>答題戰鬥</span><i>→</i><span>金幣強化</span></div>
              <button className="king-cta" onClick={hasSave ? continueSave : openStorybook}>{hasSave ? `繼續第 ${stage} 戰` : "閱讀故事並出發"}<b>▶</b></button>
              {hasSave && <button className="plain-button" onClick={openStorybook}>從村長的故事重新開始</button>}
              <small>選擇 A／B／C，答對就攻擊</small>
              <div className="intro-credit">製作人 官毅明</div>
            </div>
          )}

          {phase === "storybook" && (
            <div className={`inside-overlay storybook-screen story-page-${storyPage + 1}`}>
              <div className="story-theme-credit" aria-label="繪本與魔王共用主題曲 Star Map Parade">♪ Star Map Parade</div>
              <article className="storybook-book" key={storyPage} aria-label={`數學大冒險繪本第 ${storyPage + 1} 頁`}>
                <div className="story-live-subtitle" role="status" aria-live="polite" aria-atomic="true">
                  <small>語音字幕・第 {storyPage + 1} 頁</small>
                  <strong>{story.title}</strong>
                  <span>{story.summary}</span>
                </div>
                <img className="storybook-page-image" src={story.image} alt={`${story.title}。${story.summary}`} decoding="async" fetchPriority="high" />
                <div className="story-auto-progress" role="status" aria-label="語音朗讀結束後自動翻頁"><i /></div>
                <div className="story-page-dots" aria-label={`自動播放第 ${storyPage + 1} 頁，共 ${STORY_PAGES.length} 頁`}>
                  {STORY_PAGES.map((page, index) => <i className={index === storyPage ? "current" : ""} key={page.title} />)}
                </div>
              </article>
              {storyFinished && (
                <div className="quest-modal-backdrop">
                  <section className={`elder-quest-modal quest-step-${questStep}`} role="dialog" aria-modal="true" aria-labelledby="quest-title">
                    <div className="quest-elder" aria-hidden="true"><img src={questElderArt} alt="" decoding="async" /></div>
                    {questStep === "request" && (
                      <>
                        <div className="quest-copy"><small>VILLAGE QUEST</small><h2 id="quest-title">村長的委託</h2><p>見習勇者，請你用數學智慧打敗混算大魔王，取回算術水晶，讓數光小鎮重新發光！</p></div>
                        <div className="quest-actions">
                          <button className="quest-replay" onClick={() => { setStoryPage(0); setStoryFinished(false); setQuestStep("request"); void gameAudio.play("click"); }}>再聽一次故事</button>
                          <button className="quest-accept" onClick={acceptQuest}>我答應幫忙！ <b>⚔</b></button>
                        </div>
                      </>
                    )}
                    {questStep === "difficulty" && (
                      <>
                        <div className="quest-copy"><small>CHOOSE YOUR PATH</small><h2 id="quest-title">選擇數學難度</h2><p>三條道路各有 50 題專屬題庫。村長會先送你一枚隨機護符，再依難度加贈旅費。</p></div>
                        <div className="difficulty-picker" role="group" aria-label="選擇遊戲難度">
                          <button className="difficulty-card difficulty-card-easy" onClick={() => chooseDifficulty("easy")}>
                            <span>簡單</span><b>國小二年級</b><small>數字森林・怪物維持原能力</small><em>隨機護符 ×1</em>
                          </button>
                          <button className="difficulty-card difficulty-card-normal" onClick={() => chooseDifficulty("normal")}>
                            <span>普通</span><b>國小三年級</b><small>楓葉秋境・怪物能力 ×1.2</small><em>護符 ×1＋100 金幣</em>
                          </button>
                          <button className="difficulty-card difficulty-card-hard" onClick={() => chooseDifficulty("hard")}>
                            <span>困難</span><b>國小四年級</b><small>古羅馬戰場・怪物能力 ×1.3</small><em>護符 ×1＋150 金幣</em>
                          </button>
                        </div>
                        <div className="quest-actions single-action"><button className="quest-replay" onClick={() => setQuestStep("request")}>返回委託內容</button></div>
                      </>
                    )}
                    {questStep === "reward" && starterReward && (
                      <>
                        <div className="quest-copy"><small>ELDER&apos;S GIFT</small><h2 id="quest-title">村長的出發贈禮</h2><p>你選擇了「{DIFFICULTY_CONFIG[starterReward.difficulty].label}」！護符能施放大絕招，請優先配戴；充能完成時別忘了立即使用。</p></div>
                        <div className="starter-gift">
                          <i>{starterCharm && SHOP_EQUIPMENT_ICON_ASSETS[starterCharm.artKey] ? <img src={SHOP_EQUIPMENT_ICON_ASSETS[starterCharm.artKey]} alt="" /> : starterCharm?.icon ?? "◇"}</i>
                          <span><small>已自動配戴</small><b>{starterCharm?.name ?? "神祕護符"}</b><em>{starterCharm?.description}</em></span>
                          <strong>◆ {starterReward.coins}</strong>
                        </div>
                        <div className="quest-actions"><button className="quest-replay" onClick={() => setQuestStep("difficulty")}>重選難度</button><button className="quest-accept" onClick={beginRewardedQuest}>收下贈禮並出發 <b>▶</b></button></div>
                      </>
                    )}
                  </section>
                </div>
              )}
            </div>
          )}

          {phase === "reward" && (
            <div className="inside-overlay reward-screen">
              <div className="victory-rays" aria-hidden="true" />
              <span className="victory-label">ENEMY DEFEATED</span>
              <h2>戰鬥勝利！</h2>
              <img src={monsterArt} alt={`被擊敗的${currentLevel.enemy.name}`} />
              <div className="coin-reward"><i>◆</i><span><small>獲得戰利金</small><strong>＋{earnedCoins}</strong></span></div>
              <p>用擊敗敵人得到的葉幣，購買更強的武器、護甲或冒險道具。</p>
              <div className="reward-actions">
                <button onClick={() => { setPhase("shop"); void gameAudio.play("click"); }}>前往商店</button>
                <button onClick={continueJourney}>{stage >= 10 ? "完成大關" : "繼續前進"}</button>
              </div>
            </div>
          )}

          {phase === "shop" && (
            <div className="inside-overlay shop-screen">
              <header><div><span>ROAD MERCHANT</span><h2>旅途商店</h2></div><b>◆ {coins}</b></header>
              <p>金幣來自擊敗敵人。裝備買下後立即穿戴，也能隨時換回已擁有的裝備。</p>
              <section className="shop-doll-panel" aria-live="polite" aria-label="主角目前穿戴預覽">
                <div className="shop-paper-doll" aria-hidden="true">
                  <div className="doll-aura" />
                  <img className="doll-layer doll-layer-guide" src={gameAsset("/paper-doll/v3/shop-hero-rig-guide.webp")} alt="" decoding="async" />
                  {paperDollWeapon && <img className="doll-layer doll-layer-weapon" src={paperDollWeapon} alt="" decoding="async" />}
                  {paperDollShield && <img className="doll-layer doll-layer-shield" src={paperDollShield} alt="" decoding="async" />}
                  <img className="doll-layer doll-layer-hero" src={gameAsset("/paper-doll/v3/shop-hero-base.webp")} alt="" decoding="async" />
                  {charmIconArt && <img className="doll-charm-waist" src={charmIconArt} alt="" />}
                </div>
                <div className="doll-loadout"><small>即時紙娃娃預覽</small><h3>見習勇者</h3><span><i>右手</i><b>{weapon?.name ?? "新手算術劍"}</b></span><span><i>左手</i><b>{paperDollShield ? armor?.name ?? "見習圓盾" : "目前未裝備盾牌"}</b></span><span><i>腰間</i><b>{charm?.name ?? "目前未配戴護符"}</b></span><p><strong>裝備附加能力總覽</strong>{equipmentBonusSummary}</p></div>
              </section>
              <div className="shop-list">
                {unlockedItems.map((item) => {
                  const owned = inventory[item.id] ?? 0;
                  const equippedNow = item.slot ? equipped[item.slot] === item.id : false;
                  const canAfford = coins >= item.price;
                  return (
                    <article className={equippedNow ? "equipped" : ""} key={item.id}>
                       <i>{shopItemArt(item.artKey) ? <img src={shopItemArt(item.artKey)} alt={`${item.name}紙娃娃素材`} /> : item.icon}</i>
                      <div><small>{item.kind === "equipment" ? "裝備" : "道具"}{owned > 0 ? `・持有 ×${owned}` : ""}</small><h3>{item.name}</h3><p>{item.description}</p></div>
                      <button onClick={() => buyOrEquip(item.id)} disabled={equippedNow || (!canAfford && owned === 0)}>
                        {equippedNow ? "使用中" : item.kind === "equipment" && owned > 0 ? "裝備" : `◆ ${item.price}`}
                      </button>
                    </article>
                  );
                })}
              </div>
              <button className="shop-exit" onClick={continueJourney}>{stage >= 10 ? "完成第一大關" : `整備完成・前往第 ${stage + 1} 戰`}<b>▶</b></button>
            </div>
          )}

          {phase === "gameOver" && (
            <div className="inside-overlay result-screen defeat-screen">
              <span>TRY AGAIN</span><h2>勇者倒下了</h2><p>回到營火補充體力，題目與裝備都會保留。</p>
              <button className="king-cta" onClick={retryStage}>再次挑戰第 {stage} 戰<b>↻</b></button>
              <button className="plain-button" onClick={openStorybook}>從村長的故事重新開始</button>
            </div>
          )}

          {phase === "chapterComplete" && (
            <div className="inside-overlay result-screen complete-screen">
              <span>CHAPTER COMPLETE</span><img className="chapter-elder" src={gameAsset("/npc/elder-celebrate-v1.webp")} alt="村長開心慶祝勇者完成冒險" decoding="async" /><h2>{difficultyInfo.scene}<br />重現光明！</h2>
              <div className="final-stats"><i><b>10</b>戰全勝</i><i><b>{coins}</b>葉幣</i><i><b>{Object.keys(equipped).length}</b>件裝備</i></div>
              <button className="king-cta" onClick={openStorybook}>再聽一次故事並出發<b>↻</b></button>
            </div>
          )}
        </div>
      </section>

      <aside className="equipment-rail" aria-label="目前裝備與戰鬥資訊">
        <div className="rail-title"><span>ADVENTURER</span><h2>勇者裝備</h2></div>
        <div className="equipment-card"><i>{weaponIconArt ? <img src={weaponIconArt} alt="" /> : weapon?.icon ?? "🗡️"}</i><span><small>武器</small><b>{weapon?.name ?? "新手算術劍"}</b><em>攻擊 {attackDamage}</em></span></div>
        <div className="equipment-card"><i>{shieldIconArt ? <img src={shieldIconArt} alt="" /> : "🛡️"}</i><span><small>盾牌</small><b>{paperDollShield ? armor?.name ?? "見習圓盾" : "目前未裝備盾牌"}</b><em>防禦 {defense}</em></span></div>
        <div className="equipment-card"><i>{charmIconArt ? <img src={charmIconArt} alt="" /> : charm?.icon ?? "◇"}</i><span><small>護符</small><b>{charm?.name ?? "尚未裝備"}</b><em>{leekDoubleReady ? "大蔥二連擊待命" : ultimateReady ? "大絕已充能" : `累計攻擊 ${attackStreak}/3・受擊 ${damageStreak}/1`}</em></span></div>
        <div className="how-to-play"><span>戰鬥循環</span><ol><li>沿著道路自動前進</li><li>遇敵後回答三選一題目</li><li>答對攻擊，答錯受傷</li><li>獲得金幣並購買裝備</li></ol></div>
      </aside>
    </main>
  );
}
