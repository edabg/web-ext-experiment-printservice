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
var Ci = Components.interfaces;
var CiById = Components.interfacesById;
var Cr = Components.Results;

let IPS = Ci.nsIPrintSettings;

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
  }
};


var jsPrintSetup = {

	constants : {
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
	},
	
	lastJobId : 0,

	printSettings : {
	  
	},
	
	init: function() {
    // initialize constants like properties
    for (var cname in jsPrintSetup.constants) {
    	jsPrintSetup[cname] = jsPrintSetup.constants[cname];
    }	
    browser.runtime.onMessage.addListener(jsPrintSetup.backgroundMessageHandler);
	},
	
	backgroundMessageHandler : function(request) {
//    console.log("Message from the background script:"+request.message);
    if (request.message == "state_change") {
//      console.log("stateFlags:"+request.stateFlags+" status:"+request.status);
      // check for start
      if ((request.stateFlags & jsPrintSetup.WPL_STATE_START) && (request.stateFlags & jsPrintSetup.WPL_STATE_IS_NETWORK)) {
        printJobList.started(request.jobId);
        jsPrintSetup.postMessage(
          "job_start"
          , {
            jobId : printJobList.getLocalJobId(request.jobId)
          }
        );
      }
      // check for completion
      if ((request.stateFlags & jsPrintSetup.WPL_STATE_STOP) && (request.stateFlags & jsPrintSetup.WPL_STATE_IS_NETWORK)) {
        printJobList.completed(request.jobId);
        jsPrintSetup.postMessage(
          "job_complete"
          , {
            jobId : printJobList.getLocalJobId(request.jobId)
          }
        );
      }
//      jsPrintSetup.postMessage(
//        "state_change"
//        , {
//          jobId : printJobList.getLocalJobId(request.jobId)
//          , stateFlags: request.stateFlags
//          , status: request.status
//        }
//      );
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
        jsPrintSetup.postMessage(
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
      jsPrintSetup.postMessage(
        "job_error"
        , {
          jobId : printJobList.getLocalJobId(request.jobId)
          , "statusMessage": request.statusMessage
        }
      );
    }
      
    return Promise.resolve({response: "Message received"});
  },
  
  postMessage: function(message, msgData) {
    let msg = {"source": "jsPrintSetup", "message": message};
//    if ((msgData !== null) && (typeof(msgData[Symbol.iterator]) === "function")) {
    if (msgData !== null) {
      for(let i in msgData)
        msg[i] = msgData[i];
    }
    window.postMessage(msg, "*");
  },
  
	setOption : function (option, value) {
			alert("setOption("+option+","+value+")");
	},

	setGlobalOption : function (option, value) {
			alert("setGlobalOption("+option+","+value+")");
	},

	getOption : function (option) {
	},

	getGlobalOption : function (option) {
	},
	
	saveOptions : function (optionSet) {
	},
	
	saveGlobalOptions : function (optionSet) {
	},
	
	refreshOptions : function () {
	},
	
	print: function(printSettings) {
/*	  
	  let testPrintSettings = {
        "printSilent": true
//      , "outputFormat": this.kOutputFormatPDF
//        , "printToFile": true
//        , "toFileName": "/home/mitko/test.pdf"
        , "printerName" : "PDF" // "Virtual_PDF_Printer"
	  };
*/
    let msg = {
      "call": "printTab"
//      , "window":null
      , "printSettings": printSettings
    };
    let localJobId = printJobList.newJob();

    return new window.wrappedJSObject.Promise(
      exportFunction(
        (resolve, reject) => {
          browser.runtime.sendMessage(msg).then(
            (res) => {
//              console.log("iface then:"+res.status);
              printJobList.submited(localJobId, res.jobId);
              jsPrintSetup.postMessage(
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
              jsPrintSetup.postMessage(
                "job_rejected"
                , {
                  jobId: localJobId
                }
              );
              reject(err.message);
            }
          );
        }
        , window.wrappedJSObject
      )
    );
	},
	
	getPrintersList : function() {
    let msg = {
      "call": "listPrinters"
    };
    return new window.wrappedJSObject.Promise(
      exportFunction(
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
        , window.wrappedJSObject
      )
    );
	},

	getPrintSettings : function(printerName) {
    let msg = {
      "call": "getPrintSettings"
      , "printerName": printerName
    };
    return new window.wrappedJSObject.Promise(
      exportFunction(
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
        , window.wrappedJSObject
      )
    );
	},

	getGlobalPrintSettings : function(printerName) {
    let msg = {
      "call": "getGlobalPrintSettings"
    };
    return new window.wrappedJSObject.Promise(
      exportFunction(
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
        , window.wrappedJSObject
      )
    );
	},

	savePrintSettings : function(printSettings, optionSet, setDefaultPrinterName) {
    let msg = {
      "call": "savePrintSettings"
      , "printSettings": printSettings
      , "optionSet": optionSet
      , "setDefaultPrinterName": setDefaultPrinterName
    };
    return new window.wrappedJSObject.Promise(
      exportFunction(
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
        , window.wrappedJSObject
      )
    );
	},
	
	getDefaultPrinterName : function() {
    let msg = {
      "call": "getDefaultPrinterName"
    };
    return new window.wrappedJSObject.Promise(
      exportFunction(
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
        , window.wrappedJSObject
      )
    );
	},


	getJobInfo: function(jobId) {
	  let jobInfo = printJobList.getJobInfoByLocalId(jobId);
	  if (jobInfo !== undefined) {
	    return wrappedJSObjectHelper.cloneObject(jobInfo);
	  } else 
	   return null;
	},
	
	testAsync: function() {
//	  return new Promise((res) => {return "ala bala";});
//	  var x = new window.wrappedJSObject.Promise(function (resolve, reject) {resolve("ala bala");});
//	  return x;
    return new window.wrappedJSObject.Promise(
      exportFunction(
        (resolve, reject) => {
          resolve("ala bala");
          //reject("ala bala");
        }
        , window.wrappedJSObject
      )
    );
	}
}

jsPrintSetup.init();

window.wrappedJSObject.jsPrintSetup = cloneInto(
  jsPrintSetup,
  window,
  {cloneFunctions: true}  
);
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