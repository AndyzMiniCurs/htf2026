/** Tuning for the sealing battle (design D1): about 8-9 hits plus one summon to win. */
export const BATTLE = {
  maxHealth: 100,
  spellDamage: 8,
  summonDamage: 35,
  chargePerHit: 20,
  fullCharge: 100,
} as const

export type BattleState = {
  health: number
  charge: number
  hits: number
  misses: number
  summoned: boolean
  startedAt: number
  endedAt: number | null
  phase: 'fighting' | 'won'
}

export function startBattle(now: number): BattleState {
  return {
    health: BATTLE.maxHealth,
    charge: 0,
    hits: 0,
    misses: 0,
    summoned: false,
    startedAt: now,
    endedAt: null,
    phase: 'fighting',
  }
}

function damage(state: BattleState, amount: number, now: number): BattleState {
  const health = Math.max(0, state.health - amount)
  return health === 0 ? { ...state, health, phase: 'won', endedAt: now } : { ...state, health }
}

/** A spell that struck a weak point. */
export function hit(state: BattleState, now: number): BattleState {
  if (state.phase === 'won') return state
  const charged = {
    ...state,
    hits: state.hits + 1,
    charge: Math.min(BATTLE.fullCharge, state.charge + BATTLE.chargePerHit),
  }
  return damage(charged, BATTLE.spellDamage, now)
}

/** A cast that hit nothing. */
export function miss(state: BattleState): BattleState {
  return state.phase === 'won' ? state : { ...state, misses: state.misses + 1 }
}

export function canSummon(state: BattleState): boolean {
  return state.phase === 'fighting' && !state.summoned && state.charge >= BATTLE.fullCharge
}

/** Claude's strike: once per battle, only at full charge. */
export function summon(state: BattleState, now: number): BattleState {
  if (!canSummon(state)) return state
  return damage({ ...state, summoned: true, charge: 0 }, BATTLE.summonDamage, now)
}

/** Seconds from the first frame to victory (or to now while fighting). */
export function elapsedSeconds(state: BattleState, now: number): number {
  return Math.round(((state.endedAt ?? now) - state.startedAt) / 100) / 10
}
