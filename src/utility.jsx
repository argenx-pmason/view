import convert from "xml-js";

export const encryptPassword = (
  api,
  username,
  password,
  setEncryptedPassword
) => {
  const url = api + "/encrypt",
    myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    "Basic " + btoa(username + ":" + password)
    // cG1hc29uOlJ1dGgtODI0ODkx
  );
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  fetch(url, requestOptions)
    .then((response) => response.text())
    .then((result) => {
      console.log("encryptPassword" + result);
      setEncryptedPassword(result);
      localStorage.setItem("username", username);
      localStorage.setItem("encryptedPassword", result);
    })
    .catch((error) => console.error(error));
};

export const logon = async (api, username, encryptedPassword, setToken) => {
  // TODO: maybe make it look for defaults for username and encryptedPassword from localStorage and use them if not provided
  const url = api + "/logon",
    myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    "Basic " + btoa(username + ":" + encryptedPassword)
  );
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    redirect: "follow",
  };

  fetch(url, requestOptions)
    .then((response) => {
      const authToken = response.headers.get("x-auth-token");
      console.log("logon - authToken", authToken, "response", response);
      setToken(authToken);
    })
    .catch((error) => console.error(error));
};

export const submitJob = (api, jobPath, token) => {
  console.log("submitJob - api", api, "jobPath", jobPath, "token", token);
  const myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "PUT",
    headers: myHeaders,
    redirect: "follow",
  };
  return fetch(
    api + "/jobs/repository" + jobPath + "?action=run",
    requestOptions
  )
    .then((response) => {
      console.log("submitJob - response", response);
      return response.json();
    })
    .then((responseJson) => {
      console.log("submitJob - responseJson", responseJson);
      // document.title = responseJson?.status?.type + " (" + responseJson?.status?.code + ")";
      return {
        submissionId: responseJson?.submissionId,
        status: responseJson?.status?.type,
      };
    })
    .catch((error) => {
      console.error(error);
      return { submissionId: "", status: error };
    });
};

export const waitTillJobCompletes = async (
  api,
  submissionId,
  token,
  checkEvery = 5,
  maxWaitSecs = 600
) => {
  // loop until job status is completed or failed or cancelled
  let thisStatus = "",
    seconds;
  // set time now
  const startTime = new Date().getTime();
  console.log(
    "waitTillJobCompletes - submissionId",
    submissionId,
    "token",
    token
  );
  while (!thisStatus.startsWith("COMPLETED")) {
    console.log("completed", thisStatus);
    await sleep(checkEvery * 1000);
    thisStatus = await getJobStatus(api, submissionId, token);
    console.log("waitTillJobCompletes - thisStatus", thisStatus);
    if (thisStatus === "failed" || thisStatus === "cancelled") {
      break;
    }
    // work out time from start to now
    const endTime = new Date().getTime(),
      timeDiff = endTime - startTime;
    // convert timediff to seconds
    seconds = timeDiff / 1000;
    console.log("waitTillJobCompletes - seconds", seconds);
    if (seconds > maxWaitSecs) {
      break;
    }
  }
  return { submissionId: submissionId, status: thisStatus, timeTaken: seconds };
};

export const getJobStatus = (api, submissionId, token) => {
  console.log("submissionId", submissionId, "token", token);
  if (!submissionId) {
    return "no submission ID";
  }
  const url = api,
    apiRequest = `/jobs/submissions/${submissionId}/status`,
    myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };
  console.log("getJobStatus - submissionId", submissionId, "token", token);

  return fetch(url + apiRequest, requestOptions)
    .then((response) => {
      console.log("getJobStatus - response", response);
      return response.json();
    })
    .then((responseJson) => {
      const status = responseJson?.type + " (" + responseJson?.code + ")";
      console.log(
        "getJobStatus - responseJson",
        responseJson,
        "status",
        status
      );
      // document.title = status;
      return status;
    })
    .catch((error) => console.error(error));
};

export const upload = async (
  api,
  path,
  fileContent,
  token,
  overwrite = false,
  comment = "uploaded using upload REST API",
  version = "MINOR"
) => {
  const url = api,
    apiRequest =
      "/repository/files" +
      path +
      "?action=upload&overwrite=" +
      overwrite +
      "&comment=" +
      comment +
      "&version=" +
      version,
    myHeaders = new Headers(),
    form = new FormData(),
    filename = path.split("/").pop();
  form.append(
    "uploadFile",
    new Blob([JSON.stringify(fileContent)], { type: "application/json" }),
    filename
  );
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "PUT",
    headers: myHeaders,
    redirect: "follow",
    body: form,
  };
  console.log(
    "upload - path",
    path,
    "token",
    token,
    "overwrite",
    overwrite,
    "comment",
    comment
  );

  try {
    const response = await fetch(url + apiRequest, requestOptions);
    console.log("upload - response", response);
    const responseJson = await response.json();
    const status = responseJson?.status?.type;
    console.log("upload - ", "status", status, "responseJson", responseJson);
    return status;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const getPathManifest = (api, submissionId, token) => {
  const apiRequest = `/jobs/submissions/${submissionId}/manifest`,
    myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };
  return fetch(api + apiRequest, requestOptions)
    .then((response) => {
      console.log("getPathManifest - response", response);
      return response.json();
    })
    .then((responseJson) => {
      const path = responseJson?.path;
      console.log("getPathManifest - responseJson", responseJson, "path", path);
      return path;
    })
    .catch((error) => {
      console.error(error);
      return error;
    });
};

