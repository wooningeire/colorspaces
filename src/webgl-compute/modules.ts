import { WebglModule } from "./WebglVariables"

const bradford = new WebglModule(`const mat3 bradford = transpose(mat3(
  0.8951,  0.2664, -0.1614,
 -0.7502,  1.7135,  0.0367,
  0.0389, -0.0685,  1.0296
));`);
const illuminant2_D65 = new WebglModule(`const vec2 illuminant2_D65 = vec2(0.31270, 0.32900);`);
const illuminant2_E = new WebglModule(`const vec2 illuminant2_E = vec2(1./3., 1./3.);`);

export const webglModules = {
  bradford,
  illuminant2_D65,
  illuminant2_E,
};