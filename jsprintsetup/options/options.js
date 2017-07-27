/* Listener for options page load */

document.addEventListener("DOMContentLoaded",onLoadPage,false);


/*
Store the currently selected settings using browser.storage.local.
*/
function storeSettings() {
  /* Save format panel settings to local storage */
  let securityMode = "";
  if (document.getElementById("security-mode-all").checked)
    securityMode = "all";
  else if (document.getElementById("security-mode-allowed").checked)
    securityMode = "allowed";
  else   
    securityMode = "prompt";
  browser.storage.local.set(
  {
    "securityMode": securityMode,
    "localFilesEnabled": document.getElementById("local-files-enabled").checked,
    "allowBlockedRequest": document.getElementById("allow-blocked-request").checked
  });
  
  /* Display saved status for short period */
  document.getElementById("options-save-status").style.setProperty("visibility","visible","");
  
  setTimeout(function()
  {
      document.getElementById("options-save-status").style.setProperty("visibility","hidden","");
  }
  ,1000);
  
}

function openPermissionManager() {
	var params = { blockVisible   : true,
						sessionVisible : false,
						allowVisible   : true,
						prefilledHost  : "",
						permissionType : "jsPrintSetup", //"popup",
						windowTitle    : "jsPrintSetup",
						introText      : "jsPrintSetup "+browser.i18n.getMessage("jsp_Permissions") 
	};
	console.log(window);
	window.openDialog("chrome://browser/content/preferences/permissions.xul",
							"_blank", "resizable,dialog=no,centerscreen", params);
}

function onLoadPage(event) {
    /* Load options from local storage */
    
    browser.storage.local.get(null,
    function(restoredSettings) {
      document.getElementById("security-mode-all").checked = (restoredSettings.securityMode == "all");
      document.getElementById("security-mode-allowed").checked = (restoredSettings.securityMode == "allowed");
      document.getElementById("security-mode-prompt").checked = (restoredSettings.securityMode == "prompt");
       
      document.getElementById("local-files-enabled").checked = (restoredSettings.localFilesEnabled == 1)?true:false;
      document.getElementById("allow-blocked-request").checked = (restoredSettings.allowBlockedRequest == 1)?true:false;
    });
    
    /* Add listener for click on save button */
    document.getElementById("save-button").addEventListener("click",storeSettings,false);
    /* Add listener for click on Site Permissions button */
    document.getElementById("site-permissions-button").addEventListener("click",openPermissionManager,false);
}


function onError(e) {
  console.error(e);
}

