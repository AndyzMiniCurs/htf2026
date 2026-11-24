import { describe, expect, it } from 'vitest'
import { BATTLE, canSummon, elapsedSeconds, hit, miss, startBattle, summon } from './battle.ts'
import type { BattleState } from './battle.ts'

const hits = (state: BattleState, n: number) => {
  let s = state
  for (let i = 0; i < n; i++) s = hit(s, 1000 + i * 1000)
  return s
}

describe('sealing battle', () => {
  it('starts at full health with no charge', () => {
    expect(startBattle(0)).toMatchObject({ health: 100, charge: 0, combo: 0, phase: 'fighting' })
  })

  it('takes spell damage and charges on each hit', () => {
    const s = hit(startBattle(0), 1000)
    expect(s).toMatchObject({
      health: 100 - BATTLE.spellDamage,
      charge: BATTLE.chargePerHit,
      hits: 1,
    })
  })

  it('counts misses without damage and breaks the combo', () => {
    const s = miss(hits(startBattle(0), 3))
    expect(s).toMatchObject({ health: 100 - 3 * BATTLE.spellDamage, misses: 1, combo: 0 })
    expect(s.bestCombo).toBe(3)
  })

  it('refuses to summon before the meter is full', () => {
    const s = hits(startBattle(0), 4)
    expect(canSummon(s)).toBe(false)
    expect(summon(s, 9000)).toBe(s)
  })

  it('charges fully in five hits and lets Claude finish the glitch in one strike', () => {
    const charged = hits(startBattle(0), 5)
    expect(canSummon(charged)).toBe(true)
    const struck = summon(charged, 6000)
    expect(struck).toMatchObject({ health: 0, phase: 'won', summoned: true, endedAt: 6000 })
  })

  it('ignores every action after victory', () => {
    const won = summon(hits(startBattle(0), 5), 10_000)
    expect(hit(won, 11_000)).toBe(won)
    expect(miss(won)).toBe(won)
    expect(summon(won, 11_000)).toBe(won)
    expect(elapsedSeconds(won, 99_000)).toBe(10)
  })

  it('can be won without summoning within 40 steady seconds', () => {
    const won = hits(startBattle(0), Math.ceil(BATTLE.maxHealth / BATTLE.spellDamage))
    expect(won.phase).toBe('won')
    expect(elapsedSeconds(won, 0)).toBeLessThanOrEqual(40)
  })
})
