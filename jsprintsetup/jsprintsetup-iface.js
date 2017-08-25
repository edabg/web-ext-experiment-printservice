/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
/************************************************************************/
/*                                                                      */
/*      jsPrintSetup WE - jsPrintSetup web extension content script     */
/*                                                                      */
/*      Copyright (C) 2009-2017 Dimitar Angelov                         */
/*                                                                      */
/*      Distributed under the GNU General Public License version 2      */
/*      See LICENCE.txt file and http://www.gnu.org/licenses/           */
/*                                                                      */
/************************************************************************/

"use strict";

// Imports
//var {interfaces: Ci, manager: Cm, results: Cr, classess: Cc, utils : Cu } = Components;
//var CiById = Components.interfacesById;
//var Cr = Components.Results;
var Ci = Components.interfaces;

let IPS = Ci.nsIPrintSettings;

//console.log("jsPrintSetup iface loaded")

function jsPrintSetupException(message) {
   this.message = message;
   this.name = 'jsPrintSetupException';
}

// Supported Print Settings
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

function assignPrintSettings(dstPrintSettings, srcPrintSettings) {
  if (typeof srcPrintSettings !== 'object') {
    throw new jsPrintSetupException('Ivalid argument srcPrintSettings');
  } 
  if (typeof dstPrintSettings !== 'object' || dstPrintSettings === null) 
    dstPrintSettings = {}; 
  for (let field of Object.keys(PRINT_SETTINGS_FIELDS)) {
    if ((field in srcPrintSettings) && (srcPrintSettings[field] != null))
      dstPrintSettings[PRINT_SETTINGS_FIELDS[field]] = srcPrintSettings[field];
  }
}

// print job list 
// TODO: Completed "old" jobs can be removed
let printJobList = {
  lastLocalId: 0,
  byLocalId: new Map(),
  byServiceId: new Map(),
  
  newJob: function() {
    this.lastLocalId++;
    this.byLocalId.set(
      this.lastLocalId
      , {
        localJobId: this.lastLocalId
        , serviceJobId: null
        , submited: null
        , started: null
        , completed: null
        , error: null
        , statusMessage: null
        , progress: null
      }
    );
    return this.lastLocalId;
  },
  submited: function(localJobId, serviceJobId) {
    let jobInfo = this.byLocalId.get(localJobId);
    if (jobInfo !== undefined) {
      jobInfo.serviceJobId = serviceJobId;
      jobInfo.submited = true;
      jobInfo.progress = 0;
      this.byServiceId.set(serviceJobId, jobInfo);
    }
    return jobInfo;
  },
  rejected: function(localJobId, statusMessage) {
    let jobInfo = this.byLocalId.get(localJobId);
    if (jobInfo !== undefined) {
      jobInfo.serviceJobId = 0;
      jobInfo.submited = false;
      jobInfo.error = true;
      jobInfo.statusMessage = statusMessage;
    }
    return jobInfo;
  },
  started: function(serviceJobId) {
    let jobInfo = this.byServiceId.get(serviceJobId);
    if (jobInfo !== undefined) {
      jobInfo.started = true;
      jobInfo.progress = 0;
    }
    return jobInfo;
  },
  completed: function(serviceJobId) {
    let jobInfo = this.byServiceId.get(serviceJobId);
    if (jobInfo !== undefined) {
      jobInfo.completed = true;
      jobInfo.progress = 100;
    }
    return jobInfo;
  },
  progressChange: function(serviceJobId, progress) {
    let jobInfo = this.byServiceId.get(serviceJobId);
    if (jobInfo !== undefined) {
      jobInfo.progress = progress;
    }
    return jobInfo;
  },
  error: function(serviceJobId, statusMessage) {
    let jobInfo = this.byServiceId.get(serviceJobId);
    if (jobInfo !== undefined) {
      jobInfo.error = true;
      jobInfo.statusMessage = statusMessage;
    }
    return jobInfo;
  },
  getJobInfoByLocalId: function(jobId) {
    return this.byLocalId.get(jobId);
  },
  getJobInfoByServiceId: function(jobId) {
    return this.byServiceId.get(jobId);
  },
  getLocalJobId: function(serviceJobId) {
    let jobInfo = this.byServiceId.get(serviceJobId);
    if (jobInfo !== undefined) {
      return jobInfo.serviceJobId;
    }
    return undefined;
  }
};

