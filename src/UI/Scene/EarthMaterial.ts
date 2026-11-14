import { ShaderMaterial, SRGBColorSpace, TextureLoader, Vector3, type Texture } from 'three'

const Vertex = `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPositionWorld = world.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const Fragment = `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uSurface;
  uniform sampler2D uCoverage;
  uniform vec3 uSun;
  uniform float uCoverageOpacity;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;

  void main() {
    vec3 normal = normalize(vNormalWorld);
    vec3 view = normalize(cameraPosition - vPositionWorld);
    float sun = dot(normal, uSun);
    float daylight = smoothstep(-0.1, 0.22, sun);
    float diffuse = max(sun, 0.0);

    vec3 surface = texture2D(uSurface, vUv).rgb;
    float clouds = smoothstep(0.08, 0.85, surface.b);
    float shade = smoothstep(0.08, 0.85, texture2D(uSurface, vUv + vec2(0.004, 0.002)).b);

    vec3 ground = texture2D(uDay, vUv).rgb * (0.03 + diffuse * 1.35) * (1.0 - shade * 0.35);
    vec3 halfway = normalize(uSun + view);
    float glint = pow(max(dot(normal, halfway), 0.0), 90.0) * (1.0 - surface.g) * 2.2;
    ground += vec3(1.0, 0.94, 0.82) * glint;

    vec3 lit = mix(ground, vec3(0.03 + diffuse * 1.5), clouds);
    vec3 dark = texture2D(uNight, vUv).rgb * vec3(1.9, 1.5, 1.0) * (1.0 - clouds * 0.75) + vec3(0.004, 0.006, 0.012);
    vec3 color = mix(dark, lit, daylight);

    float dusk = smoothstep(-0.18, 0.04, sun) * (1.0 - smoothstep(0.04, 0.32, sun));
    color *= mix(vec3(1.0), vec3(1.3, 0.78, 0.5), dusk * 0.7);

    vec4 coverage = texture2D(uCoverage, vUv);
    float painted = coverage.a * uCoverageOpacity;
    color += coverage.rgb * painted * (0.09 + diffuse * 0.5);

    float rim = pow(1.0 - max(dot(normal, view), 0.0), 3.2);
    color += vec3(0.25, 0.5, 1.0) * rim * (0.05 + daylight * 0.85);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export class EarthMaterial extends ShaderMaterial {
  private readonly loaded: Texture[]

  constructor(coverage: Texture, sunDirection: Vector3) {
    const loader = new TextureLoader()
    const load = (name: string, colour: boolean): Texture => {
      const texture = loader.load(`${import.meta.env.BASE_URL}Textures/${name}`)
      if (colour) texture.colorSpace = SRGBColorSpace
      texture.anisotropy = 8
      return texture
    }
    const day = load('EarthDay.jpg', true)
    const night = load('EarthNight.jpg', true)
    const surface = load('EarthSurface.jpg', false)
    super({
      vertexShader: Vertex,
      fragmentShader: Fragment,
      uniforms: {
        uDay: { value: day },
        uNight: { value: night },
        uSurface: { value: surface },
        uCoverage: { value: coverage },
        uSun: { value: sunDirection.clone() },
        uCoverageOpacity: { value: 0.85 },
      },
    })
    this.loaded = [day, night, surface]
  }

  set sunDirection(direction: Vector3) {
    this.uniforms.uSun.value.copy(direction)
  }

  override dispose(): void {
    this.loaded.forEach((texture) => texture.dispose())
    super.dispose()
  }
}
