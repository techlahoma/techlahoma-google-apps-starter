import {FRAGMENT_SHADER, VERTEX_SHADER} from './shaders.js';
import type {RenderState} from './types.js';

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;

  private uniformLocations: {
    u_resolution: WebGLUniformLocation | null;
    u_time: WebGLUniformLocation | null;
    u_distance: WebGLUniformLocation | null;
    u_inclination: WebGLUniformLocation | null;
    u_yaw: WebGLUniformLocation | null;
    u_fov: WebGLUniformLocation | null;
    u_lensing: WebGLUniformLocation | null;
    u_mode: WebGLUniformLocation | null;
    u_quality: WebGLUniformLocation | null;
  };

  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;

  private frameCount = 0;
  private lastFpsCalcTime = 0;
  private fps = 60;
  private frameTimeMs = 16.6;
  private isContextLost = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Needed for screenshot verification
    });

    if (!gl) {
      throw new Error('WebGL2 is not supported in this browser environment.');
    }

    this.gl = gl;
    this.resize();
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);

    this.gl.useProgram(this.program);

    this.uniformLocations = {
      u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      u_time: gl.getUniformLocation(this.program, 'u_time'),
      u_distance: gl.getUniformLocation(this.program, 'u_distance'),
      u_inclination: gl.getUniformLocation(this.program, 'u_inclination'),
      u_yaw: gl.getUniformLocation(this.program, 'u_yaw'),
      u_fov: gl.getUniformLocation(this.program, 'u_fov'),
      u_lensing: gl.getUniformLocation(this.program, 'u_lensing'),
      u_mode: gl.getUniformLocation(this.program, 'u_mode'),
      u_quality: gl.getUniformLocation(this.program, 'u_quality'),
    };

    this.setupQuad();

    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      this.isContextLost = true;
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this.isContextLost = false;
      this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
      this.setupQuad();
    });
  }

  private createShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string,
  ): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create WebGL shader.');

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }

    return shader;
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl;
    const vert = this.createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = this.createShader(gl, gl.FRAGMENT_SHADER, fragSrc);

    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create WebGL program.');

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`Program link error: ${info}`);
    }

    gl.deleteShader(vert);
    gl.deleteShader(frag);

    return program;
  }

  private setupQuad(): void {
    const gl = this.gl;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  public resize(): void {
    const width = window.innerWidth || this.canvas.clientWidth || 1440;
    const height = window.innerHeight || this.canvas.clientHeight || 900;

    // Cap devicePixelRatio to 2.0 to preserve high frame rates on high DPI screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const targetW = Math.floor(width * dpr);
    const targetH = Math.floor(height * dpr);

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
  }

  public render(state: RenderState): void {
    if (this.isContextLost) return;

    const startTime = performance.now();
    const gl = this.gl;

    this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Uniform updates
    if (this.uniformLocations.u_resolution) {
      gl.uniform2f(
        this.uniformLocations.u_resolution,
        this.canvas.width,
        this.canvas.height,
      );
    }
    if (this.uniformLocations.u_time) {
      gl.uniform1f(this.uniformLocations.u_time, state.time);
    }
    if (this.uniformLocations.u_distance) {
      gl.uniform1f(this.uniformLocations.u_distance, state.camera.distance);
    }
    if (this.uniformLocations.u_inclination) {
      gl.uniform1f(
        this.uniformLocations.u_inclination,
        state.camera.inclination,
      );
    }
    if (this.uniformLocations.u_yaw) {
      gl.uniform1f(this.uniformLocations.u_yaw, state.camera.yaw);
    }
    if (this.uniformLocations.u_fov) {
      gl.uniform1f(this.uniformLocations.u_fov, state.camera.fov);
    }
    if (this.uniformLocations.u_lensing) {
      gl.uniform1f(this.uniformLocations.u_lensing, state.lensing);
    }
    if (this.uniformLocations.u_mode) {
      gl.uniform1i(
        this.uniformLocations.u_mode,
        state.mode === 'physical' ? 1 : 0,
      );
    }
    if (this.uniformLocations.u_quality) {
      const qVal =
        state.quality === 'high' ? 2 : state.quality === 'medium' ? 1 : 0;
      gl.uniform1i(this.uniformLocations.u_quality, qVal);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    // Performance tracking
    const endTime = performance.now();
    const dt = endTime - startTime;
    this.frameTimeMs = this.frameTimeMs * 0.9 + dt * 0.1;

    this.frameCount++;
    if (startTime - this.lastFpsCalcTime >= 1000) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (startTime - this.lastFpsCalcTime),
      );
      this.frameCount = 0;
      this.lastFpsCalcTime = startTime;
    }
  }

  public getPerformanceStats(): {
    fps: number;
    frameTimeMs: number;
    renderWidth: number;
    renderHeight: number;
  } {
    return {
      fps: this.fps,
      frameTimeMs: Math.round(this.frameTimeMs * 10) / 10,
      renderWidth: this.canvas.width,
      renderHeight: this.canvas.height,
    };
  }

  public destroy(): void {
    const gl = this.gl;
    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
  }
}
