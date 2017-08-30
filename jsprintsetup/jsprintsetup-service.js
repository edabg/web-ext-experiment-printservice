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

console.log('jsPrintSetup Services is loading...');

function jsPrintSetupException(message, type="common") {
   this.message = message;
   this.name = 'jsPrintSetupServiceException';
   this.type = type;
}


// jsprintsetup-service
function jsPrintSetupService() {

  var self = this;
  var notification = null;

	this.JSPS_ALLOW_ACTION = 1;
	this.JSPS_DENY_ACTION  = 2;
	this.JSPS_UNKNOWN_ACTION = 0;

  // default settings must be same in options page
  this.defaultSettings = {
    securityMode: "prompt", // prompt,allowed,all
    localFilesEnabled : false,
    allowBlockedRequest : false,
    accessList : new Map()
  };

  this.settings = this.defaultSettings;

  /*
  Generic error logger.
  */
  function reportError(e) {
    console.error(e);
  }
  
  /*
  On startup, check whether we have stored settings.
  If we don't, then store the default settings.
  */
  function checkStoredSettings(storedSettings) {
    if (
      !("securityMode" in storedSettings) 
      || !("localFilesEnabled" in storedSettings) 
      || !("allowBlockedRequest" in storedSettings)) {
//      browser.storage.local.set(self.defaultSettings);
    } else {
      if ("securityMode" in storedSettings)
        self.settings.securityMode = storedSettings.securityMode;
      if ("localFilesEnabled" in storedSettings)
        self.settings.localFilesEnabled = storedSettings.localFilesEnabled;
      if ("allowBlockedRequest" in storedSettings)
        self.settings.allowBlockedRequest = storedSettings.allowBlockedRequest;
      // must be sure that is map!
      if ("accessList" in storedSettings) {
        try {
          self.settings.accessList = new Map(storedSettings.accessList); // new Map(storedSettings.accessList);
        } catch (err) {
          reportError(err);
        }
      }
    }
//    browser.storage.local.set(self.settings);
//    console.log("defaultSettings", self.defaultSettings);
    console.log("Settings", self.settings);
  }

  function readSettings() {
    let gettingStoredSettings = browser.storage.local.get();
    gettingStoredSettings.then(checkStoredSettings, (err) => reportError);
  }

  function storageListener(changes, areaName) {
    console.log("storageListener", areaName, changes);
    readSettings();
  }
  
  this.storeSettings = function() {
    let settings = {
      securityMode: self.settings.securityMode,
      localFilesEnabled: self.settings.localFilesEnabled,
      allowBlockedRequest: self.settings.allowBlockedRequest,
      accessList: Array.from(self.settings.accessList)
    };
    browser.storage.local.set(settings);
  };
  
  function showPageAction(urlInfo) {
    browser.pageAction.setPopup(
      {
        tabId: urlInfo.tabId, 
        popup: "options/options.html?perm="+encodeURIComponent(urlInfo.permission)+"&scheme="+encodeURIComponent(urlInfo.URL.protocol)+"&host="+encodeURIComponent(urlInfo.URL.host)
      }
    );

    let title = "jsPrintSetup service - host:"+urlInfo.URL.host;
    let iconPath = "icons/jsps.png";
    if (urlInfo.permission == self.JSPS_ALLOW_ACTION) {
      title = title + " HAVE ACCESS to your printers!";
      iconPath = "icons/jsps.png";
    } else if (urlInfo.permission == self.JSPS_DENY_ACTION) { 
      title = title + " is BLOCKED to use your printers!";
      iconPath = "icons/jsps-disabled.png";
    } else {
      title = title + " REQUESTED to use your printers!";
      iconPath = "icons/jsps-ask.png";
    }
    browser.pageAction.setTitle(
      {
        tabId: urlInfo.tabId, 
        title: title
      }
    );
    // change icon also
    browser.pageAction.setIcon(
      {
        tabId: urlInfo.tabId,
        path: iconPath
      }
    ); 
    browser.pageAction.show(urlInfo.tabId);
    // TODO: When browser.pageAction.openPopup will be available call it in case of ask

    // show notification in case of request or block
    if (!urlInfo.accessEnabled) {
      notification = browser.notifications.create(
        "jsprintsetup-service",
        {
          "type": "basic",
          "iconUrl": null,
          "title": "jsprintsetup-service",
          "message": title,
          "priority" : 2
        }
      );
    }
  } // showPageAction  
  
	function checkPermissions(sender) {
		var permission = self.JSPS_UNKNOWN_ACTION;
		let url_ = null;
		try {
		  url_ = new URL(sender.url);
//		  url_ = new URL("https://ala.bala.com");
			if (url_.protocol.startsWith("file:")) {
				// local file
				permission = self.settings.localFilesEnabled?self.JSPS_ALLOW_ACTION:self.JSPS_DENY_ACTION; 
			} else if (url_.protocol.startsWith("http")) {
			  if (self.settings.accessList.has(url_.host)) {
			    let hostInfo = self.settings.accessList.get(url_.host);
			    if (hostInfo.access == "allow")
			     permission = self.JSPS_ALLOW_ACTION;
			    else 
			     permission = self.JSPS_DENY_ACTION;
			  } else {
  				permission = self.JSPS_UNKNOWN_ACTION;
			  }
			} else {
				// usupported scheme
				permission = self.JSPS_DENY_ACTION;
				reportError("Unsupported scheme: "+url_.protocol);
			}
		} catch (err) {
			reportError(err);	
		  url_ = new URL("about:error");
		}

		let urlInfo = {
		  "tabId": sender.tab.id
		  , "URL": url_
		  , "urlPermission": permission
		  , "permissionission": permission
		  , "accessEnabled": false
		};
		
		// adjust permission depending security mode (TODO: "all" must be disabled!)
		if (self.settings.securityMode == "all") { 
		  permission = self.JSPS_ALLOW_ACTION;
    } 
    urlInfo.permission = permission;
		urlInfo.accessEnabled = (permission == self.JSPS_ALLOW_ACTION);
    
    showPageAction(urlInfo);
    
		// send permission info message content script
    let sending = browser.tabs.sendMessage(
      sender.tab.id,              // integer
      {
        message:"jsp_permission",
        accessEnabled: urlInfo.accessEnabled,
        permission: urlInfo.permission
      },// any
      {frameId: sender.frameId}  // optional object
    );  
		
		return urlInfo;
  }  
  
  function ifaceListener(message, sender, sendResponse) {
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
      
      console.log(sender.url);
      console.log(message.call+" tabId:"+sender.tab.id+" windowId:"+sender.tab.windowId+" frameId:"+sender.frameId);

      let urlInfo = checkPermissions(sender);
      if (!urlInfo.accessEnabled)
        throw new jsPrintSetupException("jsPrintsetupService access denied for URL "+sender.url, "permission");
//        return Promise.reject(new jsPrintSetupException("jsPrintsetupService access denied from URL "+sender.url)); 

      switch (message.call) {
        case "checkPermissions" :
          return Promise.resolve(urlInfo.permission);
          break;
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
  } // ifaceListener

  // printservice event listeners
  function stateListener(data) {
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
  }
  
  // stateListener
  function progressListener(data) {
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
  }
  // progressListener
  function statusListener(data) {
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
  
  function init() {
    // load settings
    readSettings();
    browser.storage.onChanged.addListener(storageListener);
    // jsprintsetup-iface listener
    browser.runtime.onMessage.addListener(ifaceListener);
    // printservice event listeners
    browser.printservice.onStateChange.addListener(stateListener);
    browser.printservice.onProgressChange.addListener(progressListener);
    browser.printservice.onStatusChange.addListener(statusListener);
  } // init
  
  init();
  console.log('jsPrintSetup Services loaded');
}// jsPrintSetupService

var jsPrintSerup = new jsPrintSetupService();

//jsPrintSetupService.init();



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

