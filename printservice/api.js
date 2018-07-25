/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
/************************************************************************/
/*                                                                      */
/*      Webextension experiment 'printservice' API proposal             */
/*                                                                      */
/*      2017 Dimitar Angelov                                            */
/*                                                                      */
/************************************************************************/
/*
This experiment propose new API called 'printservice' to web extensions 
which will provide functionality related to print process enhacement via extensions.
I. Common behavior.
  1. This API must provide 'printservice' permisiions which will be re`uired from extensions.
  2. Print settings which can be modified are all settings provided via nsIPrintSetting interface.
  
II. The API.
  Methods
  =======
  printservice.listPrinters()
    Description: Return list of available printers.
    Parameters: None
    Return:
      List names of available printers
  
   printservice.getDefaultPrinterName()
     Description: Return default printer name.
     Parameters: None
     Return:
       Default printer name
  
   printservice.getGlobalPrintSettings()
     Description: Return global print settings.
     Parameters: None
     Return:
       Object with global print settings
  
   printservice.getPrintSettings(printerName = null)
     Description: Return print settings for given printer(or default printer).
     Parameters:
       Optional `printerName`. If is omited default printer name is used.
     Return:
       Object with print settings for `printerName` (or default printer)
  
   printservice.savePrintSettings(printSettings, optionSet = null, setDefaultPrinterName = false)
     Description: Update given print settings and save it in preferences.
     Parameters:
       printSettings - object with print settings to update
         `printerName` property is mandatory. If is blank tha global print settings is assumed.
       optionSet - which set of print setting will be saved in preferences.
       setDefaultPrinterName - if you want to set `printSettings.printerName` as default printer.
     Return:
       Object with all print settings.   
  
   printservice.printTab(tabId = null, frameId = null, printSettings = null)
     Description: Print given tab and specific frame (or main window) with specified print settings.
       This methos have a sense in case of `silent printing`, 
       if is printing via print dialog, the settings are overwritten by dialog.
     Parameters:
       tabId - The id of tab to be printed
       frameId - if particular frame (not main window) wants to be printed
          frameId is 0 fot top most window in tab and outerWindowID of frame if is child frame/window.
          https://searchfox.org/mozilla-central/source/toolkit/modules/addons/WebNavigationFrames.jsm#50
          https://developer.mozilla.org/en-US/docs/Inner_and_outer_windows 
       printSettings - Object with print settings
     Return:
       Promise which is resolved via `jobId` in case of successful print job submission 
       or Promise will be rejected with error message in case of error.  
  
  Events
  ======
    printservice.onStateChange
      Description: Fires on print state change start/stop 
      Data:
        jobId - id of job which is printed
        tabId - id ot tab which is printed
        frameId - id ot frame which is printed (0 - main window)
        stateFlags - see nsIWebProgressListener doc
        status - see nsIWebProgressListener doc
    printservice.onProgressChange
      Description: Fires on print progress change 
      Data:
        jobId - id of job which is printed
        tabId - id ot tab which is printed
        frameId - id ot frame which is printed (0 - main window)
        curSelfProgress - see nsIWebProgressListener doc
        maxSelfProgress - see nsIWebProgressListener doc
        curTotalProgress - see nsIWebProgressListener doc
        maxTotalProgress - see nsIWebProgressListener doc
    printservice.onStatusChange
      Description: Fires on print status change (print error)
      Data:
        jobId - id of job which is printed
        tabId - id ot tab which is printed
        frameId - id ot frame which is printed (0 - main window)
        status - see nsIWebProgressListener doc
        statusMessage - see nsIWebProgressListener doc
*/

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/EventEmitter.jsm");
//XPCOMUtils.defineLazyModuleGetter(this, "EventEmitter", "resource://devtools/shared/event-emitter.js");
console.log("printservice begin...");

/*
Cu.import("resource://gre/modules/ExtensionUtils.jsm"); 

const {
  ExtensionError,
  defineLazyGetter,
} = ExtensionUtils;
*/


