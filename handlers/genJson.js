const fs = require("fs");
const path = require("path");
const { uuid } = require("short-uuid");
// Create an empty array to hold the SVG data
const svgData = [];
const svgDirectory = "./../src/public/assets/";
const removePrefixFromCategoryName = (name) => {
  return name.replace(/^\d+_/, "");
};

// Read the directory where your SVG files are located
fs.readdir(svgDirectory, (err, mainFolders) => {
  if (err) {
    console.log(err);
    return;
  }

  mainFolders.forEach((mainFolder) => {
    const tab = { tabName: mainFolder, cats: [] };
    if (!fs.lstatSync(path.join(svgDirectory, mainFolder)).isDirectory())
      return;
    folders = fs.readdirSync(path.join(svgDirectory, mainFolder));

    folders.forEach((folder) => {
      const basePath = path.join(svgDirectory, mainFolder, folder);
      if (fs.lstatSync(basePath).isDirectory()) {
        const files = fs.readdirSync(basePath);

        const cat = { id: uuid(), name: folder, items: [] };

        // svgData.push({name: folder, items:[]})
        // Loop through each SVG file
        files
          .filter((file) => path.extname(file) == ".json")
          .forEach((file) => {
            console.log(basePath + "/" + file);
            // Read the contents of the SVG file
            const svgContent = fs.readFileSync(basePath + "/" + file, "utf8");
            // console.log(svgContent)
           
            if (path.extname(file) == ".json") {
              const type = tab.tabName;
            

              

              cat.items.push({
                id: uuid(),
                name: file.replace(".json", ""),
                ratio: cat.name == "Horizontal" ? "h" : cat.name == "Vertical" ? "v" : "s",
                type: type,
                // isFree: ,
              });
            }
          });
        tab.cats.push(cat);
        // Write the SVG data to a JSON file
      }
    });

    svgData.push(tab);
  });

  const jsonContent = JSON.stringify(svgData[0].cats);
  fs.writeFile("svgData.json", jsonContent, "utf8", (err) => {
    if (err) {
      console.log(err);
      return;
    }

    console.log("SVG data saved to svgData.json");
  });
});
