import { AdditiveBlending, ShaderMaterial, Vector3 } from 'three'

const Vertex = `
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPositionWorld = world.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const Fragment = `
  uniform vec3 uSun;
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  void main() {
    vec3 normal = normalize(vNormalWorld);
    vec3 view = normalize(cameraPosition - vPositionWorld);
    float facing = max(dot(normal, view), 0.0);
    float limb = pow(1.0 - facing, 5.0) * smoothstep(0.0, 0.2, facing);
    float daylight = smoothstep(-0.3, 0.25, dot(normal, uSun));
    vec3 color = mix(vec3(0.95, 0.5, 0.25), vec3(0.3, 0.58, 1.0), smoothstep(0.0, 0.5, daylight));
    gl_FragColor = vec4(color * limb * (0.04 + daylight) * 3.2, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export class AtmosphereMaterial extends ShaderMaterial {
  constructor(sunDirection: Vector3) {
    super({
      vertexShader: Vertex,
      fragmentShader: Fragment,
      uniforms: { uSun: { value: sunDirection.clone() } },
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  }
}
