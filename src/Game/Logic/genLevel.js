export const PARTICULE_RADIUS = 0.008;
export const PADDLE_WIDTH = 0.01;
export const PADDLE_MAX_WIDTH = 0.02;

const speedSlow = 0.0001;

const uniqSeed = Math.random().toFixed(5); // this is just to not messup the hotreload
let id = 0;
function par(type = 0, angle = 0, dist = 0.6) {
  return {
    id: ++id + uniqSeed,
    type,
    angle,
    vel: speedSlow,
    dist,
    score: 10,
    radius: PARTICULE_RADIUS
  };
}

function timeLapseRound(n, mod = 200) {
  return Math.round(n / mod) * mod;
}

const pause = delay => ({ pause: timeLapseRound(delay) });

function rotatingSeq(firstPar, count, rotIncr, pauseBetween, skipF) {
  return Array(count - 1)
    .fill(null)
    .reduce(
      ([lastPar, acc], _, i) => {
        const p = par(lastPar.type, lastPar.angle + rotIncr, lastPar.dist);
        const nextAcc =
          skipF && skipF(i)
            ? acc.concat(pause(pauseBetween))
            : acc.concat([pause(pauseBetween), p]);
        return [p, nextAcc];
      },
      [firstPar, [firstPar]]
    )[1];
}

function interleaveSeqs(seqs) {
  const all = [];
  seqs = seqs.map(seq => [...seq]);
  let maxIter = 9999;
  while (seqs.length > 0 && --maxIter) {
    const pauses = [];
    seqs.forEach((seq, i) => {
      while (seq.length > 0 && "type" in seq[0]) {
        all.push(seq[0]);
        seq.splice(0, 1);
      }
      if (seq.length > 0 && "pause" in seq[0]) {
        pauses.push(seq[0].pause);
      }
      if (seq.length === 0) seqs.splice(i, 1);
    });
    if (pauses.length) {
      const pause = Math.min(...pauses);
      all.push({ pause });
      seqs.forEach((seq, i) => {
        if ("pause" in seq[0]) {
          const p = seq[0].pause;
          if (p <= pause) {
            seq.splice(0, 1);
          } else {
            seq[0] = { pause: p - pause };
          }
          if (seq.length === 0) seqs.splice(i, 1);
        }
      });
    }
  }
  if (maxIter === 0) {
    console.log(seqs, all);
    throw new Error("bug in algorithm, reach maxIter");
  }
  return all;
}

const firstLevels = [
  {
    levelSequence: rotatingSeq(par(0, 0), 8, 0.2, 1000)
  },
  {
    levelSequence: interleaveSeqs([
      rotatingSeq(par(), 8, 0.2, 500),
      [pause(4000), ...rotatingSeq(par(1), 8, Math.PI / 4, 500)]
    ])
  }
];

function randomDistrib(n) {
  const [last, acc] = Array(n - 1)
    .fill(0)
    .map(() => Math.random())
    .sort((a, b) => a - b)
    .reduce(([last, acc], r) => [r, acc.concat(r - last)], [0, []]);
  return acc.concat(1 - last);
}

function genericLevel(level) {
  const padCount = Math.min(
    6,
    Math.max(
      1,
      Math.round(
        1 + Math.max(0, 1.5 * Math.random() + 5 - 5 * Math.exp(-level / 20))
      )
    )
  );
  const diffPart = randomDistrib(padCount);
  const levelSequence = interleaveSeqs(
    diffPart
      .map((diff, i) => {
        let t = [pause(500 * Math.round(4 * Math.random()) + 4000 * i)];
        for (
          let j = 1 + (0.5 + 0.5 * Math.random()) * (level / 4);
          j > 0;
          j--
        ) {
          const nb =
            3 *
            Math.floor(1 + Math.random() + 6 * Math.random() * Math.random());
          let rotIncr =
            (Math.random() - 0.5) *
            (0.1 * Math.random() + 0.3 * (1 - diff) * Math.random());
          if (Math.random() < 0.2) rotIncr *= 4;
          if (Math.random() < diff) rotIncr = 0;
          const delay = Math.max(
            200,
            1000 - 30 * nb - 500 * Math.random() - 400 * Math.random() * diff
          );
          let skip = Math.floor(2.2 * Math.random() * Math.random());
          let mod = 3 + Math.floor(4 * Math.random() * Math.random()) + skip;
          const s = rotatingSeq(
            par(i, 2 * Math.PI * Math.random()),
            nb,
            rotIncr,
            delay,
            i => i % mod < skip
          );
          t = t.concat([
            ...s,
            pause(nb * delay + 3000 * (0.2 + 0.8 * diff) * Math.random())
          ]);
        }
        return t;
      })
      .sort(() => Math.random() - 0.5)
  );
  return {
    levelSequence
  };
}

export default function genLevel(level, time) {
  const partial = firstLevels[level] || genericLevel(level);
  let paddles = Array(6).fill(null);
  partial.levelSequence.forEach(o => {
    if ("type" in o && !paddles[o.type]) {
      paddles[o.type] = {
        angle: 0,
        size: 0.66 * Math.PI,
        width: PADDLE_WIDTH,
        dist: 0.05 + o.type * PADDLE_MAX_WIDTH
      };
    }
  });
  const obj = {
    paddles,
    particles: [],
    level,
    lastSequenceRelativeTime: 0,
    levelTitle: level === 0 ? "Welcome to HARP" : "LEVEL " + level,
    levelDescription:
      level === 0 ? "Press letter to rotate the pads" : "Level Up!",
    ...partial
  };
  obj.initialLevelState = obj;
  return obj;
}
