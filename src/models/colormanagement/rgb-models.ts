import {REV, Vec3, clamp, mod} from "@/util";

export const cmyToRgb = (vec: Vec3): Vec3 => vec.map(comp => 1 - comp) as Vec3;
export const rgbToCmy = cmyToRgb;

export const hslToRgb = ([hue, sat, lightness]: Vec3): Vec3 => {
  if (sat === 0) return [lightness, lightness, lightness];

  const rgbCompDistribFromHue = (p: number, q: number, hue: number) => {
    hue = mod(hue, 1);

    if (hue < 1/6) return p + (q - p) * 6 * hue;
    if (hue < 3/6) return q;
    if (hue < 4/6) return p + (q - p) * (2/3 - hue) * 6;
    return p;
  };

  const q = lightness < 0.5
      ? lightness * (1 + sat)
      : lightness * (1 - sat) + sat;
  const p = 2 * lightness - q;

  return [
    rgbCompDistribFromHue(p, q, hue + 1/3),
    rgbCompDistribFromHue(p, q, hue),
    rgbCompDistribFromHue(p, q, hue - 1/3),
  ];
};

export const rgbToHsl = ([red, green, blue]: Vec3): Vec3 => {
  // red = clamp(red, 0, 1);
  // green = clamp(green, 0, 1);
  // blue = clamp(blue, 0, 1);

  const componentMax = Math.max(red, green, blue);
  const componentMin = Math.min(red, green, blue);
  const componentRange = componentMax - componentMin;

  let hue: number;
  if (componentRange === 0) {
    hue = 0;
  } else if (componentMax === red) {
    hue = mod((green - blue) / componentRange, 6);
  } else if (componentMax === green) {
    hue = (blue - red) / componentRange + 2;
  } else {
    hue = (red - green) / componentRange + 4;
  }

  const lightness = (componentMin + componentMax) / 2;

  return [
    hue / 6,
    componentRange === 0
        ? 0
        : componentRange / (1 - Math.abs(2 * lightness - 1)),
    lightness,
  ];
};

export const hsvToRgb = ([hue, sat, value]: Vec3): Vec3 => {
  hue = mod(hue, 1) * 6;
  const segmentStart = Math.floor(hue);

  const plateau = value;
  const valley = value * (1 - sat);
  const falling = value * (1 - sat * (hue - segmentStart));
  const rising = value * (1 - sat * (1 - (hue - segmentStart)));

  if      (hue < 1) return [plateau, rising,  valley];
  else if (hue < 2) return [falling, plateau, valley];
  else if (hue < 3) return [valley,  plateau, rising];
  else if (hue < 4) return [valley,  falling, plateau];
  else if (hue < 5) return [rising,  valley,  plateau];
  else              return [plateau, valley,  falling];
};

export const rgbToHsv = ([red, green, blue]: Vec3): Vec3 => {
  // red = clamp(red, 0, 1);
  // green = clamp(green, 0, 1);
  // blue = clamp(blue, 0, 1);

  const componentMax = Math.max(red, green, blue);
  const componentMin = Math.min(red, green, blue);
  const componentRange = componentMax - componentMin;

  let hue: number;
  if (componentRange === 0) {
    hue = 0;
  } else if (componentMax === red) {
    hue = mod((green - blue) / componentRange, 6);
  } else if (componentMax === green) {
    hue = (blue - red) / componentRange + 2;
  } else {
    hue = (red - green) / componentRange + 4;
  }

  return [
    hue / 6,
    componentRange === 0
        ? 0
        : componentRange / componentMax,
    componentMax,
  ];
};

export const hwbToRgb = ([hue, whiteness, blackness]: Vec3): Vec3 => {
  const scaledWhiteness = whiteness / Math.max(1, whiteness + blackness);
  const scaledBlackness = blackness / Math.max(1, whiteness + blackness);

  return hsvToRgb([
    hue,
    1 - scaledWhiteness / (1 - scaledBlackness),
    1 - scaledBlackness,
  ]);
};

