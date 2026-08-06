export const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_distance;
uniform float u_inclination;
uniform float u_yaw;
uniform float u_fov;
uniform float u_lensing;
uniform int u_mode;
uniform int u_quality;

const float PI = 3.14159265359;
const float M = 1.0;
const float R_H = 2.0 * M;
const float R_IN = 2.6 * M;
const float R_OUT = 12.0 * M;
const float R_SKY = 40.0 * M;

// Hash for procedural background stars
float hash3D(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

// Background starfield and galactic dust band sampled using final escaped ray direction
vec3 sampleBackground(vec3 dir) {
  vec3 nDir = normalize(dir);
  
  // Galactic plane orientation
  float galPlane = dot(nDir, normalize(vec3(0.25, 0.94, 0.22)));
  float dustWidth = exp(-galPlane * galPlane * 22.0);
  
  // Procedural star field
  vec3 grid = floor(nDir * 180.0);
  float n = hash3D(grid);
  vec3 stars = vec3(0.0);
  
  if (n > 0.976) {
    float starIntensity = pow((n - 0.976) / 0.024, 4.5);
    vec3 starColor = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.85, 0.6), hash3D(grid + 1.0));
    stars = starColor * starIntensity * 1.8;
  }

  // Galactic dust band background glow
  vec3 dustColor = mix(vec3(0.03, 0.05, 0.10), vec3(0.20, 0.12, 0.06), hash3D(floor(nDir * 24.0)) * 0.5 + 0.5);
  vec3 dust = dustColor * dustWidth * 0.9;
  
  return stars + dust;
}

// Blackbody / temperature to RGB mapping for glowing plasma
vec3 blackbodyColor(float temp) {
  vec3 colAmber = vec3(0.96, 0.44, 0.08);
  vec3 colGold  = vec3(1.0, 0.78, 0.34);
  vec3 colWhite = vec3(1.0, 0.97, 0.90);
  vec3 colBlue  = vec3(0.80, 0.92, 1.0);

  if (temp < 0.3) {
    return mix(colAmber, colGold, temp / 0.3);
  } else if (temp < 0.75) {
    return mix(colGold, colWhite, (temp - 0.3) / 0.45);
  } else {
    return mix(colWhite, colBlue, (temp - 0.75) / 0.25);
  }
}

// Procedural Keplerian accretion disk noise and advecting filaments
float diskNoise(float phi, float r, float time) {
  float omega = sqrt(M / (r * r * r));
  float angle = phi - omega * time * 1.3;
  
  float f1 = sin(angle * 16.0 + r * 2.8);
  float f2 = sin(angle * 32.0 - r * 6.5 + f1 * 1.5);
  float f3 = sin(angle * 56.0 + r * 14.0 + f2 * 0.8);
  
  float turb = (f1 * 0.5 + f2 * 0.3 + f3 * 0.2) * 0.5 + 0.5;
  return pow(turb, 1.25);
}

// Compute accretion disk color and opacity at intersection
vec4 sampleDisk(float r, float phi, vec3 rayDir, float time, int mode) {
  if (r < R_IN || r > R_OUT) {
    return vec4(0.0);
  }

  // Radial density profile
  float normR = (r - R_IN) / (R_OUT - R_IN);
  float radialProfile = sin(normR * PI);
  radialProfile = pow(radialProfile, 0.85);

  // Filament striations
  float striations = diskNoise(phi, r, time);
  float density = radialProfile * (0.65 + 0.35 * striations);

  // Keplerian orbital velocity v = sqrt(M / r)
  float v = sqrt(M / r);
  vec3 vel = vec3(-sin(phi), 0.0, cos(phi)) * v;
  
  // Line of sight velocity: dot(vel, -rayDir)
  float v_los = dot(vel, -rayDir);

  // Relativistic Doppler shift factor
  float gamma = 1.0 / sqrt(max(0.001, 1.0 - v * v));
  float doppler = 1.0 / (gamma * (1.0 - v_los));

  // Beaming power based on visual mode
  float beamingPower = (mode == 1) ? 3.5 : 1.5;
  float intensity = density * pow(doppler, beamingPower);

  // Temperature distribution
  float baseTemp = pow(1.0 - normR, 0.65);
  float shiftedTemp = clamp(baseTemp * ((mode == 1) ? doppler : 1.0), 0.0, 1.0);

  vec3 rgb = blackbodyColor(shiftedTemp) * intensity * 1.8;
  float alpha = clamp(density * 0.88, 0.0, 0.98);

  return vec4(rgb, alpha);
}

// Schwarzschild geodesic acceleration equation in 3D cartesian coordinates
// d^2 x / dlambda^2 = - u_lensing * (3 * M * L^2 / r^5) * x
vec3 calculateAccel(vec3 pos, vec3 vel) {
  float r2 = dot(pos, pos);
  float r = sqrt(r2);
  if (r < 0.1) return vec3(0.0);

  vec3 L = cross(pos, vel);
  float L2 = dot(L, L);
  
  float factor = u_lensing * (3.0 * M * L2) / (r2 * r2 * r);
  return -factor * pos;
}