export const getManifest = (api, token, pathManifest) => {
  const apiRequest = `/repository/files/${pathManifest}?component=contents`,
    myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };
  return fetch(api + apiRequest, requestOptions)
    .then((response) => {
      console.log("getManifest - response", response);
      return response.text();
    })
    .then((responseXML) => {
      console.log("getManifest - responseXML", responseXML);
      const dataJSON = convert.xml2js(responseXML, {
        compact: true,
        spaces: 4,
      });
      console.log("getManifest - dataJSON", dataJSON);
      const jm = dataJSON["job-manifest"],
        { job } = jm,
        { logs, results, inputs, outputs, parameters, programs } = job,
        { output } = outputs,
        output_files = output.map((o) => o["repository-file"]._text),
        char_parm = parameters["character-parameter"],
        folder_parm = parameters["folder-parameter"],
        { program } = programs,
        rf_prog = program["repository-file"],
        { _text: prog_path } = rf_prog,
        { log } = logs,
        rf_log = log["repository-file"],
        { _text: log_path } = rf_log,
        { result } = results,
        repositoryFile = result["repository-file"],
        { _text: repository_path } = repositoryFile;
      console.log(
        "getManifest - log_path",
        log_path,
        "repository_path",
        repository_path,
        "prog_path",
        prog_path,
        "char_parm",
        char_parm,
        "folder_parm",
        folder_parm,
        "output_files",
        output_files
      );
      return {
        log_path: log_path,
        repository_path: repository_path,
        prog_path: prog_path,
        char_parm: char_parm,
        folder_parm: folder_parm,
        output_files: output_files,
      };
    })
    .catch((error) => {
      console.error(error);
      return error;
    });
};

export const getFileContents = async (api, token, file) => {
  const apiRequest = `/repository/files/${file}?component=contents`,
    myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };
  return fetch(api + apiRequest, requestOptions)
    .then((response) => {
      console.log("getFileContents - response", response);
      return response.text();
    })
    .then((responseText) => {
      console.log("getFileContents - responseText", responseText);
      return responseText;
    })
    .catch((error) => {
      console.error(error);
      return error;
    });
};

export const getFileVersions = async (api, token, file) => {
  const apiRequest = `/repository/files/${file}?component=versions`,
    myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };
  return fetch(api + apiRequest, requestOptions)
    .then((response) => {
      console.log("getFileVersions - response", response);
      return response.text();
    })
    .then((responseText) => {
      const parsed=JSON.parse(responseText)
      console.log("getFileVersions - responseText", parsed);
      return parsed;
    })
    .catch((error) => {
      console.error(error);
      return error;
    });
};
export const getChildren = async (api, token, path) => {
  const apiRequest = `/repository/containers/${path}?component=children`,
    myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };
  return fetch(api + apiRequest, requestOptions)
    .then((response) => {
      console.log("getChildren - response", response);
      return response.text();
    })
    .then((responseText) => {
      const parsed=JSON.parse(responseText)
      console.log("getChildren - responseText", parsed);
      return parsed;
    })
    .catch((error) => {
      console.error(error);
      return error;
    });
};
export const checkout = async (api, token, path) => {
  const apiRequest = `/repository/files/${path}?action=checkout`,
    myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "PUT",
    headers: myHeaders,
    redirect: "follow",
  };
  return fetch(api + apiRequest, requestOptions)
    .then((response) => {
      console.log("checkout - response", response);
      return response.text();
    })
    .then((responseText) => {
      const parsed=JSON.parse(responseText)
      console.log("checkout - responseText", parsed);
      return parsed;
    })
    .catch((error) => {
      console.error(error);
      return error;
    });
};
export const checkin = async (api, token, path) => {
  const apiRequest = `/repository/files/${path}?action=checkin`,
    myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "PUT",
    headers: myHeaders,
    redirect: "follow",
  };
  return fetch(api + apiRequest, requestOptions)
    .then((response) => {
      console.log("checkin - response", response);
      return response.text();
    })
    .then((responseText) => {
      const parsed=JSON.parse(responseText)
      console.log("checkin - responseText", parsed);
      return parsed;
    })
    .catch((error) => {
      console.error(error);
      return error;
    });
};
export const undocheckout = async (api, token, path) => {
  const apiRequest = `/repository/files/${path}?action=undocheckout`,
    myHeaders = new Headers();
  myHeaders.append("X-Auth-Token", token);
  const requestOptions = {
    method: "PUT",
    headers: myHeaders,
    redirect: "follow",
  };
  return fetch(api + apiRequest, requestOptions)
    .then((response) => {
      console.log("undocheckout - response", response);
      return response.text();
    })
    .then((responseText) => {
      const parsed=JSON.parse(responseText)
      console.log("undocheckout - responseText", parsed);
      return parsed;
    })
    .catch((error) => {
      console.error(error);
      return error;
    });
};