export const rgbToHwb = ([red, green, blue]: Vec3): Vec3 => {
  // red = clamp(red, 0, 1);
  // green = clamp(green, 0, 1);
  // blue = clamp(blue, 0, 1);
  
  const hsv = rgbToHsv([red, green, blue]);
  
  return [
    hsv[0],
    (1 - hsv[1]) * hsv[2],
    1 - hsv[2],
  ];
};

//http://www.rmuti.ac.th/user/kedkarn/impfile/RGB_to_HSI.pdf
export const hsiToRgb = ([hue, sat, intensity]: Vec3): Vec3 => {
  let hueRad = mod(hue, 1) * REV;

  const x = intensity * (1 - sat);

  if (hue < 1 / 3) {
    const y = intensity * (1 + sat * Math.cos(hueRad) / Math.cos(Math.PI / 3 - hueRad));
    const z = 3 * intensity - x - y;
    
    return [y, z, x];
  } else if (hue < 2 / 3) {
    hueRad -= Math.PI * 2 / 3;
    const y = intensity * (1 + sat * Math.cos(hueRad) / Math.cos(Math.PI / 3 - hueRad));
    const z = 3 * intensity - x - y;

    return [x, y, z];
  } else {
    hueRad -= Math.PI * 4 / 3;
    const y = intensity * (1 + sat * Math.cos(hueRad) / Math.cos(Math.PI / 3 - hueRad));
    const z = 3 * intensity - x - y;

    return [z, x, y];
  }
};

export const rgbToHsi = ([red, green, blue]: Vec3): Vec3 => {
  const rgbSum = red + green + blue;
  if (rgbSum === 0) {
    return [0, 0, 0];
  }

  const r = red / rgbSum;
  const g = green / rgbSum;
  const b = blue / rgbSum;

  const denominator = (r - g)**2 + (r - b) * (g - b);

  let hue;
  if (denominator === 0) {
    hue = 0;
  } else {
    hue = Math.acos(0.5 * ((r - g) + (r - b)) / Math.sqrt(denominator)) / REV;
    if (b > g) {
      hue = 1 - hue;
    }
  }

  return [
    hue,
    1 - 3 * Math.min(r, g, b),
    rgbSum / 3,
  ];
};

