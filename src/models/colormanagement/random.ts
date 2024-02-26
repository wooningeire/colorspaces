const hashInt = (x: number) => {
  x += x << 10;
  x ^= x >> 6;
  x += x << 3;
  x ^= x >> 11;
  x += x << 15;
  return x;
};

const constructFloat = (int: number) => {
  const dataView = new DataView(new ArrayBuffer(4));
  dataView.setUint32(0, (int & 0x007FFFFF) | 0x3F800000);
  return dataView.getFloat32(0) - 1.
};

export const randFloat = (seed: number) => {
  const dataView = new DataView(new ArrayBuffer(4));
  dataView.setFloat32(0, seed);
  return constructFloat(hashInt(dataView.getUint32(0)));
};

export const webglRandomDeclarations = `//#region https://stackoverflow.com/a/17479300
uint hash(uint x) {
  x += (x << 10u);
  x ^= (x >> 6u);
  x += (x << 3u);
  x ^= (x >> 11u);
  x += (x << 15u);
  return x;
}
uint hash(uvec2 v) { return hash( v.x ^ hash(v.y)                         ); }
uint hash(uvec3 v) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
uint hash(uvec4 v) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }
float constructFloat(uint integer) {
  // Keep only mantissa bits (fractional part) then add fraction to 1
  return uintBitsToFloat((integer & 0x007FFFFFu) | 0x3F800000u) - 1.;
}
float random(float x) { return constructFloat(hash(floatBitsToUint(x))); }
float random(vec2  v) { return constructFloat(hash(floatBitsToUint(v))); }
float random(vec3  v) { return constructFloat(hash(floatBitsToUint(v))); }
float random(vec4  v) { return constructFloat(hash(floatBitsToUint(v))); }
//#endregion`;