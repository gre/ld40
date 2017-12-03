import React, { Component } from "react";
import Audio from "./Audio";
let Logic = require("./Logic").default;
let { default: Render } = require("./Render");

let _instance;
if (module.hot) {
  // $FlowFixMe
  module.hot.accept("./Render", () => {
    Render = require("./Render").default;
    if (_instance) _instance.forceUpdate();
  });
  // $FlowFixMe
  module.hot.accept("./Logic", () => {
    Logic = require("./Logic").default;
    if (_instance) _instance.forceUpdate();
  });
}

function gameSize() {
  return Math.max(
    400,
    2 * Math.floor(Math.min(window.innerWidth, window.innerHeight) / 2 - 20)
  );
}

class Game extends Component {
  gameState = null;
  getGameState = () => this.gameState;
  start = () => {
    this.setGameState(Logic.create());
  };
  action = (name: string, ...args: *) => {
    const { gameState: oldState } = this;
    if (!oldState) return;
    const newState = Logic[name](oldState, ...args);
    if (newState && newState !== oldState) {
      this.setGameState(newState);
      return newState;
    } else {
      return oldState;
    }
  };
  setGameState(g) {
    this.gameState = g;
    Audio(g.audio);
  }

  state = { size: gameSize() };

  componentWillMount() {
    _instance = this;
    this.start();
    window.addEventListener("resize", () => {
      const size = gameSize();
      if (size !== this.state.size) {
        this.setState({ size });
      }
    });
  }

  render() {
    return (
      <Render
        size={this.state.size}
        getGameState={this.getGameState}
        action={this.action}
      />
    );
  }
}

export default Game;