//#region WebGL
export const webglRgbDeclarations = `float rgbCompDistribFromHue(float p, float q, float hue) {
  hue = mod(hue, 1.);

  if (hue < 1./6.) return p + (q - p) * 6. * hue;
  if (hue < 3./6.) return q;
  if (hue < 4./6.) return p + (q - p) * (2./3. - hue) * 6.;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  float hue = hsl.x;
  float sat = hsl.y;
  float lightness = hsl.z;

  if (sat == 0.) {
    return vec3(lightness, lightness, lightness);
  }

  float q = lightness < 0.5
      ? lightness * (1. + sat)
      : lightness * (1. - sat) + sat;
  float p = 2. * lightness - q;

  return vec3(
    rgbCompDistribFromHue(p, q, hue + 1./3.),
    rgbCompDistribFromHue(p, q, hue),
    rgbCompDistribFromHue(p, q, hue - 1./3.)
  );
}

vec3 rgbToHsl(vec3 rgb) {
  float componentMax = max(max(rgb.r, rgb.g), rgb.b);
  float componentMin = min(min(rgb.r, rgb.g), rgb.b);
  float componentRange = componentMax - componentMin;

  float hue;
  if (componentRange == 0.) {
    hue = 0.;
  } else if (componentMax == rgb.r) {
    hue = mod((rgb.g - rgb.b) / componentRange, 6.);
  } else if (componentMax == rgb.g) {
    hue = (rgb.b - rgb.r) / componentRange + 2.;
  } else {
    hue = (rgb.r - rgb.g) / componentRange + 4.;
  }

  float lightness = (componentMin + componentMax) / 2.;

  return vec3(
    hue / 6.,
    componentRange == 0.
        ? 0.
        : componentRange / (1. - abs(2. * lightness - 1.)),
    lightness
  );
}

vec3 hsvToRgb(vec3 hsv) {
  float hue = hsv.x;
  float sat = hsv.y;
  float value = hsv.z;

  hue = mod(hue, 1.) * 6.;
  float segmentStart = floor(hue);

  float plateau = value;
  float valley = value * (1. - sat);
  float falling = value * (1. - sat * (hue - segmentStart));
  float rising = value * (1. - sat * (1. - (hue - segmentStart)));

  if      (hue < 1.) return vec3(plateau, rising,  valley);
  else if (hue < 2.) return vec3(falling, plateau, valley);
  else if (hue < 3.) return vec3(valley,  plateau, rising);
  else if (hue < 4.) return vec3(valley,  falling, plateau);
  else if (hue < 5.) return vec3(rising,  valley,  plateau);
  else               return vec3(plateau, valley,  falling);
}

vec3 rgbToHsv(vec3 rgb) {
  float componentMax = max(max(rgb.r, rgb.g), rgb.b);
  float componentMin = min(min(rgb.r, rgb.g), rgb.b);
  float componentRange = componentMax - componentMin;

  float hue;
  if (componentRange == 0.) {
    hue = 0.;
  } else if (componentMax == rgb.r) {
    hue = mod((rgb.g - rgb.b) / componentRange, 6.);
  } else if (componentMax == rgb.g) {
    hue = (rgb.b - rgb.r) / componentRange + 2.;
  } else {
    hue = (rgb.r - rgb.g) / componentRange + 4.;
  }

  return vec3(
    hue / 6.,
    componentRange == 0.
        ? 0.
        : componentRange / componentMax,
    componentMax
  );
}

vec3 hwbToRgb(vec3 hwb) {
  float hue = hwb.x;
  float whiteness = hwb.y;
  float blackness = hwb.z;

  float scaledWhiteness = whiteness / max(1., whiteness + blackness);
  float scaledBlackness = blackness / max(1., whiteness + blackness);

  return hsvToRgb(vec3(
    hue,
    1. - scaledWhiteness / (1. - scaledBlackness),
    1. - scaledBlackness
  ));
}

vec3 rgbToHwb(vec3 rgb) {
  vec3 hsv = rgbToHsv(rgb);
  
  return vec3(
    hsv.x,
    (1. - hsv.y) * hsv.z,
    1. - hsv.z
  );
}

vec3 cmyToRgb(vec3 cmy) {
  return 1. - cmy;
}
vec3 rgbToCmy(vec3 rgb) {
  return 1. - rgb;
}

vec3 hsiToRgb(vec3 hsi) {
  float hueRad = mod(hsi.x, 1.) * REV;

  float x = hsi.z * (1. - hsi.y);

  if (hsi.x < 1. / 3.) {
    float y = hsi.z * (1. + hsi.y * cos(hueRad) / cos(PI / 3. - hueRad));
    float z = 3. * hsi.z - x - y;

    return vec3(y, z, x);
  } else if (hsi.x < 2. / 3.) {
    hueRad -= PI * 2. / 3.;
    float y = hsi.z * (1. + hsi.y * cos(hueRad) / cos(PI / 3. - hueRad));
    float z = 3. * hsi.z - x - y;

    return vec3(x, y, z);
  } else {
    hueRad -= PI * 4. / 3.;
    float y = hsi.z * (1. + hsi.y * cos(hueRad) / cos(PI / 3. - hueRad));
    float z = 3. * hsi.z - x - y;

    return vec3(z, x, y);
  }
}

vec3 rgbToHsi(vec3 rgb) {
  float rgbSum = rgb.r + rgb.g + rgb.b;
  if (rgbSum == 0.) {
    return vec3(0., 0., 0.);
  }

  float r = rgb.r / rgbSum;
  float g = rgb.g / rgbSum;
  float b = rgb.b / rgbSum;


  float denominator = (r - g) * (r - g) + (r - b) * (g - b);

  float hue;
  if (denominator == 0.) {
    hue = 0.;
  } else {
    hue = acos(0.5 * ((r - g) + (r - b)) / sqrt(denominator)) / REV;
    if (b > g) {
      hue = 1. - hue;
    }
  }

  return vec3(
    hue,
    1. - 3. * min(min(r, g), b),
    rgbSum / 3.
  );
}`;
//#endregion