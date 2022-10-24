export const strataAddress = 'http://euler.dimacs.rutgers.edu:8888/'

export function httpGet(theUrl) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", theUrl, false); // false for synchronous request
  xmlHttp.send(null);
  return xmlHttp.responseText;
}

export function httpGetAsync(theUrl, callback) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback(xmlHttp.responseText);
  }
  xmlHttp.open("GET", theUrl, true); // true for asynchronous
  xmlHttp.send(null);
}

export function httpPost(content, theUrl) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("POST", theUrl, false); // false for synchronous request
  xmlHttp.responseType = 'json';
  xmlHttp.setRequestHeader('Content-Type', 'application/json');
  xmlHttp.send(content);
  return xmlHttp.response;
}

export function httpPostAsync(content, theUrl, callback) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState === 4 && xmlHttp.status === 200)
      callback(xmlHttp.response);
  }
  xmlHttp.open("POST", theUrl, true); // true for asynchronous
  xmlHttp.responseType = 'json';
  xmlHttp.setRequestHeader('Content-Type', 'application/json');
  xmlHttp.send(content);
}

export function setStrataUrl(request) {
  document.getElementById('strata').src = strataAddress + request;
}