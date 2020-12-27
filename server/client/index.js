import { canvas } from "./context.js";
import { simulation } from "./system.js";

function render() {
  Object.keys(simulation).forEach(component => { simulation[component](); });
};

(function tick() {
  render();
  window.requestAnimationFrame(tick, canvas);
})();