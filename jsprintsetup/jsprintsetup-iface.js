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
//var Ci = Components.interfaces;

//let IPS = Ci.nsIPrintSettings;
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
  cloneObjectW: function (win, fromObject) {
    let clonedObject = new win.wrappedJSObject.Object();
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
    kSaveOddEvenPages : 0x00000001, //IPS.kInitSaveOddEvenPages,
    kSaveHeaderLeft   : 0x00000002, // IPS.kInitSaveHeaderLeft,  
    kSaveHeaderCenter : 0x00000004, //IPS.kInitSaveHeaderCenter,
    kSaveHeaderRight  : 0x00000008, //IPS.kInitSaveHeaderRight,
    kSaveFooterLeft   : 0x00000010, //IPS.kInitSaveFooterLeft,
    kSaveFooterCenter : 0x00000020, //IPS.kInitSaveFooterCenter,
    kSaveFooterRight  : 0x00000040, //IPS.kInitSaveFooterRight,
    kSaveBGColors     : 0x00000080, //IPS.kInitSaveBGColors ,
    kSaveBGImages     : 0x00000100, //IPS.kInitSaveBGImages,
    kSavePaperSize    : 0x00000200, //IPS.kInitSavePaperSize,
    kSavePaperData    : 0x00002000, //IPS.kInitSavePaperData,
    kSaveUnwriteableMargins  : 0x00004000, //IPS.kInitSaveUnwriteableMargins,
    kSaveEdges        : 0x00008000, //IPS.kInitSaveEdges,
    kSaveInColor      : 0x00020000, //IPS.kInitSaveInColor,
    kSaveReversed     : 0x00010000, //IPS.kInitSaveReversed,
    kSaveOrientation  : 0x00040000, //IPS.kInitSaveOrientation,
    kSavePrinterName  : 0x00100000, //IPS.kInitSavePrinterName,
    kSavePageDelay    : 0x00800000, //IPS.kInitSavePageDelay,
    kSaveMargins      : 0x01000000, //IPS.kInitSaveMargins,
    kSaveShrinkToFit  : 0x08000000, //IPS.kInitSaveShrinkToFit,
    kSaveResolutionName : 0x00000400, //IPS.kInitSaveResolutionName,
    kSaveDuplex     : 0x00000800, //IPS.kInitSaveDuplex,
    kSaveScaling      : 0x10000000, //IPS. kInitSaveScaling,
    kSavePrintToFile  : 0x00200000, //IPS.kInitSavePrintToFile,
    kSaveToFileName   : 0x00400000, //IPS.kInitSaveToFileName,     

    // Page Size Unit Constants 
    kPaperSizeInches      : 0, //IPS.kPaperSizeInches,
    kPaperSizeMillimeters : 1, //IPS.kPaperSizeMillimeters,

    // Min/Max PaperSizeID
    kMinPaperSizeID : 1,
    kMaxPaperSizeID : 255,

    // Page Orientation Constants
    kPortraitOrientation      : 0, //IPS.kPortraitOrientation,
    kLandscapeOrientation     : 1, //IPS.kLandscapeOrientation,

    // Paper Size Data Constants
    kPaperSizeNativeData      : 0, //IPS.kPaperSizeNativeData,
    kPaperSizeDefined         : 1, //IPS.kPaperSizeDefined,
   
    // Print Range Enums 
    kRangeAllPages            : 0, //IPS.kRangeAllPages,
    kRangeSpecifiedPageRange  : 1, //IPS.kRangeSpecifiedPageRange,
    kRangeSelection           : 2, //IPS.kRangeSelection,
    kRangeFocusFrame          : 3, //IPS.kRangeFocusFrame,

    // Output format
    kOutputFormatNative       : 0, //IPS.kOutputFormatNative,
    kOutputFormatPS           : 1, //IPS.kOutputFormatPS,
    kOutputFormatPDF          : 2, //IPS.kOutputFormatPDF,
  
    // Shorthand Combined Saving Constants
    kSaveHeader               : 0x00000002 | 0x00000004 | 0x00000008 | 0x00000010 | 0x00000020 | 0x00000040,  
//      IPS.kInitSaveHeaderLeft | IPS.kInitSaveHeaderCenter | IPS.kInitSaveHeaderRight | 
//      IPS.kInitSaveFooterLeft | IPS.kInitSaveFooterCenter | IPS.kInitSaveFooterRight,
      
    kSaveMarginsAndOrientation : 0x00040000 | 0x01000000, //IPS.kInitSaveOrientation | IPS.kInitSaveMargins,
    
    kSaveMarginsAndHeader      : 0x00000002 | 0x00000004 | 0x00000008 | 0x00000010 | 0x00000020 | 0x00000040 | 0x00040000 | 0x01000000, 
//      IPS.kInitSaveHeaderLeft | IPS.kInitSaveHeaderCenter | IPS.kInitSaveHeaderRight | 
//      IPS.kInitSaveFooterLeft | IPS.kInitSaveFooterCenter | IPS.kInitSaveFooterRight |
//      IPS.kInitSaveOrientation | IPS.kInitSaveMargins,

    kSaveAll                   : 0xFFFFFFFF, //IPS.kInitSaveAll, 

    // Permissions constants                    
    JSPS_ALLOW_ACTION   : 1, //Ci.nsIPermissionManager.ALLOW_ACTION,
    JSPS_DENY_ACTION    : 2, //Ci.nsIPermissionManager.DENY_ACTION,
    JSPS_UNKNOWN_ACTION : 0, //Ci.nsIPermissionManager.UNKNOWN_ACTION,
    
    // Progress Listener Status constants
    WPL_STATE_START: 0x00000001, //Ci.nsIWebProgressListener.STATE_START, // 1
    WPL_STATE_STOP: 0x00000010, //Ci.nsIWebProgressListener.STATE_STOP, // 16
    WPL_STATE_IS_DOCUMENT: 0x00020000, //Ci.nsIWebProgressListener.STATE_IS_DOCUMENT, // 131072
    WPL_STATE_IS_NETWORK: 0x00040000, //Ci.nsIWebProgressListener.STATE_IS_NETWORK, // 262144
    WPL_STATE_IS_WINDOW: 0x00080000, //Ci.nsIWebProgressListener.STATE_IS_WINDOW, // 524288
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

  // PD = paperData -> see Windows Paper Sizes http://msdn.microsoft.com/en-us/library/dd319099%28v=vs.85%29.aspx 
  // PN = paperName -> Linux(Unix) paperName see http://library.gnome.org/devel/gtk/2.21/gtk-GtkPaperSize.html
  // PWG = Printing WorkGroup for Media Standartizied Names ftp://ftp.pwg.org/pub/pwg/candidates/cs-pwgmsn10-20020226-5101.1.pdf
  //       Is is almost same as PN, but at now is not used. It is implemented for future use
  // Name = Human readable Name
  // M = Measure for Width and Heidth can be kPaperSizeInches or kPaperSizeMillimeters 
  // W = Width of paper in M   
  // H = Height of paper in M   
  var builtinPaperSizeList = {
      1 : {PD: 1, PN: 'na_letter',   PWG: 'na_letter_8.5x11in',       Name: 'US Letter', W: 8.5 , H: 11, M: constants.kPaperSizeInches}
    , 2 : {PD: 2, PN: 'na_letter',   PWG: 'na_letter_8.5x11in',       Name: 'US Letter Small', W: 8.5 , H: 11, M: constants.kPaperSizeInches} // pdf creator reports paper_data = 119!
    , 3 : {PD: 3, PN: 'ppd_Tabloid', PWG: 'na_ledger_11x17in',        Name: 'US Tabloid', W: 11 , H: 17, M: constants.kPaperSizeInches}
    , 4 : {PD: 4, PN: 'ppd_Ledger',   PWG: '', /*???*/                 Name: 'US Ledger', W: 17 , H: 11, M: constants.kPaperSizeInches}
    , 5 : {PD: 5, PN: 'na_legal',    PWG: 'na_legal_8.5x14in',        Name: 'US Legal', W: 8.5 , H: 14, M: constants.kPaperSizeInches}
    , 6 : {PD: 6, PN: 'na_invoice',  PWG: 'na_invoice_5.5x8.5in',     Name: 'US Statement', W: 5.5 , H: 8.5, M: constants.kPaperSizeInches}   // Half Letter
    , 7 : {PD: 7, PN: 'na_executive',PWG: 'na_executive_7.25x10.5in', Name: 'US Executive', W: 7.25 , H: 10.5, M: constants.kPaperSizeInches}
    , 8 : {PD: 8, PN: 'iso_a3',      PWG: 'iso_a3_297x420mm',         Name: 'A3', W: 297 , H: 420, M: constants.kPaperSizeMillimeters}
    , 9 : {PD: 9, PN: 'iso_a4',      PWG: 'iso_a4_210x297mm',         Name: 'A4', W: 210 , H: 297, M: constants.kPaperSizeMillimeters}
    ,10 : {PD:10, PN: 'iso_a4',      PWG: 'iso_a4_210x297mm',         Name: 'A4 Small', W: 210 , H: 297, M: constants.kPaperSizeMillimeters}
    ,11 : {PD:11, PN: 'iso_a5',      PWG: 'iso_a5_148x210mm',         Name: 'A5', W: 148 , H: 210, M: constants.kPaperSizeMillimeters}
    ,12 : {PD:12, PN: 'jis_b4',      PWG: 'jis_b4_257x364mm',         Name: 'B4 (JIS)', W: 257 , H: 364, M: constants.kPaperSizeMillimeters}
    ,13 : {PD:13, PN: 'jis_b5',      PWG: 'jis_b5_182x257mm',         Name: 'B5 (JIS)', W: 182 , H: 257, M: constants.kPaperSizeMillimeters}
    ,14 : {PD:14, PN: 'om_folio',    PWG: 'om_folio_210x330mm',       Name: 'Folio', W: 210 , H: 330, M: constants.kPaperSizeMillimeters}    // pdf creator FLSA
    ,15 : {PD:15, PN: 'na_quarto',   PWG: 'na_quarto_8.5x10.83in',    Name: 'Quarto', W: 8.5 , H: 10.83, M: constants.kPaperSizeInches}
    ,16 : {PD:16, PN: 'na_10x14',    PWG: 'na_10x14_10x14in',         Name: '10x14 (envelope)', W: 10, H: 14, M: constants.kPaperSizeInches}
    ,17 : {PD:17, PN: 'na_ledger',   PWG: 'na_ledger_11x17in',        Name: '11x17 (envelope)', W: 11, H: 17, M: constants.kPaperSizeInches} // pdf creator Tabloid
    ,18 : {PD:18, PN: 'na_letter',   PWG: 'na_letter_8.5x11in',       Name: 'US Note', W: 8.5 , H: 11, M: constants.kPaperSizeInches} // == letter
    ,19 : {PD:19, PN: 'na_number-9', PWG: 'na_number-9_3.875x8.875in',Name: 'US Envelope #9', W: 3.875, H: 8.875, M: constants.kPaperSizeInches}
    ,20 : {PD:20, PN: 'na_number-10',PWG: 'na_number-10_4.125x9.5in', Name: 'US Envelope #10', W: 4.125, H: 9.5, M: constants.kPaperSizeInches}
    ,21 : {PD:21, PN: 'na_number-11',PWG: 'na_number-11_4.5x10.375in',Name: 'US Envelope #11', W: 4.5, H: 10.375, M: constants.kPaperSizeInches}
    ,22 : {PD:22, PN: 'na_number-12',PWG: 'na_number-12_4.75x11in',   Name: 'US Envelope #12', W: 4.75, H: 11, M: constants.kPaperSizeInches}
    ,23 : {PD:23, PN: 'na_number-14',PWG: 'na_number-14_5x11.5in',    Name: 'US Envelope #14', W: 5, H: 11.5, M: constants.kPaperSizeInches}
    ,24 : {PD:24, PN: 'na_c',        PWG: 'na_c_17x22in',             Name: 'C size sheet', W: 17, H: 22, M: constants.kPaperSizeInches}
    ,25 : {PD:25, PN: 'na_d',        PWG: 'na_d_22x34in',             Name: 'D size sheet', W: 22, H: 34, M: constants.kPaperSizeInches}
    ,26 : {PD:26, PN: 'na_e',        PWG: 'na_e_34x44in',             Name: 'E size sheet', W: 34, H: 44, M: constants.kPaperSizeInches}
    ,27 : {PD:27, PN: 'iso_dl',      PWG: 'iso_dl_110x220mm',         Name: 'Envelope DL', W: 110, H: 220, M: constants.kPaperSizeMillimeters}
    ,28 : {PD:28, PN: 'iso_c5',      PWG: 'iso_c5_162x229mm',         Name: 'Envelope C5', W: 162, H: 229, M: constants.kPaperSizeMillimeters}
    ,29 : {PD:29, PN: 'iso_c3',      PWG: 'iso_c3_324x458mm',         Name: 'Envelope C3', W: 324, H: 458, M: constants.kPaperSizeMillimeters}
    ,30 : {PD:30, PN: 'iso_c4',      PWG: 'iso_c4_229x324mm',         Name: 'Envelope C4', W: 229, H: 324, M: constants.kPaperSizeMillimeters}
    ,31 : {PD:31, PN: 'iso_c6',      PWG: 'iso_c6_114x162mm',         Name: 'Envelope C6', W: 114, H: 162, M: constants.kPaperSizeMillimeters}
    ,32 : {PD:32, PN: 'iso_c6c5',    PWG: 'iso_c6c5_114x229mm',       Name: 'Envelope C65', W: 114, H: 229, M: constants.kPaperSizeMillimeters}
    ,33 : {PD:33, PN: 'iso_b4',      PWG: 'iso_b4_250x353mm',         Name: 'Envelope B4', W: 250, H: 353, M: constants.kPaperSizeMillimeters}
    ,34 : {PD:34, PN: 'iso_b5',      PWG: 'iso_b5_176x250mm',         Name: 'Envelope B5', W: 176, H: 250, M: constants.kPaperSizeMillimeters}
    ,35 : {PD:35, PN: 'iso_b6',      PWG: 'iso_b6_125x176mm',         Name: 'Envelope B6', W: 125, H: 176, M: constants.kPaperSizeMillimeters}
    ,36 : {PD:36, PN: 'om_italian',  PWG: 'om_italian_110x230mm',     Name: 'Italian Envelope', W: 110, H: 230, M: constants.kPaperSizeMillimeters}
    ,37 : {PD:37, PN: 'na_monarch',  PWG: 'na_monarch_3.875x7.5in',   Name: 'US Envelope Monarch', W: 3.875, H: 7.5, M: constants.kPaperSizeInches}
    ,38 : {PD:38, PN: 'na_personal', PWG: 'na_personal_3.625x6.5in',  Name: 'US Personal Envelope', W: 3.625, H: 6.5, M: constants.kPaperSizeInches} // 6 3/4 Envelope
    ,39 : {PD:39, PN: 'na_fanfold-us',PWG:'na_fanfold-us_11x14.875in',Name: 'US Std Fanfold', W: 11, H: 14.875, M: constants.kPaperSizeInches}
    ,40 : {PD:40, PN: 'na_fanfold-eur',PWG:'na_fanfold-eur_8.5x12in', Name: 'German Std Fanfold', W: 8.5, H: 12, M: constants.kPaperSizeInches}
    ,41 : {PD:41, PN: 'na_foolscap', PWG:'na_foolscap_8.5x13in',      Name: 'German Legal Fanfold', W: 8.5, H: 13, M: constants.kPaperSizeInches}
    // 42 = ISO B4? === 33 by paper size
    ,43 : {PD:43, PN: 'jpn_hagaki',  PWG:'jpn_hagaki_100x148mm',      Name: 'Japanese Postcard', W: 100, H: 148, M: constants.kPaperSizeMillimeters}
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
    self.paperSizeList = builtinPaperSizeList;
    
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
//    checkOptionName(option);
    let setting = convertSettings({[option]: value}, SET_TYPE_PRINTER, ERROR_TYPE_EXCEPTION);
    if (option in setting)
      self.printSettings[option] = setting[option]; 
  }; // setOption

  this.setGlobalOption = function (option, value) {
//    checkOptionName(option);
    let setting = convertSettings({[option]: value}, SET_TYPE_GLOBAL, ERROR_TYPE_EXCEPTION);
    if (option in setting)
      self.globalPrintSettings[option] = setting[option]; 
  }; // setGlobalOption

  this.getOption = function (option) {
//    checkOptionName(option);
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
//    checkOptionName(option);
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
  
  this.printWindow = function(win, aPrintSettings) {
    // indirect call of jsPrintSetup object in this 'win' window  
    let printSettings = self.printSettings;
    if (typeof aPrintSettings  !== "undefined" && aPrintSettings !== null)
      assignPrintSettings(printSettings, convertSettings(aPrintSettings, SET_TYPE_PRINTER, ERROR_TYPE_EXCEPTION));
//    win.wrappedJSObject.jsPrintSetup.print(wrappedJSObjectHelper.cloneObjectW(win, printSettings));//printSettings
    win.wrappedJSObject.jsPrintSetup.print(wrappedJSObjectHelper.cloneObject(printSettings));//printSettings
  }; // printWindow

  this.print = function(aPrintSettings) {
//    let printSettings = wrappedJSObjectHelper.cloneObject(self.printSettings);
    let printSettings = self.printSettings;
    if (typeof aPrintSettings  !== "undefined" && aPrintSettings !== null)
      assignPrintSettings(printSettings, convertSettings(aPrintSettings, SET_TYPE_PRINTER, ERROR_TYPE_EXCEPTION));

//console.log(JSON.stringify(printSettings, null, "\t"));      
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
  
  // Paper size manipulation methods
  this.getPaperSizeList = function () {
    // TODO: Check if clone is needed
    return self.paperSizeList;
  };

  this.definePaperSize = function (jspid, pd, pn,  pwg, name, w, h, m) {
    if (jspid < self.kMinPaperSizeID) {
      error('error jspid='+jspid+' cant be smaller than '+self.kMinPaperSizeID, ERROR_TYPE_SILENT);
      return;
    } else if (jspid > self.kMaxPaperSizeID) {
      error('error jspid='+jspid+' cant be greater than '+self.kMaxPaperSizeID, ERROR_TYPE_SILENT);
      return;
    }
    self.paperSizeList[jspid] = {PD:pd, PN: pn,  PWG:pwg, Name: name, W: w, H: h, M: m}; 
  };

  this.undefinePaperSize = function (jspid) {
    if (typeof(self.paperSizeList[jspid]) != 'undefined')
      delete self.paperSizeList[jspid]; 
  };
  
  this.getPaperSizeDataByID = function (jspid) {
    let pd = null;
    if (typeof(self.paperSizeList[jspid]) != 'undefined')
      pd = self.paperSizeList[jspid];  
    return wrappedJSObjectHelper.cloneObject(pd);// TODO: clone
  };
  
  // Find Paper Data definition by paperData (Windows implementation)
  function _getPaperSizeDataByPD(pd) {
    let res = null;
    for(let jspid in self.paperSizeList)
      if (self.paperSizeList[jspid].PD == pd) {
        res = self.paperSizeList[jspid]; 
      }
    return res;          
  }
  // Find Paper Data definition by paperName (Linux GTK implementation)
  function _getPaperSizeDataByPN(pn) {
    var res = null;
    for(var jspid in self.paperSizeList)
      if (self.paperSizeList[jspid].PN == pn) {
        res = self.paperSizeList[jspid]; 
      }
    return res;          
  }  

  // Match Paper Size Data depending of current printSettings and OS
  this.getPapreSizeData = function() {
    var res = null;
    if (browser.runtime.platformOS == "win")
      res = getPaperSizeDataByPD(self.printSettings.paperData);
    else { // (browser.runtime.platformOS == "linux")
      // All other OS check paperName
      res = _getPaperSizeDataByPN(self.printSettings.paperName);
    }
    return res;
  };   

  this.getPaperMeasure = function () {
    let w = 0;
    let h = 0;
    let pd = self.getPapreSizeData();
    if (pd) {
      w = adjustUnitValue(pd.W, pd.M, self.paperSizeUnit); 
      h = adjustUnitValue(pd.H, pd.M, self.paperSizeUnit); 
    } else {
      w = adjustUnitValue(self.printSettings.paperHeight, self.printSettings.paperSizeUnit, self.paperSizeUnit); 
      h = adjustUnitValue(self.printSettings.paperWidth, self.printSettings.paperSizeUnit, self.paperSizeUnit); 
    } 
    pd = wrappedJSObjectHelper.cloneObject(pd);
    return wrappedJSObjectHelper.cloneObject({"PD": pd, "W": w, "H": h}); // TODO: Clone?
  };
  
  this.setPaperSizeData = function (jspid) {
    if (typeof(self.paperSizeList[jspid]) == 'undefined')
      return false;
    self.printSettings.paperName = self.paperSizeList[jspid].PN;      
    self.printSettings.paperData = self.paperSizeList[jspid].PD;      
    self.printSettings.paperWidth = self.paperSizeList[jspid].W;      
    self.printSettings.paperHeight = self.paperSizeList[jspid].H;     
    self.printSettings.paperSizeUnit = self.paperSizeList[jspid].M;
    return true;      
  };  
  
  this.testAsync = function() {
//    return new Promise((res) => {return "ala bala";});
//    var x = new window.wrappedJSObject.Promise(function (resolve, reject) {resolve("ala bala");});
//    return x;
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