export const sleep = (t) => new Promise((r) => setTimeout(r, t));

export const xmlToJson = (xml) => {
  // Create the return object
  var obj = {},
    i,
    j,
    attribute,
    item,
    nodeName,
    old;

  if (xml.nodeType === 1) {
    // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (j = 0; j < xml.attributes.length; j = j + 1) {
        attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType === 3) {
    // text
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for (i = 0; i < xml.childNodes.length; i = i + 1) {
      item = xml.childNodes.item(i);
      nodeName = item.nodeName;
      if (obj[nodeName] === undefined) {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (obj[nodeName].push === undefined) {
          old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
};

export const getDir = async (url, depth, callback) => {
  // Create an XMLHttpRequest object
  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4 && (this.status === 207 || this.status === 200)) {
      callback(this);
    }
  };
  // Send a request
  //xhttp.open("PROPFIND", "https://xarprod.ondemand.sas.com/lsaf/webdav/repo/", false, user, pwd);
  xhttp.open("PROPFIND", url, false);
  xhttp.setRequestHeader("Depth", "" + depth);
  let xmlData =
    "<?xml version='1.0' encoding='UTF-8'?>" +
    "  <d:propfind  xmlns:d='DAV:' xmlns:sc='http://www.sas.com/sas'>" +
    "     <d:prop>" +
    "        <d:displayname /> " +
    "        <d:creationdate/> <d:getlastmodified />  <d:getetag />  <d:getcontenttype />  <d:resourcetype />  <sc:checkedOut />  <sc:locked />   <sc:version /> " +
    "     </d:prop>" +
    "  </d:propfind>";
  xhttp.send(xmlData);
};

export const getVersions = async (url, callback) => {
  const versions = [],
    getVersionFields = (item) => {
      let href = item?.["D:href"]?.["#text"];
      let props =
        item?.["D:propstat"]?.["D:prop"] ??
        item?.["D:propstat"]?.[0]?.["D:prop"];
      console.log(props);
      let created = props?.["D:creationdate"]?.["#text"] ?? "";
      let modified = props?.["D:getlastmodified"]?.["#text"] ?? "";
      let creator = props?.["D:creator-displayname"]?.["#text"] ?? "";
      let length = props?.["D:getcontentlength"]?.["#text"] ?? "";
      let versionName = props?.["D:version-name"]?.["#text"] ?? "";
      //let comment = props?.["D:comment"]?.["#text"] ?? "";
      //let info = `Version name: ${versionName}, Creator: ${creator}, Size: ${length}, Created: ${created}` +
      //         `,  Last modified: ${modified}, Comment: ${comment},  Href: ${href}` ;
      let info =
        `Version name: ${versionName}, Creator: ${creator}, Size: ${length}, Created: ${created}` +
        `, Last modified: ${modified},  Href: ${href}`;
      versions.push(info);
      console.log(info);
    };

  // Create an XMLHttpRequest object
  console.log("Called: getVersion(" + url + ")");
  const xhttp = new XMLHttpRequest();

  // Define a callback function to deal with the reponse
  xhttp.onload = function () {
    // Here you can use the Data
    let dataXML = this.responseXML;
    let dataJSON = xmlToJson(dataXML);
    // pre.innerText += "\nVersions:";
    console.log("Versions: dataJSON:");
    console.log(dataJSON);
    let resp = dataJSON?.["D:multistatus"]?.["D:response"];
    console.log(resp);
    if (Array.isArray(resp)) {
      resp.forEach(getVersionFields);
    } else {
      getVersionFields(resp);
    }
    callback(versions);
  };

  // Send a request
  xhttp.open("REPORT", url, false);
  xhttp.setRequestHeader("Content-Type", "text/xml");
  let data =
    "<?xml version='1.0' encoding='utf-8' ?>" +
    "<D:version-tree xmlns:D='DAV:'> <D:prop> " +
    "<D:version-name/> <D:creator-displayname/> <D:successor-set/>" +
    //"<D:comment />" +
    "</D:prop></D:version-tree>";
  xhttp.send(data);
};
