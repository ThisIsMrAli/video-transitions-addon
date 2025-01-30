import { theme as spectrumTheme } from "@react-spectrum/theme-express";
import { AlertDialog, DialogTrigger, Provider } from "@adobe/react-spectrum";
import React from "react";
import { DocumentSandboxApi } from "../../models/DocumentSandboxApi";
import "./App.css";

import { AddOnSDKAPI } from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";
import { ToastContainer, ToastQueue } from "@react-spectrum/toast";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createMemoryRouter,
} from "react-router-dom";
import Home from "./creatures/Home";
import { useAtom } from "jotai";
import { selectFileDialogAtom } from "../../store/general";
import Render from "./creatures/Render";
import AspectRationSelect from "./creatures/AspectRationSelect";

const App = ({
  addOnUISdk,
  sandboxProxy,
}: {
  addOnUISdk: AddOnSDKAPI;
  sandboxProxy: DocumentSandboxApi;
}) => {
  const [selectFileDialogIsOpen, setSelectFileDialogIsOpen] =
    useAtom(selectFileDialogAtom);
  function handleClick() {
    sandboxProxy.createRectangle();
  }
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <div
          className={`bg-white w-full h-full flex flex-col relative py-1 px-1`}
        >
          <div className="h-full overflow-hidden">
            <Outlet />
          </div>
          <DialogTrigger
            isOpen={selectFileDialogIsOpen}
            onOpenChange={setSelectFileDialogIsOpen}
          >
            <></>
            {(close) => (
              <AlertDialog
                title="No Media Selected"
                variant="warning"
                primaryActionLabel="Ok"
              >
                Please select a video or photo to continue, and then you can try
                adding presets.
              </AlertDialog>
            )}
          </DialogTrigger>
        </div>
      ),
      children: [
        { index: true, element: <Navigate to="/aspect-ratio" replace /> },
        {
          path: "/home",
          element: <Home />,
        },
        {
          path: "/aspect-ratio",
          element: <AspectRationSelect />,
        },
        {
          path: "/render",
          element: <Render />,
        },
      ],
    },
  ]);

  return (
    <Provider
      theme={spectrumTheme}
      UNSAFE_style={{ height: "100%" }}
      colorScheme="light"
    >
      <ToastContainer></ToastContainer>
      <RouterProvider router={router} />
    </Provider>
  );
};

export default App;
