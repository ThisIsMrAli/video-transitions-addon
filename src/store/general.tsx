import { atom } from "jotai";


export const selectFileDialogAtom = atom(false);
export const showTransitionSelectorOverlayAtom = atom({open:false,index:-1});
export const layersAtom = atom([]);
