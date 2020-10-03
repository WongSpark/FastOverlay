/**
 * @module ol/Overlay
 */
import BaseObject, { getChangeEventType } from 'ol/Object';
import MapEventType from 'ol/MapEventType';
import OverlayPositioning from 'ol/OverlayPositioning';
import { CLASS_SELECTABLE } from 'ol/css';
import { containsExtent } from 'ol/extent';
import { listen, unlistenByKey } from 'ol/events';
import {
  outerHeight, outerWidth, removeChildren, removeNode,
} from 'ol/dom';

/**
 * @enum {string}
 * @protected
 */
const Property = {
  ELEMENT: 'element',
  MAP: 'map',
  OFFSET: 'offset',
  POSITION: 'position',
  POSITIONING: 'positioning',
};

/**
 * @classdesc
 *
 * 性能优化版Overlay
 *
 * Example:
 *
 *     import Overlay from 'ol/Overlay';
 *
 *     var popup = new Overlay({
 *       element: document.getElementById('popup')
 *     });
 *     popup.setPosition(coordinate);
 *     map.addOverlay(popup);
 *
 * @api
 */
class FastOverlay extends BaseObject {
  /**
   * @param {Options} options Overlay options.
   */
  constructor(options) {
    super();

    /**
     * @protected
     * @type {Options}
     */
    this.options = options;

    /**
     * @protected
     * @type {number|string|undefined}
     */
    this.id = options.id;

    /**
     * @protected
     * @type {boolean}
     */
    this.insertFirst = options.insertFirst !== undefined ? options.insertFirst : true;

    /**
     * @protected
     * @type {boolean}
     */
    this.stopEvent = options.stopEvent !== undefined ? options.stopEvent : true;

    /**
     * @protected
     * @type {HTMLElement}
     */
    this.element = document.createElement('div');
    this.element.className = options.className !== undefined
      ? options.className
      : `ol-overlay-container ${CLASS_SELECTABLE}`;
    this.element.style.position = 'absolute';
    this.element.style.pointerEvents = 'auto';

    let { autoPan } = options;
    if (autoPan && typeof autoPan !== 'object') {
      autoPan = {
        animation: options.autoPanAnimation,
        margin: options.autoPanMargin,
      };
    }
    /**
     * @protected
     * @type {PanIntoViewOptions|false}
     */
    this.autoPan = /** @type {PanIntoViewOptions} */ (autoPan) || false;

    /**
     * @protected
     * @type {{transform_: string,
     *         visible: boolean}}
     */
    this.rendered = {
      transform_: '',
      visible: true,
    };

    /**
     * @protected
     * @type {?import("./events.js").EventsKey}
     */
    this.mapPostrenderListenerKey = null;

    this.addEventListener(getChangeEventType(Property.ELEMENT), this.handleElementChanged);
    this.addEventListener(getChangeEventType(Property.MAP), this.handleMapChanged);
    this.addEventListener(getChangeEventType(Property.OFFSET), this.handleOffsetChanged);
    this.addEventListener(getChangeEventType(Property.POSITION), this.handlePositionChanged);
    this.addEventListener(getChangeEventType(Property.POSITIONING), this.handlePositioningChanged);

    if (options.element !== undefined) {
      this.setElement(options.element);
    }

    this.setOffset(options.offset !== undefined ? options.offset : [0, 0]);

    this.setPositioning(
      options.positioning !== undefined
        ? /** @type {import("./OverlayPositioning.js").default} */ (options.positioning)
        : OverlayPositioning.TOP_LEFT,
    );

    if (options.position !== undefined) {
      this.setPosition(options.position);
    }
  }

  /**
   * Get the DOM element of this overlay.
   * @return {HTMLElement|undefined} The Element containing the overlay.
   * @observable
   * @api
   */
  getElement() {
    return /** @type {HTMLElement|undefined} */ (this.get(Property.ELEMENT));
  }

  /**
   * Get the overlay identifier which is set on constructor.
   * @return {number|string|undefined} Id.
   * @api
   */
  getId() {
    return this.id;
  }

  /**
   * Get the map associated with this overlay.
   * @return {import("./PluggableMap.js").default|undefined} The map that the
   * overlay is part of.
   * @observable
   * @api
   */
  getMap() {
    return /** @type {import("./PluggableMap.js").default|undefined} */ (this.get(Property.MAP));
  }

  /**
   * Get the offset of this overlay.
   * @return {Array<number>} The offset.
   * @observable
   * @api
   */
  getOffset() {
    return /** @type {Array<number>} */ (this.get(Property.OFFSET));
  }

