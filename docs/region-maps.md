# Nine regional survival maps

Implemented on `feat/nine-region-maps`. Select 地區 / Region beneath Play in `dev.html` (or the rebuilt index). This creates real procedural world terrain, not background images. Existing tree/crystal, rock, grass, chest, altar, spring and trap renderers and collisions are reused. World tile size remains 32 pixels (16 art pixels ×2).

| ID | Representative field | Terrain distinction |
| --- | --- | --- |
| kanto | Viridian-inspired forest trails | woodland, pools, occasional rock formations |
| johto | Ilex/Alph-inspired ancient grove | regularly spaced ruin walls, ochre trees |
| hoenn | rainforest waterways | winding channels and rocky banks |
| sinnoh | Coronet-inspired snowy passes | snowy palette, diagonal ridges, slippery ice |
| unova | urban riverbank park | rectangular stone blocks and canals |
| kalos | ornamental garden | geometric pools, pink foliage, pale stone |
| alola | tropical sandy atoll | organic coastal pools and sand palette |
| galar | wild grassland | open moor, scattered groves and lakes |
| paldea | highland crater field | ring ridges, central pools and crystal props |

These are authored interpretations of selected regional landmarks, not exact canonical regional layouts. Region-specific code-drawn scenery now includes palms, snow-covered pines, topiary, park trees, autumn trees and olive trees. Nine solid landmark sprites include a trail sign, ceremonial gate, vent, snow shrine, lamp, fountain, carved island post, standing stones and crystals. These are original representative motifs; the fountain and steam are static pixel art. City blocks remain rock-wall terrain rather than detailed buildings. Each region uses one representative palette; all regional sub-biomes are not included. There is no regional encounter table, unlock progression, regional music or new weather integration in this change.

## Compatibility

- Region biomes append after all original biomes and arenas; existing arena indices (3–21) remain unchanged.
- A selected solo region remains the same during the normal four-minute biome tick; special rift arenas still override and return normally.
- Five-tile-wide connected corridors and clear spawn keep land routes open. No regional props spawn on corridors.
- The same seed and region produce identical terrain. Regional selection resets terrain/image/prop-state caches through the existing World.reset flow.
- Invalid/missing region selects original behavior. Menu backdrop retains original behavior.
- Co-op uses original terrain on every client; the solo menu explicitly explains this. No network protocol changes.
- Selection uses the existing local settings storage; no Pokémon, inventory, cloud database or existing save schema changes.

## Research references

The following reference facts informed design choices; topology and palette are original authored approximations.

- Kanto/Viridian forest: https://bulbapedia.bulbagarden.net/wiki/Viridian_Forest
- Johto/Ilex and Alph: https://bulbapedia.bulbagarden.net/wiki/Johto
- Hoenn/green mainland, active volcano, offshore islands: https://www.pokemon.co.jp/ex/oras/feature/02.html
- Sinnoh/Coronet mountain divide: https://www.pokemon.com/us/features/remember-the-region-sinnoh-spotlight
- Snow-covered Coronet: https://bulbapedia.bulbagarden.net/wiki/Mount_Coronet
- Unova/cities, rivers, bridges: https://bulbapedia.bulbagarden.net/wiki/Unova
- Kalos/ornamental garden: https://bulbapedia.bulbagarden.net/wiki/Parterre_Way
- Alola/islands: https://www.pokemon.com/us/news/celebrate-25-years-of-pokemon-with-memorable-moments-from-the-alola-region
- Galar/grassland, countryside, snow mountains: https://www.pokemon.co.jp/ex/sword_shield/story/190605_01.html
- Paldea/open areas, lakes, peaks and wastelands: https://scarletviolet.pokemon.com/en-ca/news/the_paldea_region/

## Validation

`node --test tests/regions.test.cjs` checks nine registrations, original arena indices, valid palettes, deterministic terrain, distinct layouts, clear spawn, cross-chunk connected corridors, arena return and original/invalid selection fallback. `docs/region-map-preview.webp` is rendered with the actual Tiles/World code at seed 417; it is a development overview, not a screenshot of browser gameplay. Full mobile, browser gameplay, multiplayer and long-run regression remain necessary before production publication.

Build note: the core bundle and data export build successfully. Full SEO regeneration currently stops because the existing SEO script expects the upstream PokéSurvivor title while this fork uses 小柯Survivor. Partial SEO outputs were discarded. The new changelog translations are included for all five external language dictionaries.

## Scenery expansion

`js/world/region-art.js` supplies cached tree, grass and landmark sprites at the existing art pixel scale. Ground accents are baked once per chunk: paved joints, sandy paths, snow tracks, leaf litter, beach shells, garden flower beds, heather, ferns and mineral accents. Palms are shared by Hoenn and Alola; their ground and vegetation differ.

Landmarks repeat at tile (12,12) modulo 48, away from the connected five-tile corridors and spawn. Their 3×3 floor clearing excludes other props. Each has a radius-14 solid collision footprint and leaves adjacent tiles walkable. Regional landmarks are scenery, not new collectible rewards or quests. When a nonregional special-arena palette renders a landmark, the existing altar painter is a safe fallback.

Render preview from repository root: `node tools/render_regions.cjs` (optional dependency `@napi-rs/canvas`). This renders the same World/Tiles/RegionArt pipeline used by gameplay, not a separately illustrated mockup. Existing ground/wall/liquid collision remains authoritative; visual overlays only decorate floor tiles. Scenery is cached, without new per-frame particle loops.

Latest scenery expansion validation: all 44 tests pass. Core bundle/data export build successfully; final browser/mobile gameplay validation remains pending.