// helper functions for wrappedJSObject
var wrappedJSObjectHelper = {
  cloneArray: function (fromArray) {
    let clonedArray = new window.wrappedJSObject.Array();
    for (let i in fromArray)
      clonedArray[i] = fromArray[i];
    return clonedArray;
  },
  cloneObject: function (fromObject) {
    let clonedObject = new window.wrappedJSObject.Object();
    for (let i in fromObject)
      clonedObject[i] = fromObject[i];
    return clonedObject;
  },
  newPromise: function(executor) {
    return new window.wrappedJSObject.Promise(
      exportFunction(
        executor
        , window.wrappedJSObject
      )
    );
  }
};


// jsPrintSetup interface constructor
function jsPrintSetupIface() {
//  console.log("Constructor");

  // 'private' members
  var self = this;
	var constants = {
		// Save Options Constants
		kSaveOddEvenPages : IPS.kInitSaveOddEvenPages,
		kSaveHeaderLeft   : IPS.kInitSaveHeaderLeft,	
		kSaveHeaderCenter : IPS.kInitSaveHeaderCenter,
		kSaveHeaderRight  : IPS.kInitSaveHeaderRight,
		kSaveFooterLeft   : IPS.kInitSaveFooterLeft,
		kSaveFooterCenter : IPS.kInitSaveFooterCenter,
		kSaveFooterRight  : IPS.kInitSaveFooterRight,
		kSaveBGColors     : IPS.kInitSaveBGColors ,
		kSaveBGImages     : IPS.kInitSaveBGImages,
		kSavePaperSize    : IPS.kInitSavePaperSize,
		kSavePaperData    : IPS.kInitSavePaperData,
		kSavePaperSizeNativeData : IPS. kPaperSizeNativeData,
		kSavePaperWidth   : IPS.kInitSaveUnwriteableMargins,
		kSavePaperHeight  : IPS.kInitSaveEdges,
		kSaveInColor      : IPS.kInitSaveInColor,
		kSaveOrientation  : IPS.kInitSaveOrientation,
		kSavePrinterName  : IPS.kInitSavePrinterName,
		kSavePageDelay    : IPS.kInitSavePageDelay,
		kSaveMargins      : IPS.kInitSaveMargins,
		kSaveShrinkToFit  : IPS.kInitSaveShrinkToFit,
		kSaveResolutionName : IPS.kInitSaveResolutionName,
		kInitSaveDuplex     : IPS.kInitSaveDuplex,
		kSaveScaling      : IPS. kInitSaveScaling,

		// Page Size Unit Constants 
		kPaperSizeInches      : IPS.kPaperSizeInches,
		kPaperSizeMillimeters : IPS.kPaperSizeMillimeters,

		// Page Orientation Constants
		kPortraitOrientation      : IPS.kPortraitOrientation,
		kLandscapeOrientation     : IPS.kLandscapeOrientation,

		// Paper Size Data Constants
   	kPaperSizeNativeData      : IPS.kPaperSizeNativeData,
   	kPaperSizeDefined         : IPS.kPaperSizeDefined,
   
		// Print Range Enums 
		kRangeAllPages            : IPS.kRangeAllPages,
		kRangeSpecifiedPageRange  : IPS.kRangeSpecifiedPageRange,
		kRangeSelection           : IPS.kRangeSelection,
		kRangeFocusFrame          : IPS.kRangeFocusFrame,

		// Output format
		kOutputFormatNative       : IPS.kOutputFormatNative,
		kOutputFormatPS           : IPS.kOutputFormatPS,
		kOutputFormatPDF          : IPS.kOutputFormatPDF,
	
		// Shorthand Combined Saving Constants
		kSaveHeader               :  
			IPS.kInitSaveHeaderLeft | IPS.kInitSaveHeaderCenter | IPS.kInitSaveHeaderRight | 
			IPS.kInitSaveFooterLeft | IPS.kInitSaveFooterCenter | IPS.kInitSaveFooterRight,
			
		kSaveMarginsAndOrientation : IPS.kInitSaveOrientation | IPS.kInitSaveMargins,
		
		kSaveMarginsAndHeader      : 
			IPS.kInitSaveHeaderLeft | IPS.kInitSaveHeaderCenter | IPS.kInitSaveHeaderRight | 
			IPS.kInitSaveFooterLeft | IPS.kInitSaveFooterCenter | IPS.kInitSaveFooterRight |
			IPS.kInitSaveOrientation | IPS.kInitSaveMargins,

		kSaveAll                   : IPS.kInitSaveAll, 

		// Permissions constants										
		JSPS_ALLOW_ACTION   : Ci.nsIPermissionManager.ALLOW_ACTION,
		JSPS_DENY_ACTION    : Ci.nsIPermissionManager.DENY_ACTION,
		JSPS_UNKNOWN_ACTION : Ci.nsIPermissionManager.UNKNOWN_ACTION,
		
		// Progress Listener Status constants
    WPL_STATE_START: Ci.nsIWebProgressListener.STATE_START, // 1
    WPL_STATE_STOP: Ci.nsIWebProgressListener.STATE_STOP, // 16
    WPL_STATE_IS_DOCUMENT: Ci.nsIWebProgressListener.STATE_IS_DOCUMENT, // 131072
    WPL_STATE_IS_NETWORK: Ci.nsIWebProgressListener.STATE_IS_NETWORK, // 262144
    WPL_STATE_IS_WINDOW: Ci.nsIWebProgressListener.STATE_IS_WINDOW, // 524288
	}; // constants

  function _postMessage(message, msgData) {
    let msg = {"source": "jsPrintSetup", "message": message};
//    if ((msgData !== null) && (typeof(msgData[Symbol.iterator]) === "function")) {
    if (msgData !== null) {
      for(let i in msgData)
        msg[i] = msgData[i];
    }
    window.postMessage(msg, "*");
  } // postMessage
  
  function error(msg) {
    console.log("jsPrintSetup Error: "+msg);
  } // error

  function checkOptionName(option) {
    if (!(option in PRINT_SETTINGS_FIELDS))
      throw jsPrintSetupException("Invalid option '"+option+"'");
  } // checkOptionName
 
	function backgroundMessageHandler(request) {
//    console.log("Message from the background script:"+request.message);
    if (request.message == "state_change") {
//      console.log("stateFlags:"+request.stateFlags+" status:"+request.status);
      // check for start
      if ((request.stateFlags & constants.WPL_STATE_START) && (request.stateFlags & constants.WPL_STATE_IS_NETWORK)) {
        printJobList.started(request.jobId);
        _postMessage(
          "job_start"
          , {
            jobId : printJobList.getLocalJobId(request.jobId)
          }
        );
      }
      // check for completion
      if ((request.stateFlags & constants.WPL_STATE_STOP) && (request.stateFlags & constants.WPL_STATE_IS_NETWORK)) {
        let localJobId = printJobList.getLocalJobId(request.jobId); 
        printJobList.completed(request.jobId);
        _postMessage(
          "job_complete"
          , {
            jobId : localJobId
          }
        );
      }
    } else if (request.message == "progress_change") {
//      console.log("progress change");
      let progress = undefined;
      if (request.maxSelfProgress > 0) {
        progress = request.curSelfProgress*100/request.maxSelfProgress;
        if (progress > 100)
          progress = 100;
      }
      let jobInfo = printJobList.progressChange(request.jobId, progress);
      if (jobInfo && jobInfo.started) {
        _postMessage(
          "job_progress"
          , {
            jobId : printJobList.getLocalJobId(request.jobId)
            , "progress": progress
          }
        );
      }
    } else if (request.message == "status_change") {
//      console.log("status change");
      // this fires in case of error
      printJobList.error(request.jobId, request.statusMessage);
      _postMessage(
        "job_error"
        , {
          jobId : printJobList.getLocalJobId(request.jobId)
          , "statusMessage": request.statusMessage
        }
      );
    }
      
    return Promise.resolve({response: "Message received"});
  } // backgroundMessageHandler
  
  function init() {
    // initialize constants like properties
    self.lastJobId = 0;

    self.printerName = "";
      
  	self.printSettings = {};
  	self.globalPrintSettings = {};
  	
    for (var cname in constants) {
    	self[cname] = constants[cname];
    }	
    browser.runtime.onMessage.addListener(backgroundMessageHandler);
  } 

  init();  
  
  // follow public (exported) methods

  this.refreshOptions = function() {
    self.printSettings = {};
    self.globalPrintSettings = {};
//    self.printerName = "";

    // get default printer name if not is set    
    let p0;
    if (self.printerName == "") {
      let msg = {
        "call": "getDefaultPrinterName"
      };
      p0 = new Promise(
          (resolve, reject) => {
            browser.runtime.sendMessage(msg).then(
              (printerName) => {
                console.log("printer name resolved");
                self.printerName = printerName;
                resolve(printerName);
              }
              , (err) => {
                console.log("printer name rejected");
                reject(err.message);
              }
            );
          }
      );
    } else {
      p0 = Promise.resolve();
    }
    
    let p1 = new Promise(
      (resolve, reject) => {
        function noop() {}
        // imitate finally when printerName is determined
        p0.then(noop).catch(noop).then(() => {
          // gets global print settings
          let msg = {
            "call": "getGlobalPrintSettings"
          };
          let p2 = browser.runtime.sendMessage(msg).then(
            (printSettings) => {
              console.log("global print settings got");
              assignPrintSettings(self.globalPrintSettings, printSettings);
            }
            , (err) => {
              error(err);
            }
          );
          // after 'finally' global settings initialized
          p2.then(noop).catch(noop).then(() => {
            // gets this printer prinSettings
            let msg = {
              "call": "getPrintSettings"
              , "printerName": self.printerName
            };
            let p3 = browser.runtime.sendMessage(msg).then(
              (printSettings) => {
                console.log("print settings got");
                assignPrintSettings(self.printSettings, printSettings);
                if (self.printerName == "")
                  self.printerName = self.printSettings.printerName;
              }
              , (err) => {
                error(err);
              }
            );
            p3.then(
              () => resolve()
              , (err) => reject()
            );
          });
        });
      }
    );

    return p1;
  }; // refreshOptions
  
  this.checkPermissions = function() {
    let msg = {
      "call": "checkPermissions"
    };
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        browser.runtime.sendMessage(msg).then(
          (permissions) => {
            resolve(permissions);
          }
          , (err) => {
            reject(err.message);
          }
        );
      }
    );
  }; // checkForPermissions
  
  this.lazyInit = function() {
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        self.refreshOptions().then(
          () => resolve()
          , (err) => reject(err)
        );
      }
    );
  }; // lazyInit
  
  this.getPrinter = function() {
    return self.printerName;
  }; // getPrinter

  this.setPrinter = function(printerName) {
    self.printerName = printerName;
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        self.refreshOptions().then(
          () => resolve()
          , (err) => reject(err)
        );
      }
    );
  }; // getPrinter
  
	this.setOption = function (option, value) {
	  checkOptionName(option);
	  // TODO: Option vaue adjustements
		self.printSettings[option] = value;
	}; // setOption

	this.setGlobalOption = function (option, value) {
	  checkOptionName(option);
	  // TODO: Option vaue adjustements
		self.globalPrintSettings[option] = value;
	}; // setGlobalOption

	this.getOption = function (option) {
	  checkOptionName(option);
	  if (option in self.printSettings)
      return self.printSettings[option];
    else 
      return undefined;	    
	}; // getOption

	this.getGlobalOption = function (option) {
	  checkOptionName(option);
	  // TODO: Option vaue adjustements
	  if (option in self.globalPrintSettings)
      return self.globalPrintSettings[option];
    else 
      return undefined;	    
	};
	
	this.getOptions = function() {
	  // TODO: Option vaue adjustements
	  return wrappedJSObjectHelper.cloneObject(self.printSettings);
	};
	
	this.getGlobalOptions = function() {
	  // TODO: Option vaue adjustements
	  return wrappedJSObjectHelper.cloneObject(self.globalPrintSettings);
	};
	
	this.saveOptions = function (optionSet) {
	  // TODO:
	};
	
	this.saveGlobalOptions = function (optionSet) {
	  // TODO:
	};
	
	this.printWindow = function(win, printSettings) {
	  // indirect call of jsPrintSetup object in this 'win' window  
	  win.wrappedJSObject.jsPrintSetup.print(printSettings);
	}; // printWindow

	this.print = function(printSettings) {
	  // TODO: printSettins Option vaue adjustements
    if (typeof printSettings  === "undefined" || printSettings === null)
      printSettings = this.printSettings;
    let msg = {
      "call": "printTab"
      , "printSettings": printSettings
    };
    let localJobId = printJobList.newJob();

    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        browser.runtime.sendMessage(msg).then(
          (res) => {
//              console.log("iface then:"+res.status);
            printJobList.submited(localJobId, res.jobId);
            postMessage(
              "job_submited"
              , {
                jobId: localJobId
              }                                 
            );
            resolve(localJobId);
          }
          , (err) => {
//              console.log("iface err:"+err.message);
            printJobList.rejected(localJobId, err.message);
            postMessage(
              "job_rejected"
              , {
                jobId: localJobId
              }
            );
            reject(err.message);
          }
        );
      }
    );
	}; // print

	this.getPrintersList = function() {
    let msg = {
      "call": "listPrinters"
    };
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        browser.runtime.sendMessage(msg).then(
          (printers) => {
            console.log("CS:"+printers);
            resolve(wrappedJSObjectHelper.cloneArray(printers));
          }
          , (err) => {
            reject(err.message);
          }
        );
      }
    );
	}; // getPrintersList

	this.getPrintSettings = function(printerName) {
	  if (typeof printerName === "undefined" || printerName === null)
      printerName = '';
    let msg = {
      "call": "getPrintSettings"
      , "printerName": printerName
    };
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        browser.runtime.sendMessage(msg).then(
          (printSettings) => {
        	  // TODO: printSettings Option vaue adjustements
            resolve(wrappedJSObjectHelper.cloneObject(printSettings));
          }
          , (err) => {
            reject(err.message);
          }
        );
      }
    );
	}; // getPrintSettings

	this.getGlobalPrintSettings = function(printerName) {
    let msg = {
      "call": "getGlobalPrintSettings"
    };
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        browser.runtime.sendMessage(msg).then(
          (printSettings) => {
        	  // TODO: printSettings Option vaue adjustements
            resolve(wrappedJSObjectHelper.cloneObject(printSettings));
          }
          , (err) => {
            reject(err.message);
          }
        );
      }
    );
	}; // getGlobalPrintSettings

	this.savePrintSettings = function(printSettings, optionSet, setDefaultPrinterName) {
 	  // TODO: printSettings Option vaue adjustements
    let msg = {
      "call": "savePrintSettings"
      , "printSettings": printSettings
      , "optionSet": optionSet
      , "setDefaultPrinterName": setDefaultPrinterName
    };
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        browser.runtime.sendMessage(msg).then(
          (printSettings) => {
            resolve(wrappedJSObjectHelper.cloneObject(printSettings));
          }
          , (err) => {
            reject(err.message);
          }
        );
      }
    );
	}; // savePrintSettings

	this.getDefaultPrinterName = function() {
    let msg = {
      "call": "getDefaultPrinterName"
    };
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        browser.runtime.sendMessage(msg).then(
          (printerName) => {
            resolve(printerName);
          }
          , (err) => {
            reject(err.message);
          }
        );
      }
    );
	}; // getDefaultPrinterName

	this.getJobInfo = function(jobId) {
	  let jobInfo = printJobList.getJobInfoByLocalId(jobId);
	  if (jobInfo !== undefined) {
	    return wrappedJSObjectHelper.cloneObject(jobInfo);
	  } else 
	   return null;
	}; // getJobInfo

	this.testAsync = function() {
//	  return new Promise((res) => {return "ala bala";});
//	  var x = new window.wrappedJSObject.Promise(function (resolve, reject) {resolve("ala bala");});
//	  return x;
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        resolve("ala bala");
        //reject("ala bala");
      }
    );
	}; // testAsync

} // jsPrintSetupIface


