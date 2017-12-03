import React, { Component, PureComponent } from "react";
import "./index.css";
import { STATUS_GAMEOVER, STATUS_LEVEL_INTRO } from "../Logic";

const controls = ["ER", "DF", "CV", "TY", "GH", "BN"];
const colors = [
  "#58A4DA",
  "#99B898",
  "#FECEA8",
  "#E84A5F",
  "#974150",
  "#DDDDDD"
];

const polarToCartesian = (x, y, r, a) => [
  x + r * Math.cos(a),
  y + r * Math.sin(a)
];
const roundNb = nb => nb.toFixed(2);

class SvgParticle extends Component {
  render() {
    const { particle, size } = this.props;
    const c = polarToCartesian(
      size / 2,
      size / 2,
      size * particle.dist,
      particle.angle
    ).map(roundNb);
    return (
      <circle
        className="particle"
        fill={colors[particle.type]}
        cx={c[0]}
        cy={c[1]}
        r={roundNb(size * particle.radius)}
      />
    );
  }
}

class SvgPaddle extends Component {
  render() {
    const { size, paddle, index } = this.props;
    const h = size / 2;
    const [controlL, controlR] = controls[index];
    const x = h;
    const y = h;
    const r = size * paddle.dist;
    const startAngle = paddle.angle - paddle.size / 2;
    const endAngle = paddle.angle + paddle.size / 2;
    const flag = endAngle - startAngle <= Math.PI ? 0 : 1;
    const startP = polarToCartesian(x, y, r, startAngle).map(roundNb);
    const endP = polarToCartesian(x, y, r, endAngle).map(roundNb);
    const tA = 0.01 / paddle.dist;
    const startTextP = polarToCartesian(x, y, r, startAngle - tA).map(roundNb);
    const endTextP = polarToCartesian(x, y, r, endAngle + tA).map(roundNb);
    const color = colors[index];
    const w = roundNb(size * paddle.width);
    const textStyle = {
      fill: color,
      fontSize: roundNb(size * 0.015)
    };
    return (
      <g className="paddle">
        <text {...textStyle} x={startTextP[0]} y={startTextP[1]}>
          {controlL}
        </text>
        <text {...textStyle} x={endTextP[0]} y={endTextP[1]}>
          {controlR}
        </text>
        <path
          className="pad"
          d={`M${endP} A${roundNb(r)},${roundNb(r)},0,${flag},0,${startP}`}
          strokeWidth={w}
          stroke={color}
        />
      </g>
    );
  }
}

class Heart extends PureComponent {
  render() {
    const { size, lifePercentage } = this.props;
    return (
      <g className="heart" transform={`translate(${size / 2},${size / 2})`}>
        <circle cx={0} cy={0} r={roundNb(size * 0.035 * lifePercentage)} />
      </g>
    );
  }
}

class Render extends Component {
  state = { state: this.props.getGameState() };
  keys = {};

  getUserEvents = () => {
    const { keys } = this;
    const moves = controls.map(c => {
      const [l, r] = c;
      return (keys[r] || 0) - (keys[l] || 0);
    });
    return {
      keys,
      moves
    };
  };

  onKeyUp = e => {
    const key = (e.key || "").toUpperCase();
    this.keys[key] = 0;
  };

  onKeyDown = e => {
    const key = (e.key || "").toUpperCase();
    if (e.which === 32) e.preventDefault();
    this.keys[key] = 1;
  };

  componentDidMount() {
    document.body.addEventListener("keyup", this.onKeyUp);
    document.body.addEventListener("keydown", this.onKeyDown);

    let startT,
      lastT,
      tick = 0;

    const { action, getGameState } = this.props;

    const loop = t => {
      this.raf = requestAnimationFrame(loop);
      if (!lastT) startT = lastT = t;
      const dt = Math.min(100, t - lastT);
      const e = { time: t - startT, tick, dt };
      const userEvents = this.getUserEvents();
      lastT = t;
      tick++;
      const prevState = getGameState();
      const state = action("tick", e, userEvents);
      // hook changes
      if (state !== prevState) this.setState({ state });
    };
    this.raf = requestAnimationFrame(loop);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.raf);
  }
  render() {
    const { state } = this.state;
    const { size } = this.props;
    return (
      <div
        className="container"
        style={{ fontSize: roundNb(size / 1000) + "em" }}
      >
        <div className="game">
          {state.status !== STATUS_GAMEOVER ? null : state.life > 0 ? (
            <div className="layer">
              <div className="overlay" />
              <div className="gameover">
                <h1>TRY AGAIN</h1>
                <p>
                  {state.life > 1 ? state.life + " remaining " : "last life"} to
                  try level {state.level}
                </p>
              </div>
            </div>
          ) : (
            <div className="layer">
              <div className="overlay" />
              <div className="gameover">
                <h1>GAME OVER</h1>
                <p>
                  Score <strong>{state.score}</strong> (level {state.level})
                </p>
              </div>
            </div>
          )}
          {state.status !== STATUS_LEVEL_INTRO ? null : (
            <div className="layer">
              <div className="overlay" />
              <div className="gameover">
                <h1>{state.levelTitle}</h1>
                <p>{state.levelDescription}</p>
              </div>
            </div>
          )}
          <svg width={size} height={size}>
            <g>
              {state.paddles.map(
                (paddle, index) =>
                  paddle && (
                    <SvgPaddle
                      key={index}
                      index={index}
                      size={size}
                      paddle={paddle}
                    />
                  )
              )}
            </g>
            <g>
              {state.particles.map(particle => (
                <SvgParticle
                  key={particle.id}
                  size={size}
                  particle={particle}
                />
              ))}
            </g>
            <Heart size={size} lifePercentage={state.life / state.maxLife} />
          </svg>
        </div>

        <footer>
          “HARP” – <a href="https://twitter.com/greweb">greweb</a> – 2017 –{" "}
          <a href="https://ldjam.com/events/ludum-dare/40">LD40</a>
        </footer>
      </div>
    );
  }
}

export default Render;
