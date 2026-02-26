#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

#define T u_time

vec3 pathAt(float z) {
    return vec3(cos(z * 0.1) * 8.0, cos(z * 0.325) * 2.0 - 28.0, z);
}

mat2 foldRot(float a) {
    // Equivalent to mat2(cos(a + vec4(0,33,11,0))) in WebGL1-safe form.
    return mat2(
        cos(a + 0.0),
        cos(a + 33.0),
        cos(a + 11.0),
        cos(a + 0.0)
    );
}

float tunnel(vec3 p) {
    p = abs(p - pathAt(p.z));
    return 0.3 - abs(max(p.x, p.y));
}

float boxCell(vec3 p, float cell) {
    p = abs(fract(p / cell) * cell - cell * 0.5) - cell * 0.05;
    return min(p.x, min(p.y, p.z));
}

float boxen(vec3 p) {
    float d = -1e9;
    float cell = 10.0;

    // WebGL1 compilers are more reliable with fixed-count loops.
    for (int n = 0; n < 16; n++) {
        if (cell <= 0.15) {
            break;
        }
        p.xz = foldRot(cell) * p.xz;
        d = max(d, boxCell(p, cell));
        cell *= 0.201;
    }
    return d;
}

float map(vec3 p) {
    float ground = 4.0 * dot(sin(p / 3.0), vec3(0.3)) - 18.0 - p.y;
    return min(ground, max(tunnel(p), boxen(p)));
}

float AO(vec3 pos, vec3 nor) {
    float sca = 2.0;
    float occ = 0.0;
    for (int i = 0; i < 5; i++) {
        float hr = 0.01 + float(i) * 0.5 / 4.0;
        float dd = map(nor * hr + pos);
        occ += (hr - dd) * sca;
        sca *= 0.7;
    }
    return clamp(1.0 - occ, 0.0, 1.0);
}

vec4 tanhApprox(vec4 x) {
    vec4 xc = clamp(x, vec4(-10.0), vec4(10.0));
    vec4 e = exp(-2.0 * xc);
    return (1.0 - e) / (1.0 + e);
}

void mainImage(out vec4 o, in vec2 fragCoord) {
    vec2 u = (fragCoord + fragCoord - u_resolution.xy) / max(u_resolution.y, 1.0);
    u.yx -= 0.3;

    vec3 e = vec3(0.001, 0.0, 0.0);
    vec3 p = pathAt(T);
    vec3 Z = normalize(pathAt(T + 6.0) - p);
    vec3 X = normalize(vec3(Z.z, 0.0, -Z.x));
    vec3 localDir = vec3(foldRot(sin(T * 0.2) * 0.8) * u, 1.0);
    mat3 camBasis = mat3(-X, cross(X, Z), Z);
    vec3 D = normalize(camBasis * localDir);

    float s = 0.0;
    o = vec4(0.0);

    for (int step = 0; step < 100; step++) {
        p += D * s * 0.8;
        s = map(p);
        o += vec4(s);
    }

    vec3 n = normalize(
        map(p) - vec3(
            map(p - e.xyy),
            map(p - e.yxy),
            map(p - e.yyx)
        )
    );

    o *= AO(p, n);
    o = tanhApprox(o * 0.1);
}

void main() {
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    gl_FragColor = color;
}
