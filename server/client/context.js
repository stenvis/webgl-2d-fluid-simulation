const paramaters = {
  alpha: false,
  preserveDrawingBuffer: false,
  depth: false,
  stencil: false,
  antialias: false,
};

const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl", paramaters);

gl.getExtension("OES_texture_half_float");
gl.getExtension("OES_texture_half_float_linear");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const texture = {
    halfFloat: gl.getExtension("OES_texture_half_float").HALF_FLOAT_OES,
    width: gl.drawingBufferWidth >> 1,
    height: gl.drawingBufferHeight >> 1,
};

export { gl, canvas, texture };