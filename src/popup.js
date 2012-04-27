// Copyright 2011 Google Inc. All Rights Reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var URL_SPLIT_PATTERN = new RegExp(
    '^' +
    '(?:' +
      '([^:/?#.]+)' +                     // scheme - ignore special characters
                                          // used by other URL parts such as :,
                                          // ?, /, #, and .
    ':)?' +
    '(?://' +
      '(?:([^/?#]*)@)?' +                 // userInfo
      '([\\w\\d\\-\\u0100-\\uffff.%]*)' + // domain - restrict to letters,
                                          // digits, dashes, dots, percent
                                          // escapes, and unicode characters.
      '(?::([0-9]+))?' +                  // port
    ')?' +
    '([^?#]+)?' +                         // path
    '(?:\\?([^#]*))?' +                   // query
    '(?:#(.*))?' +                        // fragment
    '$');

var UrlComponentIndex = {
  SCHEME: 1,
  USER_INFO: 2,
  DOMAIN: 3,
  PORT: 4,
  PATH: 5,
  QUERY_DATA: 6,
  FRAGMENT: 7
};

function $(id) {
  return document.getElementById(id);
}

var paramsList = $('params');
var nextParamId = 0;

function newInput(opt_class, opt_value, opt_placeholder) {
  var input = document.createElement('input');
  input.setAttribute('type', 'text');
  if (opt_class) {
    input.setAttribute('class', opt_class);
  }
  if (opt_value) {
    input.setAttribute('value', opt_value);
  }
  if (opt_placeholder) {
    input.setAttribute('placeholder', opt_placeholder);
  }
  return input;
}

function newParamField(opt_name, opt_value) {
  var id = 'param_' + nextParamId++;
  var element = document.createElement('div');
  element.setAttribute('class', 'parameter');
  element.setAttribute('id', id);

  var name = newInput('name', opt_name, 'param name');
  var value = newInput('value', opt_value, 'param value');

  var remove = document.createElement('a');
  remove.setAttribute('href', '#');
  remove.setAttribute('class', 'removeLink');
  remove.onclick = function() { removeParam(id); };

  remove.appendChild(document.createTextNode('remove'));

  element.appendChild(name);
  element.appendChild(document.createTextNode(" = "));
  element.appendChild(value);
  element.appendChild(remove);

  return element;
}

function clearElement(element) {
  while (element.hasChildNodes()) {
    element.removeChild(element.lastChild);
  }
}

function removeParam(id) {
  paramsList.removeChild($(id));
}

function addParam() {
  paramsList.appendChild(newParamField());
}

function update() {
  chrome.tabs.getSelected(null, updateFromTab);
}

function decodeParam(value) {
  value = value.replace("+", " ");
  return decodeURIComponent(value);
}

function encodeParam(value) {
  value = encodeURIComponent(value);
  return value.replace(" ", "+");
}

function updateFromTab(tab) {
  var url = tab.url;
  var components = url.match(URL_SPLIT_PATTERN);

  $('scheme').value = components[UrlComponentIndex.SCHEME] || '';
  $('domain').value = components[UrlComponentIndex.DOMAIN] || '';
  $('port').value = components[UrlComponentIndex.PORT] || '';
  $('path').value = components[UrlComponentIndex.PATH] || '/';
  $('fragment').value = components[UrlComponentIndex.FRAGMENT] || '';

  var paramsList = $('params');
  clearElement(paramsList);
  nextParamId = 0;

  var queryData = components[UrlComponentIndex.QUERY_DATA];
  if (queryData) {
    var queryParams = queryData.split('&');
    for (var i = 0; i < queryParams.length; ++i) {
      var nameAndValue = queryParams[i];
      var indexOfEqual = nameAndValue.indexOf('=');

      var name = null;
      var value = null;

      if (indexOfEqual < 0) {
        name = decodeParam(nameAndValue);
      } else {
        name = decodeParam(nameAndValue.substring(0, indexOfEqual));
        value = decodeParam(nameAndValue.substring(indexOfEqual + 1));
      }

      paramsList.appendChild(newParamField(name, value));
    }
  }
}

function buildUrl() {
  var scheme = $('scheme').value;
  var domain = $('domain').value;
  var port = $('port').value;
  var path = $('path').value || '/';
  var fragment = $('fragment').value;

  var paramsList = [];

  var paramElements = $('params').children;
  for (var i = 0; i < paramElements.length; ++i) {
    var element = paramElements[i];
    var name = encodeParam(element.children[0].value || '');
    var value = encodeParam(element.children[1].value || '');

    if (name) {
      if (value) {
        paramsList.push([name, value].join('='));
      } else {
        paramsList.push(name);
      }
    }
  }

  var urlBuilder = [scheme, '://', domain];
  if (port) {
    urlBuilder.push(':');
    urlBuilder.push(port);
  }

  if (path) {
    urlBuilder.push(path);
  }

  if (paramsList.length > 0) {
    urlBuilder.push('?');
    urlBuilder.push(paramsList.join('&'));
  }

  if (fragment) {
    urlBuilder.push('#');
    urlBuilder.push(fragment);
  }

  return urlBuilder.join('');
}

function launch() {
  chrome.tabs.getSelected(null, function(tab) {
    chrome.tabs.update(tab.id, {url: buildUrl()});
    window.close();
  });
}

function launchNewTab() {
  chrome.tabs.create({url: buildUrl()});
  window.close();
}

$('addLink').onclick = addParam;
$('resetLink').onclick = update;
$('launchLink').onclick = launch;
$('launchNewTabLink').onclick = launchNewTab;

update();
