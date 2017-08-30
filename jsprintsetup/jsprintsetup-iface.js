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
//TODO: remove Components.interfaces and define constants as numerics

function jsPrintSetupException(message, type="common") {
   this.message = message;
   this.name = 'jsPrintSetupServiceException';
   this.type = type;
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

  const JSP_VERSION = "1.0";
  
  const SET_TYPE_GLOBAL = "global";
  const SET_TYPE_PRINTER = "printer";
  
  const ERROR_TYPE_SILENT = "silent";
  const ERROR_TYPE_EXCEPTION = "exception";
   
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
  } // assignPrintSettings

  function _postMessage(message, msgData) {
    let msg = {"source": "jsPrintSetup", "message": message};
//    if ((msgData !== null) && (typeof(msgData[Symbol.iterator]) === "function")) {
    if (msgData !== null) {
      for(let i in msgData)
        msg[i] = msgData[i];
    }
    window.postMessage(msg, "*");
  } // postMessage
  
  function error(msg, errorType = ERROR_TYPE_SILENT) {
    if (errorType === ERROR_TYPE_SILENT)
      console.log("jsPrintSetup Error: "+msg);
    else 
      throw new jsPrintSetupException(msg);
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
      // this event fires in case of error
      printJobList.error(request.jobId, request.statusMessage);
      _postMessage(
        "job_error"
        , {
          jobId : printJobList.getLocalJobId(request.jobId)
          , "statusMessage": request.statusMessage
        }
      );
    } else if (request.message == "jsp_permission") {
//      console.log("permission change");
      // relay message to page scripts
      _postMessage(
        "jsp_permission"
        , {
            accessEnabled: request.accessEnabled
            , permission: request.permission
        }
      );
    }
      
    return Promise.resolve({response: "Message received"});
  } // backgroundMessageHandler

  // convert value inches <-> milimeters
  function adjustUnitValue(value, unitFrom, unitTo) {
    if (unitFrom != unitTo) {
      // Different Paper Size Units 
      if (unitTo == self.kPaperSizeInches) {
        // value is in mm -> convert to inches
        return value / 25.4;
      } else {
        // value is in inches -> convert to mm
        return value * 25.4;
      }
    } else {
      return value;
    }
  }
  
  // converts string to boolean
  function toBool(value){
    if (typeof(value) === "boolean")
      return value;
    else  
      return ((value == "true") || (value == "1")? true:false);
  }
  
  // convert scaling from percent to actual unit using from mozilla and reverse
  function scalingConvert(scaling) {
    if (scaling < 10.0) {
      scaling = 10.0;
    }
    if (scaling > 500.0) {
      scaling = 500.0;
    }
    scaling /= 100.0;
    return scaling;
  }

  function scalingConvertR(scaling) {
    return scaling*100;
  }  
  
  // Converts settings from client to service
  function convertSettings(settings, settingType, errorType) {
    let isGlobal = (settingType === SET_TYPE_GLOBAL);
    let cSettings = {};
    for(let option in settings) {
      let value = settings[option];
      switch(option) {
        case "orientation":
          if ((value == self.kPortraitOrientation) || (value == self.kLandscapeOrientation))
            cSettings.orientation = value;
          else {
            error("Invalid paper orientation! Valid values are jsPrintSetup.kPortraitOrientation and jsPrintSetup.kLandscapeOrientation.", errorType);
          }
          break;
        // Margins are always in inches 
        // The margins define the positioning of the content on the page.
        // They"re treated as an offset from the "unwriteable margin"
        // (described below).
        case "marginTop":
          cSettings.marginTop = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        case "marginLeft":
          cSettings.marginLeft = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        case "marginRight":
          cSettings.marginRight = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        case "marginBottom":
          cSettings.marginBottom = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        // The edge measurements (in inches) define the positioning of the headers
        // and footers on the page. They"re measured as an offset from
        // the "unwriteable margin" (described below).
        case "edgeTop":
          cSettings.edgeTop = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        case "edgeLeft":
          cSettings.edgeLeft = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        case "edgeBottom":
          cSettings.edgeBottom = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        case "edgeRight":
          cSettings.edgeRight = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
  			// The unwriteable margin (in inches) defines the printable region of the paper, creating
        // an invisible border from which the edge and margin attributes are measured.
        case "unwriteableMarginTop":
          cSettings.unwriteableMarginTop = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        case "unwriteableMarginLeft":
          cSettings.unwriteableMarginLeft = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        case "unwriteableMarginBottom":
          cSettings.unwriteableMarginBottom = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        case "unwriteableMarginRight":
          cSettings.unwriteableMarginRight = adjustUnitValue(value, self.paperSizeUnit, self.kPaperSizeInches);
          break;
        
        // Header and footer
        case "headerStrCenter":
          cSettings.headerStrCenter = value;
          break;
        case "headerStrLeft":
          cSettings.headerStrLeft = value;
          break;
        case "headerStrRight":
          cSettings.headerStrRight = value;
          break;
        case "footerStrCenter":
          cSettings.footerStrCenter = value;
          break;
        case "footerStrLeft":
          cSettings.footerStrLeft = value;
          break;
        case "footerStrRight":
          cSettings.footerStrRight = value;
          break;
        // Other	
        case "scaling":
          cSettings.scaling = scalingConvert(value);
          break;
        case "shrinkToFit":
          cSettings.shrinkToFit = toBool(value);
          break;
        case "numCopies":
          cSettings.numCopies = value;
          break;				
        case "outputFormat":
          if([self.kOutputFormatNative, self.kOutputFormatPS, self.kOutputFormatPDF].indexOf(value) == -1)
            error("Ivalid output fromat value! Valid values are jsPrintSetup.kOutputFormatNative, jsPrintSetup.kOutputFormatPS, jsPrintSetup.kOutputFormatPDF.", errorType);
          cSettings.outputFormat = value;				
          break;				
        case "paperName":
          cSettings.paperName = value;				
          break;				
        case "paperData":
          cSettings.paperData = value;				
          break;				
        case "paperSizeType":
          if([self.kPaperSizeNativeData, self.kPaperSizeDefined].indexOf(value) == -1)
            error("Ivalid paper size type value! Valid values are jsPrintSetup.kPaperSizeNativeData, jsPrintSetup.kPaperSizeDefined.", errorType);
          cSettings.paperSizeType = value;				
          break;
        case "paperSizeUnit":
//          console.log("The property paperSizeUnit is readonly!");
          cSettings.paperSizeUnit = value;				
          break;			
        case "paperHeight":
          if (isGlobal) {
        		cSettings.paperHeight = adjustUnitValue(value, self.paperSizeUnit, self.globalPrintSettings.paperSizeUnit);
          } else {
        		// Here must be self.printSettings.paperSizeUnit, but actualy don"t work properly
        		// to work well we are using self.globalPrintSettings.paperSizeUnit
        		cSettings.paperHeight = adjustUnitValue(value, self.paperSizeUnit, self.globalPrintSettings.paperSizeUnit);
          }
          break;				
        case "paperWidth":
          if (isGlobal) {
        		cSettings.paperWidth = adjustUnitValue(value, self.paperSizeUnit, self.globalPrintSettings.paperSizeUnit);
          } else {
        		// Here must be self.printSettings.paperSizeUnit, but actualy don't work properly
        		// to work well we are using self.globalPrintSettings.paperSizeUnit
        		cSettings.paperWidth = adjustUnitValue(value, self.paperSizeUnit, self.globalPrintSettings.paperSizeUnit);
          }
          break;
        case "printRange":
          cSettings.printRange = value;				
          break;
        case "startPageRange":
          cSettings.startPageRange = value;				
          break;
        case "endPageRange":
          cSettings.endPageRange = value;				
          break;
        case "printSilent":
          cSettings.printSilent = toBool(value);				
          break;									
        case "showPrintProgress":
          cSettings.showPrintProgress = toBool(value);				
          break;
        case "printBGColors" :
          cSettings.printBGColors = toBool(value);				
          break;										
        case "printBGImages" :
          cSettings.printBGImages = toBool(value);				
          break;										
        case "duplex" :
          cSettings.duplex = value; //?? TODO: Check is this implemented				
          break;										
        case "resolution" :
          cSettings.resolution = value;				
          break;										
        case "title":
          cSettings.title = value;
          break;
        case "printToFile" :
          cSettings.printToFile = toBool(value);				
          break;										
        case "toFileName":
          cSettings.toFileName = value;
          break;
        default :
          if (option in PRINT_SETTINGS_FIELDS)
            cSettings[option] = value;
          else
            error("Not supported option:"+option, errorType);
      }
    } // for
    return cSettings;
  } // convertSettings

  // Converts settings from service to client
  function convertSettingsR(settings, settingType, errorType) {
    let isGlobal = (settingType === SET_TYPE_GLOBAL);
    let cSettings = {};
    for(let option in settings) {
      let value = settings[option];
      switch(option) {
        case 'orientation':
          cSettings.orientation = value;
          break;
        // Margins are always in inches 
        // The margins define the positioning of the content on the page.
        // They're treated as an offset from the "unwriteable margin"
        // (described below).
        case 'marginTop':
          cSettings.marginTop = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        case 'marginLeft':
          cSettings.marginLeft = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        case 'marginRight':
          cSettings.marginRight = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        case 'marginBottom':
          cSettings.marginBottom = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        // The edge measurements (in inches) define the positioning of the headers
        // and footers on the page. They're measured as an offset from
        // the "unwriteable margin" (described below).
        case 'edgeTop':
          cSettings.edgeTop = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        case 'edgeLeft':
          cSettings.edgeLeft = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        case 'edgeBottom':
          cSettings.edgeBottom = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        case 'edgeRight':
          cSettings.edgeRight = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
  			// The unwriteable margin (in inches) defines the printable region of the paper, creating
        // an invisible border from which the edge and margin attributes are measured.
        case 'unwriteableMarginTop':
          cSettings.unwriteableMarginTop = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        case 'unwriteableMarginLeft':
          cSettings.unwriteableMarginLeft = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        case 'unwriteableMarginBottom':
          cSettings.unwriteableMarginBottom = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        case 'unwriteableMarginRight':
          cSettings.unwriteableMarginRight = adjustUnitValue(value, self.kPaperSizeInches, self.paperSizeUnit);
          break;
        
        // Header and footer
        case 'headerStrCenter':
          cSettings.headerStrCenter = value;
          break;
        case 'headerStrLeft':
          cSettings.headerStrLeft = value;
          break;
        case 'headerStrRight':
          cSettings.headerStrRight = value;
          break;
        case 'footerStrCenter':
          cSettings.footerStrCenter = value;
          break;
        case 'footerStrLeft':
          cSettings.footerStrLeft = value;
          break;
        case 'footerStrRight':
          cSettings.footerStrRight = value;
          break;
        // Other	
        case 'scaling':
          cSettings.scaling = scalingConvert(value);
          break;
        case 'shrinkToFit':
          cSettings.shrinkToFit = toBool(value);
          break;
        case 'numCopies':
          cSettings.numCopies = value;
          break;				
        case 'outputFormat':
          cSettings.outputFormat = value;				
          break;				
        case 'paperName':
          cSettings.paperName = value;				
          break;				
        case 'paperData':
          cSettings.paperData = value;				
          break;				
        case 'paperSizeType':
          cSettings.paperSizeType = value;				
          break;
        case 'paperSizeUnit':
          cSettings.paperSizeUnit = value;				
          break;			
        case 'paperHeight':
          if (isGlobal) {
        		cSettings.paperHeight = adjustUnitValue(value, self.globalPrintSettings.paperSizeUnit, self.paperSizeUnit);
          } else {
        		// Here must be self.printSettings.paperSizeUnit, but actualy don't work properly
        		// to work well we are using self.globalPrintSettings.paperSizeUnit
        		cSettings.paperHeight = adjustUnitValue(value, self.globalPrintSettings.paperSizeUnit, self.paperSizeUnit);
          }
          break;				
        case 'paperWidth':
          if (isGlobal) {
        		cSettings.paperWidth = adjustUnitValue(value, self.globalPrintSettings.paperSizeUnit, self.paperSizeUnit);
          } else {
        		// Here must be self.printSettings.paperSizeUnit, but actualy don't work properly
        		// to work well we are using self.globalPrintSettings.paperSizeUnit
        		cSettings.paperWidth = adjustUnitValue(value, self.globalPrintSettings.paperSizeUnit, self.paperSizeUnit);
          }
          break;
        case 'printRange':
          cSettings.printRange = value;				
          break;
        case 'startPageRange':
          cSettings.startPageRange = value;				
          break;
        case 'endPageRange':
          cSettings.endPageRange = value;				
          break;
        case 'printSilent':
          cSettings.printSilent = toBool(value);				
          break;									
        case 'showPrintProgress':
          cSettings.showPrintProgress = toBool(value);				
          break;
        case 'printBGColors' :
          cSettings.printBGColors = toBool(value);				
          break;										
        case 'printBGImages' :
          cSettings.printBGImages = toBool(value);				
          break;										
        case 'duplex' :
          cSettings.duplex = value; //?? TODO: Check is this implemented				
          break;										
        case 'resolution' :
          cSettings.resolution = value;				
          break;										
        case 'title':
          cSettings.title = value;
          break;
        case 'printToFile' :
          cSettings.printToFile = toBool(value);				
          break;										
        case 'toFileName':
          cSettings.toFileName = value;
          break;
        default :
          if (option in PRINT_SETTINGS_FIELDS)
            cSettings[option] = value;
          else
            error("Not supported option:"+option, errorType);
      }
    } // for
    return cSettings;
  } // convertSettingsR
  
  function init() {
    // initialize constants like properties
    self.lastJobId = 0;

    self.printerName = "";
      
  	self.printSettings = {};
  	self.globalPrintSettings = {};
  	
    for (var cname in constants) {
    	self[cname] = constants[cname];
    }	
    self.paperSizeUnit = self.kPaperSizeMillimeters;
    browser.runtime.onMessage.addListener(backgroundMessageHandler);
  } 

  init();  


  // follow public (exported) methods
  this.getVersion = function() {return JSP_VERSION;}
    

	// jsPrintSetup paperSizeUnit
	this.getPaperSizeUnit = function () {
		return self.paperSizeUnit;
	};

	this.setPaperSizeUnit = function (aPaperSizeUnit) {
    if ((aPaperSizeUnit != self.kPaperSizeMillimeters) && (aPaperSizeUnit != self.kPaperSizeInches))
      throw new jsPrintSetupException("Ivalid paper size unit. Allowed values are jsPrintSetup.kPaperSizeInches and jsPrintSetup.kPaperSizeMillimeters.");    
		self.paperSizeUnit = aPaperSizeUnit;
  };
  
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
//	  checkOptionName(option);
    let setting = convertSettings({[option]: value}, SET_TYPE_PRINTER, ERROR_TYPE_EXCEPTION);
    if (option in setting)
      self.printSettings[option] = setting[option]; 
	}; // setOption

	this.setGlobalOption = function (option, value) {
//	  checkOptionName(option);
    let setting = convertSettings({[option]: value}, SET_TYPE_GLOBAL, ERROR_TYPE_EXCEPTION);
    if (option in setting)
      self.globalPrintSettings[option] = setting[option]; 
	}; // setGlobalOption

	this.getOption = function (option) {
//	  checkOptionName(option);
    if (option in self.printSettings) {
      let setting = convertSettingsR({[option]: self.printSettings[option]}, SET_TYPE_PRINTER, ERROR_TYPE_EXCEPTION);
      if (option in setting)
        return setting[option]; 
      else 
        return undefined;
    } else 	    
        return undefined;
  }; // getOption

	this.getGlobalOption = function (option) {
//	  checkOptionName(option);
    if (option in self.globalPrintSettings) {
      let setting = convertSettingsR({[option]: self.globalPrintSettings[option]}, SET_TYPE_GLOBAL, ERROR_TYPE_EXCEPTION);
      if (option in setting)
        return setting[option]; 
      else 
        return undefined;
    } else 	    
        return undefined;	    
	};
	
	this.getOptions = function() {
	  return wrappedJSObjectHelper.cloneObject(convertSettingsR(self.printSettings, SET_TYPE_PRINTER, ERROR_TYPE_SILENT));
	};
	
	this.getGlobalOptions = function() {
	  return wrappedJSObjectHelper.cloneObject(convertSettingsR(self.globalPrintSettings, SET_TYPE_GLOBAL, ERROR_TYPE_SILENT));
	};
	
	this.saveOptions = function (optionSet) {
	  let printSettings = self.printSettings;
    let msg = {
      "call": "savePrintSettings"
      , "printSettings": printSettings
      , "optionSet": optionSet
      , "setDefaultPrinterName": false
    };
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        browser.runtime.sendMessage(msg).then(
          (printSettings) => {
            resolve(wrappedJSObjectHelper.cloneObject(convertSettingsR(printSettings, SET_TYPE_PRINTER, ERROR_TYPE_SILENT)));
          }
          , (err) => {
            reject(err.message);
          }
        );
      }
    );
	};
	
	this.saveGlobalOptions = function (optionSet) {
	  let printSettings = self.globalPrintSettings;
    let msg = {
      "call": "savePrintSettings"
      , "printSettings": printSettings
      , "optionSet": optionSet
      , "setDefaultPrinterName": false
    };
    return wrappedJSObjectHelper.newPromise(
      (resolve, reject) => {
        browser.runtime.sendMessage(msg).then(
          (printSettings) => {
            resolve(wrappedJSObjectHelper.cloneObject(convertSettingsR(printSettings, SET_TYPE_GLOBAL, ERROR_TYPE_SILENT)));
          }
          , (err) => {
            reject(err.message);
          }
        );
      }
    );
	};
	
	this.printWindow = function(win, printSettings) {
	  // indirect call of jsPrintSetup object in this 'win' window  
	  win.wrappedJSObject.jsPrintSetup.print(printSettings);
	}; // printWindow

	this.print = function(aPrintSettings) {
	  let printSettings;
    if (typeof aPrintSettings  === "undefined" || aPrintSettings === null)
      printSettings = self.printSettings;
    else
      printSettings = convertSettings(aPrintSettings, SET_TYPE_PRINTER, ERROR_TYPE_EXCEPTION);
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
            resolve(wrappedJSObjectHelper.cloneObject(convertSettingsR(printSettings, SET_TYPE_PRINTER, ERROR_TYPE_SILENT)));
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
            resolve(wrappedJSObjectHelper.cloneObject(convertSettingsR(printSettings, SET_TYPE_GLOBAL, ERROR_TYPE_SILENT)));
          }
          , (err) => {
            reject(err.message);
          }
        );
      }
    );
	}; // getGlobalPrintSettings

	this.savePrintSettings = function(aPrintSettings, optionSet, setDefaultPrinterName) {
	  let printSettings = convertSettings(aPrintSettings, SET_TYPE_PRINTER, ERROR_TYPE_EXCEPTION);
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
	
/*

   // Paper size manipulation
	short getPaperSizeUnit();
	void setPaperSizeUnit(in short aPaperSizeUnit);
	
	wstring getPaperSizeList();
	void definePaperSize(in short jspid, in short pd, in wstring pn
								, in wstring pwg, in wstring name
								, in double w, in double h, in short m);
	void undefinePaperSize(in short jspid);
	wstring getPaperSizeDataByID(in short jspid);
	wstring getPaperSizeData();
	void setPaperSizeData(in short jspid);
wstring getPaperMeasure();
*/	

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
	
	// deprecated methods that will be removed
	// set flag for silents print process (don't display print dialog)
	this.setSilentPrint = function (flag) {
	  // preferences are not accessible for extensions anymore
	  error("'setSilentPrint' is deprecated. Use print option/setting 'printSilent'", ERROR_TYPE_EXCEPTION);
	};
	
	// clear silent print always flag
	this.clearSilentPrint = function () {
	  // preferences are not accessible for extensions anymore
	  error("'setSilentPrint' is deprecated. Use print option/setting 'printSilent'", ERROR_TYPE_EXCEPTION);
	};
	
	// get flag for silents print process (don't display print dialog)
	this.getSilentPrint = function () {
	  // preferences are not accessible for extensions anymore
	  error("'getSilentPrint' is deprecated. Use print option/setting 'printSilent'", ERROR_TYPE_EXCEPTION);
  };

  this.setShowPrintProgress = function (flag){
	  // preferences are not accessible for extensions anymore
	  error("'setShowPrintProgress' is deprecated. Use print option/setting 'showPrintProgress'", ERROR_TYPE_EXCEPTION);
	};

	// get flag to display print progress
	this.getShowPrintProgress = function () {
	  // preferences are not accessible for extensions anymore
	  error("'getShowPrintProgress' is deprecated. Use print option/setting 'showPrintProgress'", ERROR_TYPE_EXCEPTION);
	};
	
	this.setCallback = function(callback){
	  error("'setCallback' is deprecated. Use window.addEventListener('message', (event) => {})", ERROR_TYPE_EXCEPTION);
	};

	this.getPermissions = function(){
	  error("'getPermissions' is deprecated. Use 'checkPermissions' instead.", ERROR_TYPE_EXCEPTION);
	};

	this.askUserPermissions = function(callback){
	  error("'askUserPermissions' is deprecated. Use 'checkPermissions' instead and window.addEventListener('message', (event) => {}).", ERROR_TYPE_EXCEPTION);
	};
	
	this.setPrintProgressListener = function(aListener) {
	  error("'setPrintProgressListener' is deprecated. Use window.addEventListener('message', (event) => {})", ERROR_TYPE_EXCEPTION);
	};

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