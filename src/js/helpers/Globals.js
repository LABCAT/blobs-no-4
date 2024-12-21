// p5.sound doesn't work correctly when p5 is not available in the global name space so we add it here
// https://github.com/processing/p5.js-sound/issues/512
import * as p5 from "p5";
window.p5 = p5;
