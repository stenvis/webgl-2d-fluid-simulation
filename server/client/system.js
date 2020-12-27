import cursor from "./events.js";
import fbo from "./fbo.js";
import { programs, setUniforms } from "./programs.js";
import { gl, canvas, texture } from "./context.js";
import { 
  DT,
  CURL,
  DENSITY_RADIUS,
  FORCE_RADIUS,
  VELOCITY_SPREAD,
  COLOR_INTENSITY,
  PRESSURE_ITERATIONS,
  DENSITY_DISSIPATION,
  VELOCITY_DISSIPATION,
  NUM_PARTICLES
} from "./constants.js";

const buffer = {
  a: gl.createBuffer(),
  b: gl.createBuffer(),
  c: gl.createBuffer(),
};

const particlesArray  = new Float32Array(NUM_PARTICLES * 2);
const texelWidth = 1.0 / texture.width, texelHeight = 1.0 / texture.height;
const aspectRatio = texture.width / texture.height;
const random = d => Math.random() / d;

const simulation = {
  1() { textureViewPort() },
  2() { bindPlaneBuffer() },

  4() { advection() },
  5() { curl() },
  6() { vorticity() },
  7() { divergence() },
  8() { pressure() },
  9() { gradient() },

  10() { screenViewPort() },
  11() { display() },

  12() { bindParticlesBuffer() },
  13() { particles() },
};

const presets = {
  force: [
    ['1f', 'aspectRatio', aspectRatio],
    ['1f', 'r', FORCE_RADIUS],
  ],
  color: [
    ['1f', 'aspectRatio', aspectRatio],
    ['1f', 'r', DENSITY_RADIUS],
  ],
  advection: [
    ['2f', 'texelSize', [texelWidth, texelHeight]], 
  ],
  curl: [
    ['1i', 'uVelocity', [fbo.velocity.src, 0]],
    ['2f', 'texelSize', [texelWidth, texelHeight]], 
  ],
  vorticity: [
    ['1f', 'dt', DT],
    ['1f', 'curl', CURL], 
    ['2f', 'texelSize', [texelWidth, texelHeight]], 
  ],
  divergence: [
    ['2f', 'texelSize', [texelWidth, texelHeight]], 
  ],
  pressure: [
    ['2f', 'texelSize', [texelWidth, texelHeight]], 
  ],
  gradient: [
    ['2f', 'texelSize', [texelWidth, texelHeight]], 
  ],
  particles: [
    ['2f', 'texelSize', [texelWidth, texelHeight]], 
  ],
}; 

(function initUniforms() {
  setUniforms(presets);
})();

(function generateParticles() {
  const randomPosition = size => (Math.random() * size) / size;

  for (let i = 0; i <= NUM_PARTICLES; i += 2) {
    particlesArray[i] = randomPosition(canvas.width);
    particlesArray[i + 1] = randomPosition(canvas.height);
  }
})();

(function initPlaneBuffer() {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.a);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
    gl.STATIC_DRAW
  );
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.b);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array([0, 1, 2, 0, 2, 3]),
    gl.STATIC_DRAW
  );
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
})();

(function initParticlesBuffer() {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.c);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    particlesArray,
    gl.STATIC_DRAW
  );
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
})();

function bindPlaneBuffer() {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.a);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.b);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
};

function bindParticlesBuffer() {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer.c);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
};

function draw(destination) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
};

function textureViewPort() { gl.viewport(0, 0, texture.width, texture.height); };
function screenViewPort() { gl.viewport(0, 0, canvas.width, canvas.height); };

function setForce() { simulation[3] = force; };
function deleteForce() { delete simulation[3]; };

function force() {
  if (!cursor.move) return;

  const posX = cursor.position[0] / canvas.width, posY = 1 - cursor.position[1] / canvas.height;

  programs.force.use();
  gl.uniform1i(programs.force.uniforms.uVelocity, fbo.velocity.src.bind());
  gl.uniform2f(programs.force.uniforms.cursor, posX, posY); 
  gl.uniform2f(programs.force.uniforms.direction, cursor.direction[0] * aspectRatio * VELOCITY_SPREAD, cursor.direction[1] * aspectRatio * VELOCITY_SPREAD);
  draw(fbo.velocity.dst.fbo);
  fbo.velocity.swap();

  programs.color.use();
  gl.uniform1i(programs.color.uniforms.uDensity, fbo.density.src.bind());
  gl.uniform2f(programs.color.uniforms.cursor, posX, posY); 
  gl.uniform3f(programs.color.uniforms.color, COLOR_INTENSITY * random(2.2), COLOR_INTENSITY * random(2), COLOR_INTENSITY * random(2.3));
  draw(fbo.density.dst.fbo);
  fbo.density.swap();

  cursor.move = false;
};

function advection() {
  programs.advection.use();
  gl.uniform1i(programs.advection.uniforms.uVelocity, fbo.velocity.src.bind());
  gl.uniform1i(programs.advection.uniforms.uSource, fbo.velocity.src.bind(1));
  gl.uniform1f(programs.advection.uniforms.dissipation, VELOCITY_DISSIPATION);
  gl.uniform1f(programs.advection.uniforms.dt, DT);
  draw(fbo.velocity.dst.fbo);
  fbo.velocity.swap();

  gl.uniform1i(programs.advection.uniforms.uSource, fbo.density.src.bind(1));
  gl.uniform1f(programs.advection.uniforms.dissipation, DENSITY_DISSIPATION);
  gl.uniform1f(programs.advection.uniforms.dt, DT + DT);
  draw(fbo.density.dst.fbo);
  fbo.density.swap();
};

function curl() {
  programs.curl.use();
  gl.uniform1i(programs.curl.uniforms.uVelocity, fbo.velocity.src.bind(1));
  draw(fbo.curl.fbo);
};

function vorticity() {
  programs.vorticity.use();
  gl.uniform1i(programs.vorticity.uniforms.uCurl, fbo.curl.bind(0));
  gl.uniform1i(programs.vorticity.uniforms.uVelocity, fbo.velocity.src.bind(1));
  draw(fbo.velocity.dst.fbo);
  fbo.velocity.swap();
};

function divergence() {
  programs.divergence.use();
  gl.uniform1i(programs.divergence.uniforms.uVelocity, fbo.velocity.src.bind());
  draw(fbo.divergence.fbo);
};

function pressure() {
  programs.pressure.use();
  gl.uniform1i(programs.pressure.uniforms.uDivergence, fbo.divergence.bind());

  for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(programs.pressure.uniforms.uPressure, fbo.pressure.src.bind(1));
      draw(fbo.pressure.dst.fbo);
      fbo.pressure.swap();
  }
};

function gradient() {
  programs.gradient.use();
  gl.uniform1i(programs.gradient.uniforms.uPressure, fbo.pressure.src.bind());
  gl.uniform1i(programs.gradient.uniforms.uVelocity, fbo.velocity.src.bind(1));
  draw(fbo.velocity.dst.fbo);
  fbo.velocity.swap();
};

function display() {
  programs.display.use();
  gl.uniform1i(programs.display.uniforms.uTexture, fbo.density.src.bind(1));
  draw(null);
}

function particles() {
  programs.particles.use();
  gl.uniform1i(programs.particles.uniforms.uVelocity, fbo.velocity.dst.bind());
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.drawArrays(gl.POINTS, 0, NUM_PARTICLES);
};

export { simulation, setForce, deleteForce };