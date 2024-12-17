import AddOnSdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";
const AddOnSdkInstance = AddOnSdk;
AddOnSdkInstance.ready.then(() => {
    console.log("AddOnSdk is ready for use. from file");
})
export default AddOnSdkInstance;