import { gl } from "./context.js";
import { particles, fluid } from "./shaders.js";

const programs = {};

class GLProgram {
  constructor(vs, fs) {
    this.uniforms = {};
    this.program = gl.createProgram();

    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.program);
    }

    const uniformCount = gl.getProgramParameter(
      this.program,
      gl.ACTIVE_UNIFORMS
    );

    for (let i = 0; i < uniformCount; i++) {
      const uniformName = gl.getActiveUniform(this.program, i).name;
      this.uniforms[uniformName] = gl.getUniformLocation(
        this.program,
        uniformName
      );
    }
  }

  use() {
    gl.useProgram(this.program);
  }
};

function setUniforms(presets) {
  const types = {
    '1f'(program, data) { gl.uniform1f(program, data); },
    '2f'(program, data) { gl.uniform2f(program, ...data); },
    '3f'(program, data) { gl.uniform3f(program, ...data); },
    '1i'(program, fbo) { gl.uniform1i(program, fbo[0].bind(fbo[1])); },
  };
 
  Object.keys(presets).forEach(name => {
    programs[name].use();
    const program = programs[name].uniforms;
    presets[name].forEach(args => { types[args[0]](program[args[1]], args[2]); });
  });
};

for (const name in particles.fs) programs[name] = new GLProgram(particles.vs.base, particles.fs[name]);
for (const name in fluid.fs) programs[name] = new GLProgram(fluid.vs.base, fluid.fs[name]);

export { programs, setUniforms };