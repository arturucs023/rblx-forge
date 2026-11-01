// Índice máquina-legible de references/ — DERIVADO de docs/REFERENCE_LIBRARY.md
// (fuente de verdad). No duplica imágenes: apunta a ../references/<archivo>.
// Si el doc cambia, este índice debe regenerarse a mano (documentado).
export interface RefItem {
  file: string; // relativo a references/
  category: string;
  source: string;
  author: string;
  license: string;
  description: string;
  tags: string[];
}

export const REFERENCES: RefItem[] = [
  { file: 'architecture/medieval-carcassonne-walls.jpg', category: 'Arquitectura', source: 'https://commons.wikimedia.org/wiki/File:Carcassonne,_France,_view_of_the_walls_of_the_medieval_city..JPG', author: 'H2k4', license: 'CC BY-SA 3.0', description: 'Murallas y torres medievales de ciudad fortificada.', tags: ['castle-town', 'stone-walls', 'towers'] },
  { file: 'architecture/medieval-carcassonne-river.jpg', category: 'Arquitectura', source: 'https://commons.wikimedia.org/wiki/File:Carcassonne_JPG01.jpg', author: 'Jean-Pol GRANDMONT', license: 'CC BY 3.0', description: 'Ciudad medieval sobre río con puente de piedra.', tags: ['layout', 'composition', 'bridge'] },
  { file: 'buildings/modern-angular-concrete.jpg', category: 'Edificios', source: 'https://commons.wikimedia.org/wiki/File:Modern_architecture_(Unsplash).jpg', author: 'Mihail Ribkin', license: 'CC0', description: 'Hormigón angular, luz y sombra duras para fachadas sci-fi.', tags: ['sci-fi', 'facade', 'paneling'] },
  { file: 'buildings/windsor-castle-fortress.jpg', category: 'Edificios', source: 'https://commons.wikimedia.org/wiki/File:Windsor_Castle_fortress.jpg', author: 'Accord14', license: 'CC BY-SA 4.0', description: 'Puerta y almenas de fortaleza de piedra.', tags: ['castle', 'massing', 'gatehouse'] },
  { file: 'interiors/cozy-cabin-living-room.jpg', category: 'Interiores', source: 'https://commons.wikimedia.org/wiki/File:Cozy_cabin_living_room_with_wooden_interior.jpg', author: 'Shixart1985', license: 'CC BY 2.0', description: 'Cabaña de madera con luz diurna.', tags: ['cozy', 'wood', 'staging'] },
  { file: 'interiors/industrial-museum-hall.jpg', category: 'Interiores', source: 'https://commons.wikimedia.org/wiki/File:Interior_of_China_Industrial_Museum_in_Shenyang.jpg', author: 'Pauloleong2002', license: 'CC BY-SA 4.0', description: 'Nave industrial con cerchas de acero.', tags: ['factory', 'scale', 'steel'] },
  { file: 'lighting/neon-tokyo-street.jpg', category: 'Iluminación', source: 'https://commons.wikimedia.org/wiki/File:Neon-street-in-Tokyo-Japan.jpg', author: 'Acediscovery', license: 'CC BY 4.0', description: 'Calle nocturna densa en neones.', tags: ['cyberpunk', 'night', 'signage'] },
  { file: 'lighting/volumetric-sunbeam-han.jpg', category: 'Iluminación', source: 'https://commons.wikimedia.org/wiki/File:Light_beam_at_Karg%C4%B1_Han,_April_2024_01.jpg', author: 'Calistemon', license: 'CC BY-SA 4.0', description: 'Rayo de sol en sala oscura de piedra.', tags: ['god-rays', 'volumetric', 'dungeon'] },
  { file: 'terrain/mountain-ridge-hood.jpg', category: 'Terrenos', source: 'https://commons.wikimedia.org/wiki/File:Mountain_Landscape_(Unsplash).jpg', author: 'Mike Dewey', license: 'CC0', description: 'Cresta montañosa lejana para siluetas.', tags: ['silhouette', 'backdrop', 'profile'] },
  { file: 'terrain/desert-dunes.jpg', category: 'Terrenos', source: 'https://commons.wikimedia.org/wiki/File:Desert_dunes.jpg', author: 'Wikigab', license: 'Dominio público', description: 'Dunas y crestas de arena.', tags: ['desert', 'sculpting', 'sand'] },
  { file: 'terrain/alpine-snow.jpg', category: 'Terrenos', source: 'https://commons.wikimedia.org/wiki/File:Alp_mountains_covered_with_snow.jpg', author: 'Rosendahl', license: 'Dominio público', description: 'Alpes nevados.', tags: ['snow', 'snowline', 'mountain'] },
  { file: 'vegetation/misty-conifer-forest.jpg', category: 'Vegetación', source: 'https://commons.wikimedia.org/wiki/File:Nature-forest-trees-fog.jpg', author: 'Jaymantri', license: 'CC0', description: 'Coníferas en niebla.', tags: ['density', 'atmosphere', 'forest'] },
  { file: 'materials/weathered-wood-macro.jpg', category: 'Materiales', source: 'https://commons.wikimedia.org/wiki/File:Weathered_wood_grain_texture_macro_closeup_detail.jpg', author: 'MacrofyStudio', license: 'CC BY 4.0', description: 'Veta de madera envejecida.', tags: ['wood', 'roughness', 'planks'] },
  { file: 'materials/rock-texture-closeup.jpg', category: 'Materiales', source: 'https://commons.wikimedia.org/wiki/File:Rock_texture_close_up.jpg', author: 'Titus Tscharntke', license: 'Dominio público', description: 'Roca gris para acantilados.', tags: ['rock', 'cliff', 'albedo'] },
  { file: 'props/viking-treasure-hoard.jpg', category: 'Props', source: 'https://commons.wikimedia.org/wiki/File:Viking_treasure_(Leiden).jpg', author: 'Marieke Kuijjer', license: 'CC BY-SA 2.0', description: 'Plata y monedas antiguas para props de tesoro.', tags: ['treasure', 'coins', 'rewards'] },
  { file: 'vehicles/wooden-workboat.jpg', category: 'Vehículos', source: 'https://commons.wikimedia.org/wiki/File:Wooden_boat.jpg', author: 'Bengt Nyman', license: 'CC BY 2.0', description: 'Bote de trabajo de madera.', tags: ['boat', 'hull', 'modeling'] },
];

export const CATEGORIES = [...new Set(REFERENCES.map((r) => r.category))];
