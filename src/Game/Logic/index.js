import genLevel, {
  PARTICULE_RADIUS,
  PADDLE_WIDTH,
  PADDLE_MAX_WIDTH
} from "./genLevel";

const debugPaddleAlwaysAccept = false;

export const PARTICULE_RADIUS_BOUNCED = 0.003;

export const STATUS_PLAY = 0;
export const STATUS_GAMEOVER = 1;
export const STATUS_LEVEL_INTRO = 2;

const defaultVolume = 0.5;

function create() {
  return {
    ...genLevel(0),
    maxLife: 3,
    life: 3,
    status: STATUS_LEVEL_INTRO,
    statusChangeTime: 0,
    score: 0,
    mKey: 0,
    audio: {
      volume: defaultVolume,
      triggerNotes: [],
      triggerFail: false,
      triggerLevelUp: false
    }
  };
}

const DOUBLE_PI = 2 * Math.PI;

const modAngle = a => (a + DOUBLE_PI) % DOUBLE_PI;

function paddleContainsAngle(paddle, a, extra) {
  const half = paddle.size / 2;
  const a1 = paddle.angle - half - extra;
  const a2 = paddle.angle + half + extra;
  const b = modAngle(a2 - a1);
  const x = modAngle(a - a1);
  let cond = b < Math.PI ? x < b : b < x;
  return a2 - a1 > Math.PI ? !cond : cond;
}

function tick(g, { time, dt, tick }, userEvents) {
  if (g.status === STATUS_GAMEOVER && g.life <= 0) return g;

  const s = { ...g };
  s.audio = {
    ...s.audio,
    triggerNotes: [],
    triggerFail: false,
    triggerLevelUp: false
  };

  if (s.status === STATUS_GAMEOVER) {
    if (time - s.statusChangeTime > 3000) {
      return {
        ...s,
        statusChangeTime: time,
        status: STATUS_PLAY
      };
    }
    return g;
  }

  if (s.status === STATUS_LEVEL_INTRO) {
    if (time - s.statusChangeTime > 3000) {
      return {
        ...s,
        statusChangeTime: time,
        status: STATUS_PLAY
      };
    }
    return g;
  }

  const levelTime = time - s.statusChangeTime;

  // mute key
  if (userEvents.keys.M && !s.mKey) {
    s.audio.volume = s.audio.volume ? 0 : defaultVolume;
  }
  s.mKey = userEvents.keys.M;

  const newParticles = [];

  // Generate particles / consume the levelSequence

  const sequenceHead = s.levelSequence[0];
  function consumeHead() {
    s.levelSequence = s.levelSequence.slice(1);
    s.lastSequenceRelativeTime = levelTime;
  }
  if (sequenceHead) {
    if ("pause" in sequenceHead) {
      const sequenceTime = levelTime - s.lastSequenceRelativeTime;
      if (sequenceTime > sequenceHead.pause) {
        consumeHead();
      }
    } else if ("type" in sequenceHead) {
      newParticles.push(sequenceHead);
      consumeHead();
    }
  }

  // Update the particles and look for collisions
  const paddleCollisions = {};
  let nbIncomingParticles = 0,
    nbReachMiddle = 0;
  s.particles.forEach(p => {
    p = { ...p };
    p.dist -= p.vel * dt;
    if (!p.bounced) {
      nbIncomingParticles++;
      const paddle = s.paddles[p.type];
      if (!paddle) return; // no more paddle
      const padHigh = paddle.dist + PADDLE_WIDTH / 2 + p.radius;
      if (p.dist <= 2 * PARTICULE_RADIUS) {
        // particle reach middle
        nbReachMiddle++;
        return;
      } else if (paddle.dist - PADDLE_WIDTH / 2 <= p.dist && p.dist < padHigh) {
        // paddle collision
        if (
          debugPaddleAlwaysAccept ||
          paddleContainsAngle(paddle, p.angle, p.radius)
        ) {
          paddleCollisions[p.type] = 1;
          // make it bounces
          p.dist = padHigh;
          p.vel *= -1;
          p.radius /= 2;
          p.bounced = true;
          s.score += p.score;
        }
      } else if (p.dist > 1 && p.vel < 0) {
        return; // out of screen deleted to avoid mem leak
      }
    }
    newParticles.push(p);
  });
  s.particles = newParticles;

  // Update the paddles
  s.paddles = s.paddles.map((p, i) => {
    if (!p) return null;
    p = { ...p };
    const move = userEvents.moves[i];
    if (move) {
      p.angle = modAngle(p.angle + dt * move * 0.0004 / p.dist);
    }
    if (paddleCollisions[i]) {
      p.width = PADDLE_MAX_WIDTH;
      s.audio.triggerNotes.push(i);
    }
    p.width += 0.08 * (PADDLE_WIDTH - p.width);
    return p;
  });

  if (nbReachMiddle > 0) {
    s.life--;
    s.audio.triggerFail = true;
    s.status = STATUS_GAMEOVER;
    s.statusChangeTime = time;
    Object.assign(s, s.initialLevelState);
  } else if (s.levelSequence.length === 0 && nbIncomingParticles === 0) {
    s.audio.triggerLevelUp = true;
    s.status = STATUS_LEVEL_INTRO;
    s.statusChangeTime = time;
    s.life = s.maxLife;
    Object.assign(s, genLevel(s.level + 1));
  }

  return s;
}

export default {
  create,
  tick
};
