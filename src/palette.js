export const C = {
  haze: 0xe3ead8,
  lowland: 0xcfddb6,
  meadow: 0xd8dcae,
  ochre: 0xe2d7a6,
  sand: 0xd6c48f,
  tan: 0xcdb27c,
  umber: 0xbfa06e,
  peak: 0xf3efe4,
  contour: 0x8c6239,
  magenta: 0xb5237e,
  blue: 0x1f5aa6,
  ink: 0x263238,
  slate: 0x37474f,
  water: 0xa9c9e3,
  cloud: 0xfafaf6,
  shadow: 0x6c7a86,
  forest: 0x8fa878,
  steel: 0xb9c3cb,
  white: 0xffffff
};

export const HYPSO = [C.lowland, C.meadow, C.ochre, C.sand, C.tan, C.umber, C.peak];

export const hex = (n) => '#' + n.toString(16).padStart(6, '0');