//var jsPrintSetup = new jsPrintSetupIface();
//console.log(typeof jsPrintSetup.getOption);

window.wrappedJSObject.jsPrintSetup = cloneInto(
  new jsPrintSetupIface(),
  window,
  {cloneFunctions: true}  
);
//console.log("jsPrintSetup iface end")

//Object.defineProperty(window, "browser", { value: this.browser, enumerable: true });

/*
// create jsPrintSetup object in page script DOM context 
var jsPrintSetup = new jsPrintSetupClass();
 
var jsPrintSetupObj = createObjectIn(unsafeWindow, {defineAs: "jsPrintSetup"});
// define properties of type constants
for(let constName in jsPrintSetup.constants) {
		Object.defineProperty(
			jsPrintSetupObj
			, constName
			, {
				configurable: false,
				enumerable  : false,
				value       : jsPrintSetup.constants[constName],
				writeable   : false
			}
		);
}
//makeObjectPropsNormal(jsPrintSetupObj);		

//exportFunction(jsPrintSetup.setOption, jsPrintSetupObj, {defineAs: "setOption"});
// export functions
for(let methodName in jsPrintSetup) {
	if (typeof(jsPrintSetup[methodName]) == "function")
		exportFunction(jsPrintSetup[methodName], jsPrintSetupObj, {defineAs: methodName});
}

*/