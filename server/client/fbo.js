import { gl, canvas, texture } from "./context.js";

const { halfFloat, width, height } = texture;

function createFBO(param, w = width, h = height) {
  gl.activeTexture(gl.TEXTURE0);
  const texture = gl.createTexture(), fbo = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, halfFloat, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, width, height);

  return {
    fbo,
    bind(i = 0) { 
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return i;
    }
  }
}

function createDoubleFBO(param, w, h) {
  let fbo1 = createFBO(param, w, h), fbo2 = createFBO(param, w, h);

  return {
    get src() {
      return fbo1;
    },
    get dst() {
      return fbo2;
    },
    swap: () => { [fbo1, fbo2] = [fbo2, fbo1] },
  };
}

export default {
  particles: createDoubleFBO(gl.LINEAR, canvas.width, canvas.height),
  density: createDoubleFBO(gl.LINEAR),
  velocity: createDoubleFBO(gl.LINEAR),
  divergence: createFBO(gl.NEAREST),
  curl: createFBO(gl.NEAREST),
  pressure: createDoubleFBO(gl.NEAREST),
}