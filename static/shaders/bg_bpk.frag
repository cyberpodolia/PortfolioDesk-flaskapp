precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 centered = uv - 0.5;
    centered.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.05;
    float mouseShift = (u_mouse.x / max(u_resolution.x, 1.0) - 0.5) * 0.08;

    vec3 baseA = vec3(0.08, 0.12, 0.20);
    vec3 baseB = vec3(0.16, 0.24, 0.34);
    vec3 baseC = vec3(0.12, 0.18, 0.26);

    float flow = sin((centered.x + t) * 1.2) * 0.12 + cos((centered.y - t) * 1.4) * 0.12;
    vec3 layer1 = mix(baseA, baseB, smoothstep(-0.6, 0.6, centered.y + flow));

    float blob = noise(centered * 2.2 + vec2(t * 1.4, -t * 1.1));
    blob = smoothstep(0.25, 0.75, blob);
    vec3 layer2 = mix(layer1, baseC, blob * 0.35);

    float ripple = sin((centered.x + centered.y + t * 1.8) * 2.2) * 0.02;
    layer2 += ripple;

    float grain = hash(gl_FragCoord.xy + u_time) * 0.04;
    vec3 color = layer2 + grain;

    color += vec3(mouseShift, 0.0, -mouseShift);
    color = pow(color, vec3(0.98));

    gl_FragColor = vec4(color, 1.0);
}
