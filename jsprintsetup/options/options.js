/* Listener for options page load */

document.addEventListener("DOMContentLoaded",onLoadPage,false);

var hostAccess = null;


function hostAccessIface() {
    var hostList = new Map();
    
    // default settings must be same as in jsPrintSetupService
    var defaultSettings = {
      securityMode: "prompt", // prompt,allowed,all
      localFilesEnabled : false,
      allowBlockedRequest : false,
      accessList : new Map()
    };
    
    var settings = defaultSettings;
    
    var table = document.getElementById("host-access-table");
    var tableBody = document.getElementById("host-access-table-body");
    var templateRow = document.getElementById("host-access-tpl-row").cloneNode(true);
    templateRow.id = "";
//console.log(templateRow);

    var hostInput = document.getElementById("host-access-input");

    var self = this;
    
    let url = new URL(document.URL);
    var query = "";
    if (url.search)
      query = url.search.substring(1); 

    function getQueryVar(variable) {
      var vars = query.split('&');
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
      }
    }
    
    hostInput.value = getQueryVar("host");
      
    function readSettings() {
      browser.storage.local.get(null,
        function(restoredSettings) {
          if ("securityMode" in restoredSettings)
            settings.securityMode = restoredSettings.securityMode;
          if ("localFilesEnabled" in restoredSettings)
            settings.localFilesEnabled = restoredSettings.localFilesEnabled;
          if ("allowBlockedRequest" in restoredSettings)
            settings.allowBlockedRequest = restoredSettings.allowBlockedRequest;
          if ("accessList" in restoredSettings) {
            try {
              settings.accessList = new Map(restoredSettings.accessList);
            } catch (err) {
            }
          }
            
          document.getElementById("security-mode-all").checked = (settings.securityMode == "all");
          document.getElementById("security-mode-allowed").checked = (settings.securityMode == "allowed");
          document.getElementById("security-mode-prompt").checked = (settings.securityMode == "prompt");
           
          document.getElementById("local-files-enabled").checked = (settings.localFilesEnabled == 1)?true:false;
          document.getElementById("allow-blocked-request").checked = (settings.allowBlockedRequest == 1)?true:false;
          redrawAccessList();
        }
      );
    }

    /*
    Store the currently selected settings using browser.storage.local.
    */
    function storeSettings() {
      /* Save format panel settings to local storage */
      let securityMode = "";
      if (document.getElementById("security-mode-all").checked)
        settings.securityMode = "all";
      else if (document.getElementById("security-mode-allowed").checked)
        settings.securityMode = "allowed";
      else   
        settings.securityMode = "prompt";
      settings.localFilesEnabled = document.getElementById("local-files-enabled").checked;  
      settings.allowBlockedRequest = document.getElementById("allow-blocked-request").checked;  
        
      browser.storage.local.set(
      {
        "securityMode": settings.securityMode,
        "localFilesEnabled": settings.localFilesEnabled,
        "allowBlockedRequest": settings.allowBlockedRequest,
        "accessList": Array.from(settings.accessList)
      });
      
      /* Display saved status for short period */
      document.getElementById("options-save-status").style.setProperty("visibility","visible","");
      
      setTimeout(function()
      {
          document.getElementById("options-save-status").style.setProperty("visibility","hidden","");
      }
      ,1000);
      
    }
    
    function setHost(host, access) {
      if(settings.accessList.has(host)) {
        settings.accessList.get(host).access = access;
      } else {
        settings.accessList.set(host, {"host": host, "access": access});
      }
      redrawAccessList();
      markSelected(host);  
    }                                                                                                                                                                                                                                                                                                                                                           
    
    function removeHost(host) {
      if(settings.accessList.has(host)) {
        settings.accessList.delete(host);
      }
      redrawAccessList();
    }

    function allowHostClick(event) {
      if (hostInput.value !== "")
        setHost(hostInput.value, "allow");
    }
    function blockHostClick(event) {
      if (hostInput.value !== "")
        setHost(hostInput.value, "block");
    }

    function removeHostClick(event) {
      removeHost(hostInput.value);
    }
    
    function markSelected(host) {
      let rows = tableBody.rows;
      for(let i = 0; i < rows.length; i++) {
        rows[i].className = rows[i].className.replace(" marked", "");
        if (rows[i].dataset["value"] == host) {
          rows[i].className = rows[i].className + " marked";
          hostInput.value = host;                                                                                                                                                                                                                                            
        }
      }
    }
                                                                                                                                                                                                                                                                                                                                                                                                              
    function selectRow(event) {                                                                                                                                                                                                                                                                                                                                                                                 
      let tr = event.target.parentNode;
      markSelected(tr.dataset["value"]);
    }

    function redrawAccessList() {
      // delete rows
      while(tableBody.rows.length > 0) {
        tableBody.deleteRow(0);
      }  
      settings.accessList.forEach(function(value, key) {
        let tr = templateRow.cloneNode(true);
        let tdHost = tr.cells[0];
        let tdAccess = tr.cells[1];
        tr.dataset["value"] = value.host; 
        tdHost.textContent = value.host;
        tdHost.dataset["value"] = value.host; 
        tdAccess.textContent = value.access;
        tdAccess.dataset["value"] = value.access; 
        
        tr.addEventListener("click", selectRow);
//        console.log(tr);
        tableBody.appendChild(tr);
      });  
    }

    /* Add listener for click on allow host */
    document.getElementById("host-access-allow").addEventListener("click",allowHostClick,false);
    document.getElementById("host-access-block").addEventListener("click",blockHostClick,false);
    document.getElementById("host-access-remove").addEventListener("click",removeHostClick,false);
    /* Add listener for click on save button */
    document.getElementById("save-button").addEventListener("click",storeSettings,false);

    readSettings();
}

function onLoadPage(event) {
    hostAccess = new hostAccessIface();
}



