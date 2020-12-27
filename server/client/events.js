import { setForce, deleteForce } from "./system.js";

const cursor = {
  down: false,
  move: false,
  position: [0, 0],
  direction: [0, 0],
};

function mouseMove(e) {
  const x = e.clientX, y = e.clientY;
  cursor.move = cursor.down;
  cursor.direction[0] = (x - cursor.position[0]);
  cursor.direction[1] = -(y - cursor.position[1]);
  cursor.position[0] = x;
  cursor.position[1] = y;
};

function touchMove(e) {
  cursor.move = cursor.down;
  cursor.position[0] = e.touches[0].pageX;
  cursor.position[1] = e.touches[0].pageY;
};

function mouseDown() { 
  setForce();
  cursor.down = true;
};

function mouseUp() {
  deleteForce();
  cursor.down = false;
};

canvas.addEventListener("mousedown", mouseDown);
canvas.addEventListener("mousemove", mouseMove);
window.addEventListener("mouseup", mouseUp);

canvas.addEventListener("touchstart", mouseDown);
canvas.addEventListener("touchmove", touchMove);
window.addEventListener("touchend", mouseUp);

export default cursor;