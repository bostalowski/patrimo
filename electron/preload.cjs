const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fingraphs", {
  isElectron: true,
  pickExcelFile: () => ipcRenderer.invoke("fingraphs:pick-excel-file"),
  pickNewExcelLocation: (defaultName) =>
    ipcRenderer.invoke("fingraphs:pick-new-excel-location", defaultName),
});