Cu.import("resource://gre/modules/ExtensionCommon.jsm");
Cu.import("resource://gre/modules/ExtensionUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

//XPCOMUtils.defineLazyModuleGetter(this, "ExtensionUtils",
//                                  "resource://gre/modules/ExtensionUtils.jsm");
//XPCOMUtils.defineLazyModuleGetter(this, "ExtensionCommon",
//                                  "resource://gre/modules/ExtensionCommon.jsm");
//XPCOMUtils.defineLazyModuleGetter(this, "ExtensionParent",
//                                  "resource://gre/modules/ExtensionParent.jsm");


/*
const {
  DefaultMap,
  EventEmitter,
  LimitedSet,
  defineLazyGetter,
  getMessageManager,
  getUniqueId,
} = ExtensionUtils;
*/
const {
  ExtensionError,
  defineLazyGetter,
} = ExtensionUtils;
/*
const {
  LocalAPIImplementation,
  LocaleData,
  NoCloneSpreadArgs,
  SchemaAPIInterface,
  SingletonEventManager, renamed to EventManager
} = ExtensionCommon;
*/
const {
  EventManager,
} = ExtensionCommon;

//console.log(EventEmitter);
//console.log(EventManager);

let printSettingsService = Cc["@mozilla.org/gfx/printsettings-service;1"].getService(Ci.nsIPrintSettingsService);              

let consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);

const PRINT_SETTINGS_FIELDS = {
  printerName :"printerName",
  orientation : "orientation",
  scaling : "scaling",
  shrinkToFit : "shrinkToFit",
  printBGColors : "printBGColors",
  printBGImages : "printBGImages",
  printInColor : "printInColor",
  printReversed : "printReversed",
  printSilent : "printSilent",
  showPrintProgress : "showPrintProgress",
  printToFile : "printToFile",
  toFileName : "toFileName",
  resolution : "resolution",
  printPageDelay : "printPageDelay",
  duplex : "duplex",
  numCopies : "numCopies",
  howToEnableFrameUI : "howToEnableFrameUI",
  printFrameTypeUsage : "printFrameTypeUsage",
  printFrameType : "printFrameType",
  printRange : "printRange",
  startPageRange : "startPageRange",
  endPageRange : "endPageRange",
  paperName : "paperName",
  paperData : "paperData",
  paperSizeUnit : "paperSizeUnit",
  paperWidth : "paperWidth",
  paperHeight : "paperHeight",
  outputFormat : "outputFormat",
  title : "title",
  docURL: "docURL",
  headerStrLeft : "headerStrLeft",
  headerStrCenter : "headerStrCenter",
  headerStrRight : "headerStrRight",
  footerStrLeft : "footerStrLeft",
  footerStrCenter : "footerStrCenter",
  footerStrRight : "footerStrRight",
  unwriteableMarginLeft : "unwriteableMarginLeft",
  unwriteableMarginRight : "unwriteableMarginRight",
  unwriteableMarginTop : "unwriteableMarginTop",
  unwriteableMarginBottom : "unwriteableMarginBottom",
  edgeLeft : "edgeLeft",
  edgeRight : "edgeRight",
  edgeTop : "edgeTop",
  edgeBottom : "edgeBottom",
  marginLeft : "marginLeft",
  marginRight : "marginRight",
  marginTop : "marginTop",
  marginBottom : "marginBottom"
};

// converts nsIPrintSettings instance properties to PrintSettings object 
function convertPrintSettings(printSettings) {
  if (printSettings == null) 
    return null;
  let obj = {};
  for (let field of Object.keys(PRINT_SETTINGS_FIELDS)) {
    try {
      obj[field] = printSettings[PRINT_SETTINGS_FIELDS[field]];
    } catch (err) {
      obj[field] = null;
    } 
  }
  return obj;  
}

// updates printSettings properties with values in object
function setPrintSettings(printSettings, objSettings) {
  for (let field of Object.keys(PRINT_SETTINGS_FIELDS)) {
    try {
      if ((field in objSettings) && (objSettings[field] != null))
        printSettings[PRINT_SETTINGS_FIELDS[field]] = objSettings[field];
    } catch (err) {
      ;
    } 
  }
}

