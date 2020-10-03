<template>
  <div id="container">
    <div id="map"></div>
    <form>
      <label for="number-of-overlays">Number of overlays</label>
      <input id="number-of-overlays" type="number">
    </form>
  </div>
</template>

<script>
import 'ol/ol.css';
import Map from 'ol/Map';
// import Overlay from 'ol/Overlay';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Overlay from '../FastOverlay';

export default {
  name: 'HelloWorld',
  mounted() {
    const layer = new TileLayer({
      source: new OSM(),
    });

    const map = new Map({
      layers: [layer],
      target: 'map',
      view: new View({
        center: [0, 0],
        zoom: 3,
      }),
    });

    const pointSource = new VectorSource({});
    const pointLayer = new VectorLayer({ source: pointSource });
    map.addLayer(pointLayer);

    /** @type {HTMLElement} */
    const tb = document.getElementById('number-of-overlays');
    tb.value = 200;

    function createOverlays(maxOverlays) {
      const POSITIONING = [
        'bottom-left',
        'bottom-center',
        'bottom-right',
        'center-left',
        'center-center',
        'center-right',
        'top-left',
        'top-center',
        'top-right',
      ];

      map.getOverlays().clear();
      pointSource.clear();
      const features = [];
      const perLine = Math.floor(Math.sqrt(maxOverlays));

      for (let i = 0; i < maxOverlays; i += 1) {
        const ele = document.createElement('div');
        ele.className = 'marker';
        ele.innerText = `${i}`;
        const p = [(Math.floor(i / perLine) / perLine)
        * 270 - 135, ((i % perLine) / perLine) * 135 - 67.5];
        // console.log(i, i / MAX_MARKERS);
        const overlay = new Overlay({
          position: fromLonLat(p),
          element: ele,
          positioning: POSITIONING[i % POSITIONING.length],
          stopEvent: false,
        });
        map.addOverlay(overlay);
        features.push(new Feature(new Point(fromLonLat(p))));
      }
      pointSource.addFeatures(features);
    }

    tb.addEventListener('change', () => createOverlays(Number(tb.value)));
    createOverlays(Number(tb.value));
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  #map {
    height: 700px;
    width: 100%;
  }
</style>
