# fast-overlay

Based on Openlayers@5.3.3. Optimize 'Overlay' performance, inspired by a openlayers issue.

On my computer(cpu:intel 8250u,16G,integrated graphics),the test results are show as follows:

The result of adding 200 points using Openlayers Overlay.The FPS is on a low level.

![](.README_images/28e4f838.png)

The result of add 200 and 800 points using FastOverlay.The FPS is on a high level.
This brings about twice performance improvement.

![](.README_images/8508c702.png)

![](.README_images/b77cffc0.png)

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run your unit tests
```
npm run test:unit
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
