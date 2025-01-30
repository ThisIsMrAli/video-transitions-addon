import { atom } from "jotai";

export const selectFileDialogAtom = atom(false);
export const showTransitionSelectorOverlayAtom = atom({
  open: false,
  index: -1,
});
export const layersAtom = atom([]);

export const aspectRatios = [
  { name: "Vertical", value: "9:16", width: 1080, height: 1920 },
  { name: "Horizontal", value: "16:9", width: 1920, height: 1080 },
  { name: "Square", value: "1:1", width: 1080, height: 1080 },
];

export const aspectRatioAtom = atom(aspectRatios[1]);
