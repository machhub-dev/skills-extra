// SVGO settings for HMI symbols. Shared by fetch-symbols.mjs and fit-symbols.mjs;
// also usable alone: npx svgo --config path/to/svgo.config.mjs -f <dir>.
//
// Keeps what code animates: data-* attributes, the zero-radius port markers
// (removeHiddenElems would drop them) and the groups that carry data-part
// (collapseGroups and the attribute movers would merge them away).

export const hmiPreset = {
  name: "preset-default",
  params: {
    overrides: {
      removeHiddenElems: false,
      collapseGroups: false,
      moveGroupAttrsToElems: false,
      moveElemsAttrsToGroup: false,
      mergePaths: false,
      // A body's stroke comes from the theme's CSS, so its stroke-width looks
      // "useless" to SVGO; keep it.
      removeUselessStrokeAndFill: false
    }
  }
};

export default {
  multipass: false,
  plugins: [hmiPreset, "removeDimensions"]
};
