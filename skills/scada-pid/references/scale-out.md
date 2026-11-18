# When SVG is not enough

SVG in the DOM is the default for every screen: it stays sharp on any panel, takes the theme from CSS, gives each symbol a real click target and test selector, and runs unchanged in an HTML Artifact. CSS animations of `transform` and `stroke-dashoffset` run in the browser's compositor, so a unit screen of a few hundred symbols costs little.

## The limit

Measure before moving: record frame time in the browser's performance panel while the simulator drives every tag at its real rate. Move a screen off SVG only when it misses 60 fps on the site's slowest panel. That usually means more than about 2,000 elements changing every frame: a plant overview with every conveyor item moving, or particle-style flow.

## Moving a screen to canvas

- **Konva** (MIT) for 2D scenes with shapes and hit detection; **PixiJS** (MIT) for WebGL and thousands of sprites.
- Keep the binding map and the HMI core: subscribe through `observeSymbol` and set node properties in its callback instead of calling `applySymbolState`.
- What you give up, and must rebuild: themes (colours are set in code), keyboard focus and screen-reader labels (add a hidden list of objects as buttons), Playwright selectors (expose each node's state on a test hook), and the Artifact path.
- Keep faceplates, the alarm banner and trends in HTML over the canvas.

Usually the better answer is two screens: an L1 overview with few moving parts and an L2 screen per unit.

## HTML-in-Canvas

Chrome 157 (November 2026) turns on `drawElementImage()`, which draws live HTML into a canvas. Older Chromium needs a flag, Firefox and Safari have none, and the opt-in attribute changed in 157 (`layoutsubtree` became `content="drawable"`). Plants run Safari tablets and locked-down kiosks on old Chromium, so do not depend on it. If a canvas screen uses it for crisp faceplates, check for it first (`'drawElementImage' in CanvasRenderingContext2D.prototype`) and fall back to HTML laid over the canvas.