// print progress listener for a job
/* 
To see how progress events are fired investigate here
 https://dxr.mozilla.org/mozilla-beta/source/layout/printing/nsPrintData.cpp#108

- Start prin job
  onProgressChange progress=0 maxProgress=0
  onStateChange nsIWebProgressListener::STATE_START|nsIWebProgressListener::STATE_IS_DOCUMENT|nsIWebProgressListener::STATE_IS_NETWORK
- On progress change
  onProgressChange progress=currentPage maxProgress=countPages
- End of prin job
  onProgressChange progress=100 maxProgress=100
  OnStateChange nsIWebProgressListener::STATE_STOP|nsIWebProgressListener::STATE_IS_DOCUMENT
  onProgressChange progress=100 maxProgress=100
  OnStateChange nsIWebProgressListener::STATE_STOP|nsIWebProgressListener::STATE_IS_NETWORK
In case ot print error is called
  OnStatusChange with error status code (without error message)  
  
*/

class printProgressListener {
	constructor (jobId, tabId, frameId) {
		this.jobId = jobId;
		this.tabId = tabId;
		this.frameId = frameId;
	}
	
	onStateChange(aWebProgress, aRequest, aStateFlags, aStatus) {
//		console.log(this.jobId, "onStateChange(aWebProgress, aRequest, aStateFlags, aStatus)", aWebProgress, aRequest, aStateFlags, aStatus);
		progressListenerMap.onStateChange(this.jobId, this.tabId, this.frameId, aStateFlags, aStatus);
    // check for completetion
    if ((aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) && (aStateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK)) {
  		// no more events are expected
  		progressListenerMap.removeDelayed(this.jobId);
		}
	}

	onProgressChange(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
//		console.log(this.jobId, "onProgressChange(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)", aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress);
		progressListenerMap.onProgressChange(this.jobId, this.tabId, this.frameId, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress);
	}

	onLocationChange(aWebProgress, aRequest, aLocation, aFlags) {
//		console.log(this.jobId, "onLocationChange(aWebProgress, aRequest, aLocation, aFlags)", aWebProgress, aRequest, aLocation, aFlags);
		// we can ignore this notification
	}

	onStatusChange(aWebProgress, aRequest, aStatus, aMessage) {
//		consloe.log(this.jobId, "onStatusChange(aWebProgress, aRequest, aStatus, aMessage)", aWebProgress, aRequest, aStatus, aMessage);
    // event fires in case of print error aStatus=error_code aMessage=error_message
		progressListenerMap.onStatusChange(this.jobId, this.tabId, this.frameId, aStatus, aMessage);
		// no more events are expected
		progressListenerMap.removeDelayed(this.jobId);
	}

	onSecurityChange(aWebProgress, aRequest, state) {
//      console.log(this.jobId, "onSecurityChange(aWebProgress, aRequest, state)", aWebProgress, aRequest, state);
	}

	QueryInterface(iid) {
		if (iid.equals(Components.interfaces.nsIWebProgressListener) || iid.equals(Components.interfaces.nsISupportsWeakReference))
			return this;
		
		throw Components.results.NS_NOINTERFACE;
	}
}

let progressListenerMap = {
  
  loadPromise: null,
	// Maps numeric jobId -> printProgressListener
	byId: new Map(),

	add(jobId, tabId, frameId) {
		let listener = new printProgressListener(jobId, tabId, frameId);
		this.byId.set(jobId, listener);
		return listener;
	},
	
	remove(jobId) {
		this.byId.delete(jobId);
	},
	
	removeDelayed(jobId) {
	  // remove immediately
	  this.remove(jobId);
	  // TODO: I can't fin how to make timeout here
    //let self = this;	  
    //window.setTimeout(() => {self.remove(jobId);}, 1000);
	},
	
	clear() {
		this.byId.clear();
	},
	
	getById(jobId) {
		return this.byId.get(jobId);
	},
	onStateChange(jobId, tabId, frameId, aStateFlags, aStatus) {
//    console.log("emit onStateChange");
    this.emit("state_change"
      , {
        "jobId": jobId, "tabId": tabId, "frameId": frameId
        , "stateFlags": aStateFlags, "status": aStatus
      }
    );
	},
	onProgressChange(jobId, tabId, frameId, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
//    console.log("emit onProgressChange");
    this.emit("progress_change"
      , {
        "jobId": jobId, "tabId": tabId, "frameId": frameId
        , "curSelfProgress": aCurSelfProgress, "maxSelfProgress": aMaxSelfProgress
        , "curTotalProgress": aCurTotalProgress, "maxTotalProgress": aMaxTotalProgress
      }
    );
	},
	onStatusChange(jobId, tabId, frameId, aStatus, aMessage) {
    this.emit("status_change"
      , {
        "jobId": jobId, "tabId": tabId, "frameId": frameId
        , "status": aStatus
        , "message": aMessage
      }
    );
	}
};
EventEmitter.decorate(progressListenerMap);
//devtools.dump.emit

