import { describe, expect, it } from 'vitest';
import { Emitter, type GameEvents } from '../src/core/events';
import { HOUSE_LEVELS, buildHouse, canBuildHouse, houseCells, nextHouseLevel, roomKey } from '../src/core/house';
import { Store, defaultRoot } from '../src/core/state';
import calibration from '../src/data/calibration.json';

const newStore = () => new Store(defaultRoot(1000), new Emitter<GameEvents>());

describe('house growth', () => {
  it('starts 4x4 with the original picture', () => {
    const s = newStore();
    expect(houseCells(s.data)).toBe(4);
    expect(roomKey(s.data)).toBe('room');
    expect(nextHouseLevel(s.data)?.cells).toBe(5);
  });

  it('needs projects and coins, then spends them and grows one size', () => {
    const s = newStore();
    const first = HOUSE_LEVELS[0];
    s.data.projects = first.projects - 1;
    s.data.coins = first.coins;
    expect(canBuildHouse(s.data)).toMatchObject({ ok: false, missingProjects: 1, missingCoins: 0 });
    expect(buildHouse(s)).toBe(false);
    s.data.projects = first.projects;
    let built = 0;
    s.bus.on('houseBuilt', () => built++);
    expect(buildHouse(s)).toBe(true);
    expect(s.data).toMatchObject({ houseLevel: 1, projects: 0, coins: 0 });
    expect(houseCells(s.data)).toBe(5);
    expect(roomKey(s.data)).toBe('room5');
    expect(built).toBe(1);
  });

  it('ends at the last size', () => {
    const s = newStore();
    s.data.houseLevel = HOUSE_LEVELS.length;
    s.data.projects = 99;
    s.data.coins = 99999;
    expect(houseCells(s.data)).toBe(6);
    expect(roomKey(s.data)).toBe('room6');
    expect(buildHouse(s)).toBe(false);
  });

  it('has a picture calibration for every size, with matching cell counts', () => {
    const cal = calibration as Record<string, { cells: number }>;
    expect(cal.room.cells).toBe(4);
    for (const lv of HOUSE_LEVELS) expect(cal[`room${lv.cells}`].cells).toBe(lv.cells);
  });
});
