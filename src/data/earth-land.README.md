# Earth land geometry

`earth-land.json` is a bundled GeoJSON FeatureCollection derived from Natural Earth's land polygons. Most of the world uses the 1:110m dataset; the Japanese islands use the more detailed 1:10m dataset to retain recognizable coastlines during the globe's close zoom. It contains 607 Polygon features and 17,511 coordinate points in approximately 334 KB, with coordinates in `[longitude, latitude]` order, in degrees (WGS84).

- World source: [Natural Earth vector repository, `ne_110m_land.geojson`](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson)
- Japan source: [Natural Earth vector repository, `ne_10m_land.geojson`](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson)
- Retrieved: October 9, 2026
- Processing: world coordinate precision reduced to two decimal places; Japan precision reduced to three decimal places. The three original coarse Japan polygons were replaced by 483 detailed island polygons wholly within longitude 122.6–146.1 and latitude 24–46.1. Adjacent duplicate vertices and one tiny island that became degenerate after coordinate rounding were removed. Unused properties and collection metadata were removed; geometry and ring order were otherwise preserved. The localized higher detail keeps the asset and per-frame geometry bounded.
- License: public domain under the [Natural Earth terms of use](https://www.naturalearthdata.com/about/terms-of-use/).

Made with Natural Earth. This local data requires no network request to an external service at runtime.
