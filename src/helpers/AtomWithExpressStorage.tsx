import { atom } from "jotai";
import AddOnSdkInstance from "./AddonSdk";

const atomWithAsyncStorage = (key, initialValue) => {
  const baseAtom = atom(initialValue);
  const api = AddOnSdkInstance;
  baseAtom.onMount = (setValue) => {
    (async () => {
      await AddOnSdkInstance.ready;
      const { clientStorage } = api.instance;
      try {
        const item = await clientStorage.getItem(key);
        // Only set the value from storage if it exists, otherwise keep the initial value
        if (item !== undefined && item !== null) {
          setValue(item);
        } else {
          // Set initial value in storage if no value exists
          await clientStorage.setItem(key, initialValue);
        }
      } catch (error) {
        console.error("Error accessing storage:", error);
      }
    })();
  };
  const derivedAtom = atom(
    (get) => get(baseAtom),
    async (get, set, update) => {
      await AddOnSdkInstance.ready;
      const { clientStorage } = api.instance;
      const nextValue =
        typeof update === "function" ? update(get(baseAtom)) : update;
      set(baseAtom, nextValue);
      clientStorage.setItem(key, nextValue);
    }
  );
  return derivedAtom;
};

export default atomWithAsyncStorage;
