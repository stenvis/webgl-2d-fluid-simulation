import { gl } from "./context.js";

const shaderTypes = {
  vs: gl.VERTEX_SHADER,
  fs: gl.FRAGMENT_SHADER,
};

function compileShader(type, source) {
  const shader = gl.createShader(shaderTypes[type]);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(shader);
  return shader;
};

const particles = {
  vs: {
    base: compileShader(
      'vs',
      `
        precision highp float;

        attribute vec2 aParticles;

        uniform sampler2D uVelocity;

        uniform vec2 texelSize;

        void main() {
          vec2 v = texture2D(uVelocity, aParticles).xy * 0.4;

          vec2 uv = aParticles * 2. - 1.;
          uv += v * texelSize;

          gl_Position = vec4(uv, 0., 1.);
        }
      `
    ),
  },
  fs: {
    particles: compileShader(
      'fs',
      `
        precision highp float; 
  
        void main() {
          gl_FragColor = vec4(.25, .8, 1., 1.);
        }
      `
    ),
  },
};

const fluid = {
  vs: {
    base: compileShader(
      'vs',
      `
        precision highp float;

        attribute vec2 aPlane;

        uniform vec2 texelSize;

        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;

        void main() {
          vUv = aPlane * .5 + .5;
          vL = vUv - vec2(texelSize.x, .0);
          vR = vUv + vec2(texelSize.x, .0);
          vT = vUv + vec2(.0, texelSize.y);
          vB = vUv - vec2(.0, texelSize.y);

          gl_Position = vec4(aPlane, 0., 1.);
        }
      `
    ),
  },
  fs: {
    display: compileShader(
      'fs',
      `
        precision highp float;
        precision mediump sampler2D;

        uniform sampler2D uTexture;

        varying vec2 vUv;

        void main() {
          gl_FragColor = texture2D(uTexture, vUv);
        }
      `
    ),
    force: compileShader(
      'fs',
      `
        precision highp float;
        precision mediump sampler2D;

        varying vec2 vUv;

        uniform sampler2D uVelocity;

        uniform float r;
        uniform float aspectRatio;
        uniform vec2 cursor;
        uniform vec2 direction;

        void main() {
          vec2 v = texture2D(uVelocity, vUv).xy;

          vec2 pos = vUv - cursor;
          pos.x *= aspectRatio;
          v += exp(-dot(pos, pos) * r) * direction;

          gl_FragColor = vec4(v, 1., 1.);
        }
      `
    ),
    color: compileShader(
      'fs',
      `
        precision highp float;
        precision mediump sampler2D;

        varying vec2 vUv;

        uniform sampler2D uDensity;

        uniform float r;
        uniform float aspectRatio;
        uniform vec2 cursor;
        uniform vec3 color;

        void main() {
          vec3 dn = texture2D(uDensity, vUv).xyz;

          vec2 pos = vUv - cursor;
          pos.x *= aspectRatio;
          vec3 rgb = vec3(color.r, color.g, color.b);
          dn += exp(-dot(pos, pos) * r) * rgb;

          gl_FragColor = vec4(dn, 1.);
        }
      `
    ),
    advection: compileShader(
      'fs',
      `
        precision highp float;
        precision mediump sampler2D;

        uniform sampler2D uVelocity;
        uniform sampler2D uSource;

        uniform float dt;
        uniform float dissipation;
        uniform vec2 texelSize;
        uniform vec2 textureSize;

        varying vec2 vUv;

        void main() {
          vec2 pos = vUv - dt * texelSize * texture2D(uVelocity, vUv).xy;
          gl_FragColor = dissipation * texture2D(uSource, pos);
        }
      `
    ),
    divergence: compileShader(
      'fs',
      `
        precision highp float;
        precision mediump sampler2D;

        uniform sampler2D uVelocity;

        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        varying vec2 vUv;

        vec2 sampleVelocity (in vec2 uv) {
          vec2 multiplier = vec2(1., 1.);

          if (uv.x < .0) { uv.x = .0; multiplier.x = -1.; }
          if (uv.x > 1.) { uv.x = 1.; multiplier.x = -1.; }
          if (uv.y < .0) { uv.y = .0; multiplier.y = -1.; }
          if (uv.y > 1.) { uv.y = 1.; multiplier.y = -1.; }

          return multiplier * texture2D(uVelocity, uv).xy;
        }

        void main() {
          float L = sampleVelocity(vL).x;
          float R = sampleVelocity(vR).x;
          float T = sampleVelocity(vT).y;
          float B = sampleVelocity(vB).y;
          float div = .5 * (R - L + T - B);

          gl_FragColor = vec4(div, .0, .0, 1.);
        }
      `
    ),
    curl: compileShader(
      'fs',
      `
        precision highp float;
        precision mediump sampler2D;

        uniform sampler2D uVelocity;

        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        varying vec2 vUv;

        void main() {
          float L = texture2D(uVelocity, vL).y;
          float R = texture2D(uVelocity, vR).y;
          float T = texture2D(uVelocity, vT).x;
          float B = texture2D(uVelocity, vB).x;

          float vorticity = R - L - T + B;

          gl_FragColor = vec4(vorticity, .0, .0, 1.);
        }
      `
    ),
    vorticity: compileShader(
      'fs',
      `
        precision highp float;
        precision mediump sampler2D;

        uniform sampler2D uCurl;
        uniform sampler2D uVelocity;

        uniform float dt;
        uniform float curl;

        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        varying vec2 vUv;

        void main() {
          vec2 v = texture2D(uVelocity, vUv).xy;

          float L = texture2D(uCurl, vL).y;
          float R = texture2D(uCurl, vR).y;
          float T = texture2D(uCurl, vT).x;
          float B = texture2D(uCurl, vB).x;
          float C = texture2D(uCurl, vUv).x;

          float rate = .00001;
          vec2 f = vec2(abs(T) - abs(B), abs(R) - abs(L));
          f *= length(f + rate) * curl * C * rate;

          gl_FragColor = vec4(v + f * dt, .0, 1.);
        }
      `
    ),
    pressure: compileShader(
      'fs',
      `
        precision highp float;
        precision mediump sampler2D;

        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;

        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        varying vec2 vUv;

        vec2 boundary (in vec2 uv) {
          uv = min(max(uv, .0), 1.);
          return uv;
        }

        void main() {
          float L = texture2D(uPressure, boundary(vL)).x;
          float R = texture2D(uPressure, boundary(vR)).x;
          float T = texture2D(uPressure, boundary(vT)).x;
          float B = texture2D(uPressure, boundary(vB)).x;
          float C = texture2D(uPressure, vUv).x;

          float divergence = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + B + T - divergence) * .25;

          gl_FragColor = vec4(pressure, .0, .0, 1.);
        }
      `
    ),
    gradient: compileShader(
      'fs',
      `
        precision highp float;
        precision mediump sampler2D;

        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;

        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        varying vec2 vUv;

        vec2 boundary (in vec2 uv) {
          uv = min(max(uv, .0), 1.);
          return uv;
        }

        void main() {
          float L = texture2D(uPressure, boundary(vL)).x;
          float R = texture2D(uPressure, boundary(vR)).x;
          float T = texture2D(uPressure, boundary(vT)).x;
          float B = texture2D(uPressure, boundary(vB)).x;

          vec2 v = texture2D(uVelocity, vUv).xy;
          v -= vec2(R - L, T - B);

          gl_FragColor = vec4(v, .0, 1.);
        }
      `
    ),
  },
};

export { particles, fluid };