void main() {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 uv = (v_uv - 0.5) * aspect * 2.0;

  // Camera setup
  float dist = max(5.0, u_distance);
  float inc = u_inclination;
  float yaw = u_yaw;

  vec3 ro = vec3(
    dist * cos(inc) * sin(yaw),
    dist * sin(inc),
    -dist * cos(inc) * cos(yaw)
  );

  vec3 target = vec3(0.0, 0.0, 0.0);
  vec3 ww = normalize(target - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);

  float halfTan = tan(radians(u_fov) * 0.5);
  vec3 rd = normalize(uv.x * halfTan * uu + uv.y * halfTan * vv + ww);

  // Calculate photon impact parameter b = |ro x rd|
  vec3 L0 = cross(ro, rd);
  float b = length(L0);

  // Critical impact parameter for Schwarzschild shadow capture
  float b_crit_gr = (3.0 * sqrt(3.0) * M) / sqrt(max(0.01, 1.0 - 2.0 * M / dist));
  float b_crit_flat = R_H;
  float b_crit = mix(b_crit_flat, b_crit_gr, u_lensing);

  // Shadow Core & Photon Ring Region
  if (b < b_crit * 0.985) {
    float ringEdge = b_crit * 0.985;
    float ringDist = (ringEdge - b) / (0.04 * b_crit);
    
    if (ringDist >= 0.0 && ringDist < 1.0) {
      // Fine photon-ring highlight at the shadow boundary
      float ringAlpha = pow(1.0 - ringDist, 4.0);
      vec3 ringColor = vec3(1.0, 0.92, 0.78) * ringAlpha * 2.8;
      fragColor = vec4(ringColor, 1.0);
      return;
    }
    
    // Pure black shadow center inside event horizon
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Ray marching / Geodesic Integration state
  vec3 pos = ro;
  vec3 vel = rd;

  vec3 accumColor = vec3(0.0);
  float accumAlpha = 0.0;

  // Maximum integration steps based on quality setting
  int maxSteps = (u_quality == 2) ? 80 : ((u_quality == 1) ? 60 : 40);

  for (int step = 0; step < 80; ++step) {
    if (step >= maxSteps) break;

    float r = length(pos);

    // Event Horizon fallback check
    if (r <= R_H * 1.002) {
      accumAlpha = 1.0;
      break;
    }

    // Adaptive step size based on distance from mass
    float h = clamp(0.04 * r, 0.04, 0.5);

    // RK4 Integration for geodesic step pos, vel -> pos_next, vel_next
    vec3 k1_v = calculateAccel(pos, vel);
    vec3 k1_x = vel;

    vec3 pos2 = pos + 0.5 * h * k1_x;
    vec3 vel2 = vel + 0.5 * h * k1_v;
    vec3 k2_v = calculateAccel(pos2, vel2);
    vec3 k2_x = vel2;

    vec3 pos3 = pos + 0.5 * h * k2_x;
    vec3 vel3 = vel + 0.5 * h * k2_v;
    vec3 k3_v = calculateAccel(pos3, vel3);
    vec3 k3_x = vel3;

    vec3 pos4 = pos + h * k3_x;
    vec3 vel4 = vel + h * k3_v;
    vec3 k4_v = calculateAccel(pos4, vel4);
    vec3 k4_x = vel4;

    vec3 pos_next = pos + (h / 6.0) * (k1_x + 2.0 * k2_x + 2.0 * k3_x + k4_x);
    vec3 vel_next = vel + (h / 6.0) * (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v);

    // Accretion disk equatorial plane crossing check (y = 0)
    if (pos.y * pos_next.y <= 0.0 && abs(pos.y - pos_next.y) > 0.0001) {
      float t = abs(pos.y) / (abs(pos.y) + abs(pos_next.y));
      vec3 pCross = mix(pos, pos_next, t);
      vec3 vCross = normalize(mix(vel, vel_next, t));

      float rCross = length(pCross.xz);
      float phiCross = atan(pCross.z, pCross.x);

      vec4 diskSample = sampleDisk(rCross, phiCross, vCross, u_time, u_mode);
      if (diskSample.a > 0.0) {
        accumColor += (1.0 - accumAlpha) * diskSample.rgb;
        accumAlpha += (1.0 - accumAlpha) * diskSample.a;
        if (accumAlpha >= 0.96) break;
      }
    }

    // Advance state
    pos = pos_next;
    vel = vel_next;

    // Escaped ray check
    if (r > R_SKY) {
      vec3 skyColor = sampleBackground(vel);
      accumColor += (1.0 - accumAlpha) * skyColor;
      accumAlpha = 1.0;
      break;
    }
  }

  // If ray did not hit horizon or sky within max steps, sample sky with current direction
  if (accumAlpha < 1.0) {
    vec3 skyColor = sampleBackground(vel);
    accumColor += (1.0 - accumAlpha) * skyColor;
  }

  fragColor = vec4(accumColor, 1.0);
}
`;