  /**
   * Get the current position of this overlay.
   * @return {import("./coordinate.js").Coordinate|undefined} The spatial point that the overlay is
   *     anchored at.
   * @observable
   * @api
   */
  getPosition() {
    return /** @type {import("./coordinate.js").Coordinate|undefined} */ (this.get(
      Property.POSITION,
    ));
  }

  /**
   * Get the current positioning of this overlay.
   * @return {import("./OverlayPositioning.js").default} How the overlay is positioned
   *     relative to its point on the map.
   * @observable
   * @api
   */
  getPositioning() {
    return /** @type {import("./OverlayPositioning.js").default} */ (this.get(
      Property.POSITIONING,
    ));
  }

  /**
   * @protected
   */
  handleElementChanged() {
    removeChildren(this.element);
    const element = this.getElement();
    if (element) {
      this.element.appendChild(element);
    }
  }

  /**
   * @protected
   */
  handleMapChanged() {
    if (this.mapPostrenderListenerKey) {
      removeNode(this.element);
      unlistenByKey(this.mapPostrenderListenerKey);
      this.mapPostrenderListenerKey = null;
    }
    const map = this.getMap();
    if (map) {
      this.mapPostrenderListenerKey = listen(map, MapEventType.POSTRENDER, this.render, this);
      this.updatePixelPosition();
      const container = this.stopEvent
        ? map.getOverlayContainerStopEvent()
        : map.getOverlayContainer();
      if (this.insertFirst) {
        container.insertBefore(this.element, container.childNodes[0] || null);
      } else {
        container.appendChild(this.element);
      }
      this.performAutoPan();
    }
  }

  /**
   * @protected
   */
  render() {
    this.updatePixelPosition();
  }

  /**
   * @protected
   */
  handleOffsetChanged() {
    this.updatePixelPosition();
  }

  /**
   * @protected
   */
  handlePositionChanged() {
    this.updatePixelPosition();
    this.performAutoPan();
  }

  /**
   * @protected
   */
  handlePositioningChanged() {
    this.updatePixelPosition();
  }

  /**
   * Set the DOM element to be associated with this overlay.
   * @param {HTMLElement|undefined} element The Element containing the overlay.
   * @observable
   * @api
   */
  setElement(element) {
    this.set(Property.ELEMENT, element);
  }

  /**
   * Set the map to be associated with this overlay.
   * @param {import("./PluggableMap.js").default|undefined} map The map that the
   * overlay is part of.
   * @observable
   * @api
   */
  setMap(map) {
    this.set(Property.MAP, map);
    if (!this.stopEvent) {
      this.checkAndSetPositionStyle(map.overlayContainer_);
    } else {
      this.checkAndSetPositionStyle(map.overlayContainerStopEvent_);
    }
  }

  checkAndSetPositionStyle(dom) {
    if (!dom.style.top || !dom.style.left) {
      dom.style.top = '0';
      dom.style.left = '0';
      dom.style.position = 'absolute';
      dom.style.zIndex = '0';
      dom.style.width = '100%';
      dom.style.height = '100%';
      dom.style.pointerEvents = 'none';
    }
  }

  /**
   * Set the offset for this overlay.
   * @param {Array<number>} offset Offset.
   * @observable
   * @api
   */
  setOffset(offset) {
    this.set(Property.OFFSET, offset);
  }

  /**
   * Set the position for this overlay. If the position is `undefined` the
   * overlay is hidden.
   * @param {import("./coordinate.js").Coordinate|undefined} position The spatial point that the overlay
   *     is anchored at.
   * @observable
   * @api
   */
  setPosition(position) {
    this.set(Property.POSITION, position);
  }

  /**
   * Pan the map so that the overlay is entirely visisble in the current viewport
   * (if necessary) using the configured autoPan parameters
   * @protected
   */
  performAutoPan() {
    if (this.autoPan) {
      this.panIntoView(this.autoPan);
    }
  }

