/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
/************************************************************************/
/*                                                                      */
/*      jsPrintSetup WE - jsPrintSetup web extension background script  */
/*                                                                      */
/*      Copyright (C) 2009-2017 Dimitar Angelov                         */
/*                                                                      */
/*      Distributed under the GNU General Public License version 2      */
/*      See LICENCE.txt file and http://www.gnu.org/licenses/           */
/*                                                                      */
/************************************************************************/

"use strict";

function jsPrintSetupException(message) {
   this.message = message;
   this.name = 'jsPrintSetupException';
}

// jsprintsetup-service
var jsPrintSetupService = {
  /*
  Generic error logger.
  */
  onError: function(e) {
    console.error(e);
  },

  defaultSettings : {
    securityMode: "prompt", // prompt,allowed,all
    localFilesEnabled : false,
   allowBlockedRequest : false
  },
  /*
  On startup, check whether we have stored settings.
  If we don't, then store the default settings.
  */
  checkStoredSettings: function (storedSettings) {
    if (
      !("securityMode" in storedSettings) 
      || !("localFilesEnabled" in storedSettings) 
      || !("allowBlockedRequest" in storedSettings)) {
      browser.storage.local.set(this.defaultSettings);
    }
  },
  
  init: function() {
    // load settings
    let gettingStoredSettings = browser.storage.local.get();
    gettingStoredSettings.then(this.checkStoredSettings, this.onError);
    // jsprintsetup-iface listener
    browser.runtime.onMessage.addListener(this.ifaceListener);
    // printservice event listeners
    browser.printservice.onStateChange.addListener(this.stateListener);
    browser.printservice.onProgressChange.addListener(this.progressListener);
    browser.printservice.onStatusChange.addListener(this.statusListener);
    
  }, // init
  
  ifaceListener: function (message, sender, sendResponse) {
  //  console.log(message);
  //  console.log(sender);
  //  console.log(sendResponse);
  /*
    browser.tabs.get(sender.tab.id).then(
      (tabInfo) => {
        console.log(tabInfo);
      }
      , (error) => {
        console.log(error);
      }
    );
  */  
    if ("call" in message) {
      
//      browser.notifications.create({
//        "type": "basic",
//        "iconUrl": null,
//        "title": "jsprintsetup-service called",
//        "message": "Called method:"+message.call
//      });
  
      console.log(message.call+" tabId:"+sender.tab.id+" windowId:"+sender.tab.windowId+" frameId:"+sender.frameId);
      switch (message.call) {
        case "printTab" :
  //        console.log(message.printSettings);
          return browser.printservice.printTab(
            sender.tab.id
            , sender.frameId?sender.frameId:null // sender.tab.windowId - is not valid window id for print method!
            , message.printSettings
          ).then( 
            (msg) => {
              console.log(msg);
              return {status:"OK", jobId:msg.jobId};
            }
            , (err) => {
              //console.log(err);
              throw err;
            }
          );
          break;
        case "listPrinters" :
          return browser.printservice.listPrinters().then(
            (printers) => {
              console.log("BS:"+printers);
              return printers;
            }
            , (err) => {
              throw err;
            }
          );
          break;
        case "getPrintSettings" :
          return browser.printservice.getPrintSettings(("printerName" in message)?message.printerName:null).then(
            (printSettings) => {
              return printSettings;
            }
            , (err) => {
              throw err;
            }
          );
          break;
        case "getGlobalPrintSettings" :
          return browser.printservice.getGlobalPrintSettings().then(
            (printSettings) => {
              return printSettings;
            }
            , (err) => {
              throw err;
            }
          );
          break;
        case "savePrintSettings" :
          return browser.printservice.savePrintSettings(
              message.printSettings
              , ("optionSet" in message)?message.optionSet:null
              , ("setDefaultPrinterName" in message)?message.setDefaultPrinterName:false
            ).then(
              (printSettings) => {
                return printSettings;
              }
              , (err) => {
                throw err;
              }
            );
          break;
        case "getDefaultPrinterName" :
          return browser.printservice.getDefaultPrinterName().then(
              (printerName) => {
                return printerName;
              }
              , (err) => {
                throw err;
              }
          );
          break;
      }
    } // if call in message
    return Promise.resolve("nothing was done");  
  }, // ifaceListener
  // printservice event listeners
  stateListener: function (data) {
//    console.log("stateListener", data);
    var sending = browser.tabs.sendMessage(
      data.tabId,              // integer
      {
        message:"state_change",
        jobId: data.jobId,
        stateFlags: data.stateFlags,
        status: data.status
      },// any
      {frameId: data.frameId}  // optional object
    );  
  }, // stateListener
  progressListener: function (data) {
    //console.log("progressListener", data);
    var sending = browser.tabs.sendMessage(
      data.tabId,              // integer
      {
        message:"progress_change",
        jobId: data.jobId,
        curSelfProgress: data.curSelfProgress,
        maxSelfProgress: data.maxSelfProgress,
        curTotalProgress: data.curTotalProgress,
        maxTotalProgress: data.maxTotalProgress
      },// any
      {frameId: data.frameId}  // optional object
    );  
  }, // progressListener
  statusListener: function (data) {
    //console.log("statusListener", data);
    var sending = browser.tabs.sendMessage(
      data.tabId,              // integer
      {
        message:"status_change",
        jobId: data.jobId,
        status: data.status,
        statusMessage: data.message
      },// any
      {frameId: data.frameId}  // optional object
    );  
  } //statusListener

} // jsPrintSetupService

console.log('jsPrintSetup Services loaded');
jsPrintSetupService.init();



/* To see how progress events are fired investigate here
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

