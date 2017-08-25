# web-ext-experiment-printservice

This experiment propose new Javascript API called `printservice`.
Web extensions can use this API to provide functionality related to print process enhacements.

# I. General.
  1. The API must provide functionality to customize print process with features like:
    - headers/footers
    - media format
    - margins
    - silent printing (without print dialog)
    - range printing
    - output format
    - print to file
    - print to different printers
  
In general all features supplied by via [nsIPrintSetting](https://dxr.mozilla.org/mozilla-beta/source/widget/nsIPrintSettings.idl) interface.

  2. This API can be used from extensions to which is granted `printservice` permission.
  
  
# II. The API.

## Data types
### `PrintSettings`
This object contains properties of [nsIPrintSetting](https://dxr.mozilla.org/mozilla-beta/source/widget/nsIPrintSettings.idl) interface.
```javascript
    "types" : [
      {
        "id": "PrintSettings",
        "type": "object",
        "description": "The page settings including: orientation, scale, background, margins, headers, footers.",
        "properties": {
          "printerName": {
            "type": "string",
            "optional": true,
            "description": "Name of destination printer."
          },
          "orientation": {
            "type": "integer",
            "optional": true,
            "description": "The page content orientation: 0 = portrait, 1 = landscape. Default: 0."
          },
          "scaling": {
            "type": "number",
            "optional": true,
            "description": "The page content scaling factor: 1.0 = 100% = normal size. Default: 1.0."
          },
          "shrinkToFit": {
            "type": "boolean",
            "optional": true,
            "description": "Whether the page content should shrink to fit the page width (overrides scaling). Default: true."
          },
          "printBGColors": {
            "type": "boolean",
            "optional": true,
            "description": "Whether the page background colors should be shown. Default: false."
          },
          "printBGImages": {
            "type": "boolean",
            "optional": true,
            "description": "Whether the page background images should be shown. Default: false."
          },
          "printInColor": {
            "type": "boolean",
            "optional": true,
            "description": "Print in color. false means in grayscale. Default: true."
          },
          "printReversed": {
            "type": "boolean",
            "optional": true,
            "description": "Print pages in reverse order. Default: false."
          },
          "printSilent": {
            "type": "boolean",
            "optional": true,
            "description": "Silent printing. Default: false."
          },
          "showPrintProgress": {
            "type": "boolean",
            "optional": true,
            "description": "Show print progress. Default: true."
          },
          "printToFile": {
            "type": "boolean",
            "optional": true,
            "description": "Print to file. Default: false."
          },
          "toFileName": {
            "type": "string",
            "optional": true,
            "description": "Output file name in cas of 'printToFile'."
          },
          "resolution": {
            "type": "integer",
            "optional": true,
            "description": "print resolution (dpi)."
          },
          "printPageDelay": {
            "type": "integer",
            "optional": true,
            "description": "Print page delay in milliseconds."
          },
          "duplex": {
            "type": "integer",
            "optional": true,
            "description": "Duplex mode."
          },
          "numCopies": {
            "type": "integer",
            "optional": true,
            "description": "The number of copies. Default: 1."
          },
          "howToEnableFrameUI": {
            "type": "integer",
            "optional": true,
            "description": "0 = kFrameEnableNone, 1 = kFrameEnableAll, 2 = kFrameEnableAsIsAndEach. Default: 0."
          },
          "printFrameTypeUsage": {
            "type": "integer",
            "optional": true,
            "description": "0 = kUseInternalDefault, 1 = kUseSettingWhenPossible. Default: 0."
          },
          "printFrameType": {
            "type": "integer",
            "optional": true,
            "description": "0 = kNoFrames, 1 = kFramesAsIs, 2 = kSelectedFrame, 3 = kEachFrameSep. Default: 0."
          },
          "printRange": {
            "type": "integer",
            "optional": true,
            "description": "What content to print 0 = print all pages, 1 = print specified range between startPageRange and endPageRange, 2 = print selection, 3 = print focused frame. Default: 0."
          },
          "startPageRange": {
            "type": "integer",
            "optional": true,
            "description": "Start page of range when 'printRange = 1'"
          },
          "endPageRange": {
            "type": "integer",
            "optional": true,
            "description": "End page of range when 'printRange = 1'"
          },
          "paperName": {
            "type": "string",
            "optional": true,
            "description": "The name of paper (for some platforms like Linux)."
          },
          "paperData": {
            "type": "integer",
            "optional": true,
            "description": "The id of paper (for some platforms like Windows)."
          },
          "paperSizeUnit": {
            "type": "integer",
            "optional": true,
            "description": "The page size unit: 0 = inches, 1 = millimeters. Default: 0."
          },
          "paperWidth": {
            "type": "number",
            "optional": true,
            "description": "The paper width in paper size units. Default: 8.5."
          },
          "paperHeight": {
            "type": "number",
            "optional": true,
            "description": "The paper height in paper size units. Default: 11.0."
          },
          "outputFormat": {
            "type": "integer",
            "optional": true,
            "description": "Print output format. 0 = Native format, 1 = Postscript, 2 = PDF. Default: 0."
          },
          "title": {
            "type": "string",
            "optional": true,
            "description": "The title of page."
          },
          "docURL": {
            "type": "string",
            "optional": true,
            "description": "The document URL."
          },
          "headerStrLeft": {
            "type": "string",
            "optional": true,
            "description": "The text for the page's left header. Default: '&T'."
          },
          "headerStrCenter": {
            "type": "string",
            "optional": true,
            "description": "The text for the page's center header. Default: ''."
          },
          "headerStrRight": {
            "type": "string",
            "optional": true,
            "description": "The text for the page's right header. Default: '&U'."
          },
          "footerStrLeft": {
            "type": "string",
            "optional": true,
            "description": "The text for the page's left footer. Default: '&PT'."
          },
          "footerStrCenter": {
            "type": "string",
            "optional": true,
            "description": "The text for the page's center footer. Default: ''."
          },
          "footerStrRight": {
            "type": "string",
            "optional": true,
            "description": "The text for the page's right footer. Default: '&D'."
          },
          "unwriteableMarginLeft": {
            "type": "number",
            "optional": true,
            "description": "The unwriteable margin between the printable area and the left edge of the paper (inches). Default: 0."
          },
          "unwriteableMarginRight": {
            "type": "number",
            "optional": true,
            "description": "The unwriteable margin between the printable area and the right edge of the paper (inches). Default: 0."
          },
          "unwriteableMarginTop": {
            "type": "number",
            "optional": true,
            "description": "The unwriteable margin between the printable area and the top edge of the paper (inches). Default: 0."
          },
          "unwriteableMarginBottom": {
            "type": "number",
            "optional": true,
            "description": "The unwriteable margin between the printable area and the bottom edge of the paper (inches). Default: 0."
          },
          "edgeLeft": {
            "type": "number",
            "optional": true,
            "description": "The offset between header/footer and the left unwriteable margin (inches). Default: 0.3."
          },
          "edgeRight": {
            "type": "number",
            "optional": true,
            "description": "The offset between header/footer and the right unwriteable margin (inches). Default: 0.3."
          },
          "edgeTop": {
            "type": "number",
            "optional": true,
            "description": "The offset between header and the top unwriteable margin (inches). Default: 0.3."
          },
          "edgeBottom": {
            "type": "number",
            "optional": true,
            "description": "The offset between footer and the bottom unwriteable margin (inches). Default: 0.3."
          },
          "marginLeft": {
            "type": "number",
            "optional": true,
            "description": "The margin between the page content and the left unwriteable margin (inches). Default: 0.5."
          },
          "marginRight": {
            "type": "number",
            "optional": true,
            "description": "The margin between the page content and the right unwriteable margin (inches). Default: 0.5."
          },
          "marginTop": {
            "type": "number",
            "optional": true,
            "description": "The margin between the page content and the top unwriteable margin (inches). Default: 0.5."
          },
          "marginBottom": {
            "type": "number",
            "optional": true,
            "description": "The margin between the page content and the bottom unwriteable margin (inches). Default: 0.5."
          }
        } 
      }  
    ],
```

## Methods
### `printservice.listPrinters()`
**Description:** Return list of available printers.<br />
**Parameters:** None<br />
**Return:** List names of available printers.
  
### `printservice.getDefaultPrinterName()`
**Description:** Return default printer name.<br />
**Parameters:** None<br />
**Return:** Default printer name.
  
### `printservice.getGlobalPrintSettings()`
**Description:** Return global print settings.<br />
**Parameters:** None<br />
**Return:** Object with global print settings.<br />
  
### `printservice.getPrintSettings(printerName = null)`
**Description:** Return print settings for given printer(or default printer).<br />
**Parameters:** Optional `printerName`. If is omited default printer name is used.<br />
**Return:** Object with print settings for `printerName` (or default printer).
  
### `printservice.savePrintSettings(printSettings, optionSet = null, setDefaultPrinterName = false)`
**Description:** Update given print settings and save it in preferences.<br />
**Parameters:**<br />
`printSettings` - object with print settings to update<br />
`printerName` property is mandatory. If is blank tha global print settings is assumed.<br />
`optionSet` - which set of print setting will be saved in preferences.<br />
`setDefaultPrinterName` - if you want to set `printSettings.printerName` as default printer.<br />
**Return:** Object with all print settings.   
  
### `printservice.printTab(tabId = null, frameId = null, printSettings = null)`
**Description:** Print given tab and specific frame (or main window) with specified print settings.<br />
This method have a sense in case of `silent printing`, if is printing via print dialog, the settings are overwritten by dialog.<br />
**Parameters:**<br />
`tabId` - the id of tab to be printed<br />
`frameId` - if particular frame (not main window) wants to be printed<br />
`printSettings` - Object with print settings<br />
**Return:** `Promise` which is resolved via `jobId` in case of successful print job submission or `Promise` will be rejected with error message in case of error.  
  
## Events

### `printservice.onStateChange`
**Description:** Fires on print state change start/stop<br /> 
**Data:**<br />
`jobId` - id of job which is printed<br />
`tabId` - id of tab which is printed<br />
`frameId` - id of frame which is printed (0 - main window)<br />
`stateFlags` - see [nsIWebProgressListener](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener) doc<br />
`status` - see [nsIWebProgressListener](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener) doc

### `printservice.onProgressChange`
**Description:** Fires on print progress change<br /> 
**Data:**<br />
`jobId` - id of job which is printed<br />
`tabId` - id of tab which is printed<br />
`frameId` - id of frame which is printed (0 - main window)<br />
`curSelfProgress` - see [nsIWebProgressListener](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener) doc<br />
`maxSelfProgress` - see [nsIWebProgressListener](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener) doc<br />
`curTotalProgress` - see [nsIWebProgressListener](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener) doc<br />
`maxTotalProgress` - see [nsIWebProgressListener](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener) doc

### `printservice.onStatusChange`
**Description:** Fires on print status change (print error)<br />
**Data:**<br />
`jobId` - id of job which is printed<br />
`tabId` - id ot tab which is printed<br />
`frameId` - id ot frame which is printed (0 - main window)<br />
`status` - see nsIWebProgressListener doc<br />
`statusMessage` - see [nsIWebProgressListener](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener) doc

# III. `jsPrintSetup` webextension.
This extension is port of XPCOM [jsPrintSetup](https://github.com/edabg/jsprintsetup) extension to webextension, which relie on new `printservice` API.

The extension in not complete, but implements all methods of `printservice` API.

## Security
The important functionality of the extension is to **resctrict access** to it's features and `printService`.
Because if that is not implemeted **every content from internet may exploit** your printers through `jsPrintSetup` extension.

The first step to security is **extensions have to request `printservice` permission**.<br>
That's mean, when user install `jsPrintSetup` extension or something other that will use `printService` it **have to allow "This extension will get access to your printers!"**

After the `extension` is allowed and installed, **the extension must provide next security level**.<br>
In case of `jsPrintSetup` extension it implements *host based access control*.<br>
How access control is implemented.<br>
`jsPrintSetup` store list of `allowed` and `blocked` hosts, which can be edited in `extension options page`.<br>
When `backgrond script` receives request for *print services*, it check that host (from page script) is in list of `allowed`/`blocked` hosts.<br>
1. If the host is `allowed` the request is processed.<br>
2. If the host is `blocked` the request is rejected.<br>
3. If the host is neither `allowed` or `blocked` **User must decide what to do with future requests from this host**.<br>
In all cases when `bacground script` receive request `pageAction` button is displayed in address bar with relevant information about current **permissions of this host**.<br>
When user click's the `pageAction` button/icon `options page` is displayed to get decision about this host.

In summary the security scheme includes **permissions during installation* and **permissions on host basis**. 

# IV. Test case.

For testing of the implementation there is simple HTML page with two frames, which implement main functionality API testing.

## How to run testing scenario.

1. You need [Firefox Developer Edition](https://www.mozilla.org/bg/firefox/developer/).
2. Start Firefox and open new tab `about:debugging`.
3. Load webextension experiment `printservice` as `Load Temporary Add-on` and select `/printservice/schema.json`.
4. Load `jsPrintSetup` webextension as `Load Temporary Add-on` and select `/jsprintsetup/manifest.json`.
5. Open new tab and open file `test-jsp.html`.

## Explanation 

### jsPrintSetup Webextension

jsPrintSetup Webextension exposes `printservice` API to page scripts as follow.

The final goal of this extension is to logically implenent all functions supplied by old XPCOM extension [jsPrintSetup](https://github.com/edabg/jsprintsetup/wiki), 
considering design requirements for Firefox Webextensions. 

1. [jsprintsetup-service.js](https://github.com/edabg/web-ext-experiment-printservice/blob/master/jsprintsetup/jsprintsetup-service.js) `background script`
provide *print services* interface to `content script` [jsprintsetup-iface.js](https://github.com/edabg/web-ext-experiment-printservice/blob/master/jsprintsetup/jsprintsetup-iface.js).
`jsprintsetup-service.js` act as bridge between `jsprintsetup-iface.js` `content script` and `printservice` API.

**Important**:In the future `background script` must implement host based access control via `permissions`.

2. [jsprintsetup-iface.js](https://github.com/edabg/web-ext-experiment-printservice/blob/master/jsprintsetup/jsprintsetup-iface.js) `content script`
*exposes* to `page script` `jsPrintSetup` object which implements useful print service oriented methods, using *print services* supplied by background script.

`jsPrintSetup` Methods

- `jsPrintSetup.print(printSettings)` - print with `printSettings`
- `jsPrintSetup.getPrintSettings(printerName)` - get current print settings for `printerName`  
- `jsPrintSetup.getPrintersList` - get list of available printers
- `jsPrintSetup.getGlobalPrintSettings` - get global print settings 
- `jsPrintSetup.savePrintSettings(printSettings, optionSet, setDefaultPrinterName)` - change and save subset (or all) of print settings  
- `jsPrintSetup.getDefaultPrinterName` - get dfault printer name 
- `jsPrintSetup.getJobInfo(jobId)` - get status information about print jobId

`jsPrintSetup` Events/Messages

In addition `jsPrintSetup` object post messages to `page scripts` about print jobs which are little transformed and *purified* case of events fired by `printservice` API.
- `job_start`
- `job_submited`
- `job_progress`
- `job_complete`
- `job_error`
  
### [test-jsp.html](https://github.com/edabg/web-ext-experiment-printservice/blob/master/test-jsp.html) `page script` test example.

This test HTML page contains two simple frames and expose for testing following functionality.
- print main window `window.jsPrintSetup.print` with predifined print setting `silent`, `headerStr*`, `footerStr*`, `printerName`
- print frame 1 `window.frames[0].jsPrintSetup.print` with same print settings as main window
- print frame 2 `window.frames[0].jsPrintSetup.print` with same print settings as main window
- track events/messages during print process about different jobs - start/progress/complete ...
- get list of available printers
- get default printer name
- get default print settings
- get global print settings
- save/modify print settings selectively
