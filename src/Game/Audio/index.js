import note1_1 from "./assets/1-1.m4a";
import note2_1 from "./assets/2-1.m4a";
import note3_1 from "./assets/3-1.m4a";
import note4_1 from "./assets/4-1.m4a";
import note5_1 from "./assets/5-1.m4a";
import note6_1 from "./assets/6-1.m4a";
import note1_2 from "./assets/1-2.m4a";
import note2_2 from "./assets/2-2.m4a";
import note3_2 from "./assets/3-2.m4a";
import note4_2 from "./assets/4-2.m4a";
import note5_2 from "./assets/5-2.m4a";
import note6_2 from "./assets/6-2.m4a";
import note1_3 from "./assets/1-3.m4a";
import note2_3 from "./assets/2-3.m4a";
import note3_3 from "./assets/3-3.m4a";
import note4_3 from "./assets/4-3.m4a";
import note5_3 from "./assets/5-3.m4a";
import note6_3 from "./assets/6-3.m4a";
import fail from "./assets/fail.m4a";
import levelup from "./assets/levelup.m4a";

const audioFiles = {
  note1_1,
  note2_1,
  note3_1,
  note4_1,
  note5_1,
  note6_1,
  note1_2,
  note2_2,
  note3_2,
  note4_2,
  note5_2,
  note6_2,
  note1_3,
  note2_3,
  note3_3,
  note4_3,
  note5_3,
  note6_3,
  fail,
  levelup
};

const context = new AudioContext();

const loadSound = (url: string): Promise<AudioBuffer> =>
  new Promise((success, failure) => {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onload = () => {
      context.decodeAudioData(request.response, success, failure);
    };
    request.send();
  });

const playNow = ({ buffer, output }) => {
  if (buffer) {
    const source = context.createBufferSource();
    source.connect(output);
    source.buffer = buffer;
    source.start(0);
    setTimeout(() => {
      source.disconnect(output);
    }, 1000 * (buffer.duration + 1));
  }
};

let notesIncr = [];

let sync;
if (!context) {
  sync = g => {};
} else {
  // $FlowFixMe
  const compressor = context.createDynamicsCompressor();
  compressor.connect(context.destination);

  const out = context.createGain();
  out.gain.value = 1;
  out.connect(compressor);

  const sounds = {};
  Object.keys(audioFiles).forEach(name => {
    const output = context.createGain();
    output.connect(out);
    const bufferPromise = loadSound(audioFiles[name]);
    const sound = {
      output,
      bufferPromise,
      buffer: null
    };
    sounds[name] = sound;
    bufferPromise.then(
      buffer => {
        sound.buffer = buffer;
      },
      err => {
        console.warn("Can't load sound " + name);
      }
    );
  });

  sync = ({ volume, triggerNotes, triggerFail, triggerLevelUp }) => {
    out.gain.value = volume;
    if (triggerFail) {
      playNow(sounds.fail);
    }
    if (triggerLevelUp) {
      notesIncr = [];
      playNow(sounds.levelup);
    }
    triggerNotes.forEach(i => {
      let incr = notesIncr[i] || 0;
      playNow(sounds["note" + (i + 1) + "_" + (incr + 1)]);
      notesIncr[i] = (incr + 1) % 3;
    });
  };
}

export default sync;
