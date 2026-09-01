import { describe, expect, it } from 'vitest';
import { createAutosave, type Timers } from '@/lib/autosave';

/** Minuteurs contrôlés à la main : aucun temps réel dans les tests. */
function fakeTimers() {
  let id = 0;
  const jobs = new Map<number, { fn: () => void; at: number }>();
  let clock = 0;
  const timers: Timers = {
    set: (fn, ms) => {
      id += 1;
      jobs.set(id, { fn, at: clock + ms });
      return id;
    },
    clear: (key) => {
      jobs.delete(key);
    },
  };
  const advance = (ms: number) => {
    clock += ms;
    for (const [key, job] of [...jobs.entries()]) {
      if (job.at <= clock) {
        jobs.delete(key);
        job.fn();
      }
    }
  };
  return { timers, advance, count: () => jobs.size };
}

describe('createAutosave', () => {
  it('temporise pendant la frappe et n’écrit qu’une fois', async () => {
    const { timers, advance } = fakeTimers();
    const writes: string[] = [];
    const engine = createAutosave<string>({ save: async (v) => { writes.push(v); }, timers });

    engine.schedule('a');
    engine.schedule('ab');
    engine.schedule('abc');
    expect(writes).toEqual([]);

    advance(600);
    await engine.flush();
    expect(writes).toEqual(['abc']);
  });

  it('écrit la dernière valeur quand la page est quittée avant la fin du délai', async () => {
    const { timers, advance } = fakeTimers();
    const writes: string[] = [];
    const engine = createAutosave<string>({ save: async (v) => { writes.push(v); }, timers });

    engine.schedule('note en cours');
    advance(100); // on quitte avant les 600 ms
    expect(writes).toEqual([]);

    await engine.flush();
    expect(writes).toEqual(['note en cours']);
  });

  it('ne réécrit pas si rien n’est en attente', async () => {
    const { timers, advance } = fakeTimers();
    const writes: string[] = [];
    const engine = createAutosave<string>({ save: async (v) => { writes.push(v); }, timers });

    engine.schedule('x');
    advance(600);
    await engine.flush();
    await engine.flush();
    await engine.flush();
    expect(writes).toEqual(['x']);
  });

  it('n’écrit rien si l’utilisatrice n’a rien saisi', async () => {
    const { timers, advance } = fakeTimers();
    const writes: string[] = [];
    const engine = createAutosave<string>({ save: async (v) => { writes.push(v); }, timers });

    advance(5000);
    await engine.flush();
    expect(writes).toEqual([]);
  });

  it('annonce enregistrement puis enregistré puis repos', async () => {
    const { timers, advance } = fakeTimers();
    const states: string[] = [];
    const engine = createAutosave<string>({
      save: async () => {},
      onState: (s) => states.push(s),
      timers,
    });

    engine.schedule('a');
    expect(states).toEqual(['saving']);
    advance(600);
    await engine.flush();
    expect(states).toEqual(['saving', 'saved']);
    advance(1600);
    expect(states).toEqual(['saving', 'saved', 'idle']);
  });

  it('n’annonce pas deux fois le même état', async () => {
    const { timers, advance } = fakeTimers();
    const states: string[] = [];
    const engine = createAutosave<string>({
      save: async () => {},
      onState: (s) => states.push(s),
      timers,
    });

    // Une frappe = un appel à schedule. Trente lettres ne doivent produire
    // qu'une seule annonce, sinon toute la page est redessinée à chaque lettre
    // et React finit par refuser la mise à jour (« Maximum update depth »).
    for (let i = 0; i < 30; i += 1) engine.schedule('a'.repeat(i + 1));
    expect(states).toEqual(['saving']);

    advance(600);
    await engine.flush();
    expect(states).toEqual(['saving', 'saved']);

    for (let i = 0; i < 10; i += 1) engine.schedule('b'.repeat(i + 1));
    expect(states).toEqual(['saving', 'saved', 'saving']);
  });

  it('reste utilisable après un enregistrement forcé', async () => {
    const { timers, advance } = fakeTimers();
    const writes: string[] = [];
    const engine = createAutosave<string>({ save: async (v) => { writes.push(v); }, timers });

    engine.schedule('un');
    await engine.flush();
    engine.schedule('deux');
    advance(600);
    await engine.flush();
    expect(writes).toEqual(['un', 'deux']);
    expect(engine.isPending()).toBe(false);
  });
});