  /**
   * Pan the map so that the overlay is entirely visible in the current viewport
   * (if necessary).
   * @param {PanIntoViewOptions=} panIntoViewOptionsParam Options for the pan action
   * @api
   */
  panIntoView(panIntoViewOptionsParam) {
    const map = this.getMap();

    if (!map || !map.getTargetElement() || !this.get(Property.POSITION)) {
      return;
    }

    const mapRect = this.getRect(map.getTargetElement(), map.getSize());
    const element = this.getElement();
    const overlayRect = this.getRect(element, [outerWidth(element), outerHeight(element)]);

    const panIntoViewOptions = panIntoViewOptionsParam || {};

    const myMargin = panIntoViewOptions.margin === undefined ? 20 : panIntoViewOptions.margin;
    if (!containsExtent(mapRect, overlayRect)) {
      // the overlay is not completely inside the viewport, so pan the map
      const offsetLeft = overlayRect[0] - mapRect[0];
      const offsetRight = mapRect[2] - overlayRect[2];
      const offsetTop = overlayRect[1] - mapRect[1];
      const offsetBottom = mapRect[3] - overlayRect[3];

      const delta = [0, 0];
      if (offsetLeft < 0) {
        // move map to the left
        delta[0] = offsetLeft - myMargin;
      } else if (offsetRight < 0) {
        // move map to the right
        delta[0] = Math.abs(offsetRight) + myMargin;
      }
      if (offsetTop < 0) {
        // move map up
        delta[1] = offsetTop - myMargin;
      } else if (offsetBottom < 0) {
        // move map down
        delta[1] = Math.abs(offsetBottom) + myMargin;
      }

      if (delta[0] !== 0 || delta[1] !== 0) {
        const center = /** @type {import("./coordinate.js").Coordinate} */ (map
          .getView()
          .getCenterInternal());
        const centerPx = map.getPixelFromCoordinateInternal(center);
        const newCenterPx = [centerPx[0] + delta[0], centerPx[1] + delta[1]];

        const panOptions = panIntoViewOptions.animation || {};
        map.getView().animateInternal({
          center: map.getCoordinateFromPixelInternal(newCenterPx),
          duration: panOptions.duration,
          easing: panOptions.easing,
        });
      }
    }
  }

  /**
   * Get the extent of an element relative to the document
   * @param {HTMLElement} element The element.
   * @param {import("./size.js").Size} size The size of the element.
   * @return {import("./extent.js").Extent} The extent.
   * @protected
   */
  getRect(element, size) {
    const box = element.getBoundingClientRect();
    const offsetX = box.left + window.pageXOffset;
    const offsetY = box.top + window.pageYOffset;
    return [offsetX, offsetY, offsetX + size[0], offsetY + size[1]];
  }

  /**
   * Set the positioning for this overlay.
   * @param {import("./OverlayPositioning.js").default} positioning how the overlay is
   *     positioned relative to its point on the map.
   * @observable
   * @api
   */
  setPositioning(positioning) {
    this.set(Property.POSITIONING, positioning);
  }

  /**
   * Modify the visibility of the element.
   * @param {boolean} visible Element visibility.
   * @protected
   */
  setVisible(visible) {
    if (this.rendered.visible !== visible) {
      this.element.style.display = visible ? '' : 'none';
      this.rendered.visible = visible;
    }
  }

  /**
   * Update pixel position.
   * @protected
   */
  updatePixelPosition() {
    const map = this.getMap();
    const position = this.getPosition();
    if (!map || !map.isRendered() || !position) {
      this.setVisible(false);
      return;
    }

    const pixel = map.getPixelFromCoordinate(position);
    const mapSize = map.getSize();
    this.updateRenderedPosition(pixel, mapSize);
  }

  /**
   * @param {import("./pixel.js").Pixel} pixel The pixel location.
   * @param {import("./size.js").Size|undefined} mapSize The map size.
   * @protected
   */
  updateRenderedPosition(pixel, mapSize) {
    const { style } = this.element;
    const offset = this.getOffset();

    const positioning = this.getPositioning();

    this.setVisible(true);

    const x = `${Math.round(pixel[0] + offset[0])}px`;
    const y = `${Math.round(pixel[1] + offset[1])}px`;
    let posX = '0%';
    let posY = '0%';
    if (
      positioning === OverlayPositioning.BOTTOM_RIGHT
      || positioning === OverlayPositioning.CENTER_RIGHT
      || positioning === OverlayPositioning.TOP_RIGHT
    ) {
      posX = '-100%';
    } else if (
      positioning === OverlayPositioning.BOTTOM_CENTER
      || positioning === OverlayPositioning.CENTER_CENTER
      || positioning === OverlayPositioning.TOP_CENTER
    ) {
      posX = '-50%';
    }
    if (
      positioning === OverlayPositioning.BOTTOM_LEFT
      || positioning === OverlayPositioning.BOTTOM_CENTER
      || positioning === OverlayPositioning.BOTTOM_RIGHT
    ) {
      posY = '-100%';
    } else if (
      positioning === OverlayPositioning.CENTER_LEFT
      || positioning === OverlayPositioning.CENTER_CENTER
      || positioning === OverlayPositioning.CENTER_RIGHT
    ) {
      posY = '-50%';
    }
    const transform = `translate(${posX}, ${posY}) translate(${x}, ${y})`;
    if (this.rendered.transform_ !== transform) {
      this.rendered.transform_ = transform;
      style.transform = transform;
      // @ts-ignore IE9
      style.msTransform = transform;
    }
  }

  /**
   * returns the options this Overlay has been created with
   * @return {Options} overlay options
   */
  getOptions() {
    return this.options;
  }
}

export default FastOverlay;