this.printservice = class extends ExtensionAPI {
  getAPI(context) {
    
    let {extension} = context;
    const {tabManager} = extension;
    let {Management: {global: {windowTracker, tabTracker}}} = Cu.import("resource://gre/modules/Extension.jsm", {});
    
    let printJobId = 0;

    function getTabOrActive(tabId) {
      if (tabId !== null) {
        return tabTracker.getTab(tabId);
      }
      return tabTracker.activeTab;
    }

    function getTabId(tab) {
      return tabTracker.getId(tab);
    }
    
    function getNextPrintJobId() {
        return ++printJobId;
    }
    
    return {
      // Insert Experiment API here.
      // Note: the namespace (printservice must match the id in the install.rdf)
      printservice: {
        async hello() {
          return "Hello, world!";
        }, 
        async printTab(tabId = null, frameId = null, printSettings = null) {
          let printJobId = getNextPrintJobId();
          return new Promise((resolve, reject) => {
            let activeTab = null;
            try {
//throw "Test print error";              
              if (printSettings == null)
                printSettings = {};
              // prepare print settings
              let printSettings_ = printSettingsService.globalPrintSettings;
              if ((typeof(printSettings) == 'object') && ('printerName' in printSettings))
                printSettings_.printerName = printSettings.printerName;
              // First get any defaults from the printer
              try { // on Mac OSX this raise an exception!
                printSettingsService.initPrintSettingsFromPrinter(printSettings_.printerName, printSettings_);
              } catch (err) {
                Cu.reportError(err);
              }
              // now augment them with any values from last time
              try {
                printSettingsService.initPrintSettingsFromPrefs(printSettings_, true, printSettings_.kInitSaveAll);
              } catch (err) {
                Cu.reportError(err);
              }
              setPrintSettings(printSettings_, printSettings);
              //printSettings_.printSilent = true;
              //printSettings_.printToFile = false;
              //printSettings_.printerName = "PDF";
              // get the tab
              activeTab = getTabOrActive(tabId);
              let outerWindowID = 0;  
              if ((frameId == null) || (frameId == 0))
                outerWindowID = activeTab.linkedBrowser.outerWindowID;
              else 
                outerWindowID = frameId;
//              consoleService.logStringMessage("tabId:"+tabId+" frameId: "+frameId+" outerWindowID: "+outerWindowID);  
//              activeTab.linkedBrowser.print(frameId, printSettings, null);
              activeTab.linkedBrowser.print(outerWindowID, printSettings_, progressListenerMap.add(printJobId, getTabId(activeTab), frameId));
//              activeTab.linkedBrowser.print(activeTab.linkedBrowser.outerWindowID, printSettings_, null);
//              consoleService.logStringMessage("Print submitted to: "+printSettings_.printerName);  

// This scenario doesn't work with frameId
//              let contentWindow = Services.wm.getOuterWindowWithId(frameId);
//              let print = contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebBrowserPrint);
//              print.print(printSettings_, null);
              resolve({status:"OK", statusMessage: "print submitted", jobId: printJobId});
            } catch (err){
              Cu.reportError(err);
              progressListenerMap.remove(printJobId);
              reject({status:"ERROR", statusMessage:err, jobId:printJobId});
            }
          });
        },
        async listPrinters() {
          return new Promise((resolve, reject) => {
            let printerList = new Array();
            let printerEnumerator;
            try {
//  throw "Test error!";            
              // Printer Enumerator in Mac OS is not implemented!
              printerEnumerator =	Cc["@mozilla.org/gfx/printerenumerator;1"];
              if (printerEnumerator) { 
                printerEnumerator = printerEnumerator.getService(Ci.nsIPrinterEnumerator);
                if (printerEnumerator)
                  printerEnumerator = printerEnumerator.printerNameList;  
              }
              if (printerEnumerator) {
                let i = 0;
                while(printerEnumerator.hasMore())
                  printerList[i++] = printerEnumerator.getNext();
              } else {
                // In case of Mac OS this.printSettingsService.defaultPrinterName produce error!
                //let printSettingsService = Cc["@mozilla.org/gfx/printsettings-service;1"].getService(Ci.nsIPrintSettingsService);              
                try {
                  printerList[0] = printSettingsService.defaultPrinterName;
                } catch (err) {
                  try {
                    let printSettings = printSettingsService.newPrintSettings;
                    if (printSettings.printerName)
                      printerList[0] = printSettings.printerName;
                  } catch (err) {
                    Cu.reportError(err);
                    reject(err);
                  } 	
                }	
              }
              resolve(printerList);	
            } catch (err) {
              Cu.reportError(err);
              reject(err);
            }
            printerEnumerator = null;		
          });
        }, // listPrinters
        async getDefaultPrinterName() {
          return new Promise((resolve, reject) => {
            resolve(printSettingsService.defaultPrinterName);
          });
        }, // getDefaultPrinterName        

        async getGlobalPrintSettings() {
          return new Promise((resolve, reject) => {
            let printSettings = null;
            try {
              resolve(convertPrintSettings(printSettingsService.globalPrintSettings));
            } catch (err) {
              Cu.reportError(err);
              reject(err);
            }  
          });
        }, // getGlobalPrintSettings        

        async getPrintSettings(printerName = null) {
          return new Promise((resolve, reject) => {
            let printSettings = null;
            try {
              printSettings = printSettingsService.globalPrintSettings;
              if (printerName == null)
                printerName = printSettingsService.defaultPrinterName;
              printSettings.printerName = printerName;  
              // First get any defaults from the printer
              printSettingsService.initPrintSettingsFromPrinter(printSettings.printerName, printSettings);
              // now augment them with any values from last time
              printSettingsService.initPrintSettingsFromPrefs(printSettings, true, printSettings.kInitSaveAll);
              resolve(convertPrintSettings(printSettings));
            } catch (err) {
              Cu.reportError(err);
              reject(err);
            }  
          });
        }, // getPrintSettings        
        
        async savePrintSettings(printSettings, optionSet = null, setDefaultPrinterName = false) {
          return new Promise((resolve, reject) => {
            let printSettings_ = null;
            try {
//throw "Test error!";            
              printSettings_ = printSettingsService.globalPrintSettings;
              printSettings_.printerName = printSettings.printerName;  
              // First get any defaults from the printer
              printSettingsService.initPrintSettingsFromPrinter(printSettings_.printerName, printSettings_);
              // now augment them with any values from last time
              printSettingsService.initPrintSettingsFromPrefs(printSettings_, true, printSettings_.kInitSaveAll);
              setPrintSettings(printSettings_, printSettings);
              if (optionSet == null)
                optionSet = printSettings_.kInitSaveAll;
//              consoleService.logStringMessage("API Printer Name:"+printSettings_.printerName+" optionSet:"+optionSet);
              printSettingsService.savePrintSettingsToPrefs(printSettings_, true, optionSet);
              if (setDefaultPrinterName)
                printSettingsService.savePrintSettingsToPrefs(printSettings_, false, printSettings_.kInitSavePrinterName);
              resolve(convertPrintSettings(printSettings_));              
            } catch (err) {
              Cu.reportError(err);
              reject(err);
            }  
          });
        }, // savePrintSettings
        
        // Events
        onStateChange: new EventManager(context, "printservice.onStateChange", fire => {
          const listener = (event, data) => {
//            console.log("fire async", data);
            fire.async(data);
          };
          progressListenerMap.on("state_change", listener);
          return () => {
            progressListenerMap.off("state_change", listener);
          };
        }).api(), // onStateChange                
        onProgressChange: new EventManager(context, "printservice.onProgressChange", fire => {
          const listener = (event, data) => {
//            console.log("fire async", data);
            fire.async(data);
          };
          progressListenerMap.on("progress_change", listener);
          return () => {
            progressListenerMap.off("progress_change", listener);
          };
        }).api(), // onProgressChange                
        onStatusChange: new EventManager(context, "printservice.onStatusChange", fire => {
          const listener = (event, data) => {
//            console.log("fire async", data);
            fire.async(data);
          };
          progressListenerMap.on("status_change", listener);
          return () => {
            progressListenerMap.off("status_change", listener);
          };// onStatusChange                
        }).api() 
      } // printService
    };
  }
}
