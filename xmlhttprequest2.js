var http = require("http")
  , https = require("https")
  , urllib = require("url")
  , querystring = require("querystring");

var UNSENT = 0
  , OPENED = 1
  , HEADERS_RECEIVED = 2
  , LOADING = 3
  , DONE = 4;
  
var PROTOCOL_HTTP = "http:"
  , PROTOCOL_HTTPS = "https:"

var methods = {
  "POST": true,
  "PUT": true,
  "PATCH": true,
  "HEAD": true,
  "GET": true,
  "DELETE": true,
  "CONNECT": false,
  "TRACE": false,
  "TRACK": false
};

var responseTypes = {
  "": true,
  "arraybuffer": true,
  "blob": true,
  "document": true,
  "json": true,
  "text": true
};

var redirectStatusCodes = {
  301: true,
  302: true,
  303: true,
  307: true
}

var forbiddenHeaders = {
  "accept-charset": false,
  "accept-encoding": false,
  "access-control-request-headers": false,
  "access-control-request-method": false,
  "connection": false,
  "content-length": false,
  "cookie": false,
  "cookie2": false,
  "date": false,
  "dnt": false,
  "expect": false,
  "host": false,
  "keep-alive": false,
  "origin": false,
  "referer": false,
  "te": false,
  "trailer": false,
  "transfer-encoding": false,
  "upgrade": false,
  "user-agent": false,
  "via": false
};

function SecurityError(message) {
  this.message = message;
}

function InvalidStateError(message) {
  this.message = message;
}

function XMLHttpRequest2() {
  var options;
  var protocol;
  var timeout;
  var error;
  var readyState;
  var sendFlag;
  var statusCode;
  var statusText;
  var headers;
  var allHeaders;
  var responseType;
  var response;
  var responseText;
  var responseBuffer;
  var handlers = {
    loadstart: null,
    progress: null,
    abort: null,
    error: null,
    load: null,
    timeout: null,
    loadend: null,
    readystatechange: null
  };
  
  var initialize = function() {
    options = undefined;
    timeout = 0;
    error = false;
    readyState = UNSENT;
    sendFlag = false;
    statusCode = undefined;
    statusText = undefined;
    headers = {};
    allHeaders = undefined;
    responseType = "";
    response = null;
    responseText = "";
    responseBuffer = [];
  };
  
  var protocols = {
    "http:": http,
    "https:": https
  };
  
  initialize();
  
  var setReadyState = function(state) {
    readyState = state;
    
    switch(state) {
      case OPENED:
        
        break;
    }
  };
  
  var extractHeaders = function(response) {
    for (var i in response.headers) {
      if (i !== "set-cookie" && i !== "set-cookie2") {
        headers[i] = response.headers[i];
      }
    }
  };
  
  var extractStatus = function(response) {
    statusCode = response.statusCode;
    
    if (statusCode in http.STATUS_CODES) {
      statusText = http.STATUS_CODES[statusCode];
    }
  };
  
  var isUnsentOpenedAndError = function() {
    return readyState !== UNSENT 
      && readyState !== OPENED
      && error === false;
  }
  
  var getBufferAsString = function() {
    return Buffer.concat(responseBuffer).toString();
  };
  
  var isDone = function() {
    return readyState === DONE && error === false;
  };
  
  var isLoadingOrDone = function() {
    return (readyState === LOADING || readyState === DONE) && error === false;
  };
  
  var ResponseBody = {
    getText: function() {
      if (isLoadingOrDone()) {
        return getBufferAsString();
      }
      return "";
    },
    
    getJSON: function() {
      if (isDone()) {
        try {
          return JSON.parse(getBufferAsString());
        } catch(ex) {}
      }
      return null;
    },
    
    getDocument: function() {
      
    },
    
    getBlob: function() {
      
    },
    
    getArrayBuffer: function() {
      var buffer = Buffer.concat(responseBuffer);
      var length = buffer.length;
      var arrayBuffer = new ArrayBuffer(length);
      
      for (var i = 0; i < length; i++) {
        arrayBuffer[i] = buffer[i];
      }
      
      return arrayBuffer;
    }
  };

  return {
    abort: function() {
    },
    
    open: function(method, url, async, user, password) {
      initialize();
      
      method = String(method || "").toUpperCase();

      if (!(/^[a-zA-Z]+$/.test(method))) {
        throw new SyntaxError("Invalid HTTP method name: " + method);
      }

      if (method in methods && methods[method] === false) {
        throw new SecurityError("Unsecure method: " + method);
      }
        
      var parsed = urllib.parse(url, true);
      protocol = parsed.protocol || PROTOCOL_HTTP;
      
      var port = parseInt(parsed.port);
      
      if (!port && protocol === PROTOCOL_HTTPS) {
        port = 443;
      } else {
        port = 80;
      }
      
      options = {
        method: method,
        host: parsed.hostname,
        port: port,
        path: parsed.path
      };
      
      setReadyState(OPENED);
      
      if (handlers.readystatechange) {
        handlers.readystatechange.call(this);
      }
    },
    
    send: function(data) {
      if (readyState !== OPENED) {
        throw new InvalidStateError("Invalid state not OPENED");
      }
      
      if (sendFlag === true) {
        throw new InvalidStateError("Invalid state send flag");
      }
      
      if (/^GET|HEAD|OPTIONS$/.test(options.method)) {
        data = null;
      }
      
      sendFlag = true;
      var self = this;
      
      (function() {
        var callee = arguments.callee;
        
        if (options.method === "POST") {
          options.headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": (data || "").length
          };
        }

        var request = protocols[protocol].request(options, function(response) {
          if (response.statusCode in redirectStatusCodes) {
            request.end();
            self.open(options.method, response.headers["location"]);
            callee.call(self);
            return;
          }
          
          setReadyState(HEADERS_RECEIVED);
          extractStatus(response);
          extractHeaders(response);
          
          if (handlers.readystatechange) {
            handlers.readystatechange.call(self);
          }
          
          response.on("data", function(chunk) {
            setReadyState(LOADING);
            responseBuffer.push(chunk);
            
            if (handlers.readystatechange) {
              handlers.readystatechange.call(self);
            }
          });
          
          response.on("end", function() {
            setReadyState(DONE);
            
            if (handlers.readystatechange) {
              handlers.readystatechange.call(self);
            }
            
            if (handlers.load) {
              handlers.load.call(self);
            }
          });
        });
        
        request.on("error", function(error) {
          
        });
        
        if (data) {
          request.write(data);  
        }
        
        request.end();
      })();
    },
    
    overrideMimeType: function(mimetype) {
    },
    
    setRequestHeader: function(header, value) {
    },
    
    sendAsBinary: function(body) {
    },
    
    getAllResponseHeaders: function() {
      if (!isUnsentOpenedAndError()) {
        return "";
      }
      
      if (!allHeaders) {
        var buffer = [];
        
        for (var i in headers) {
          buffer.push(i + ": " + headers[i]);
        }
        
        allHeaders = buffer.join("\n");
      }
      
      return allHeaders;
    },
    
    getResponseHeader: function(header) {
      if (!isUnsentOpenedAndError()) {
        return null;
      }
      return headers[header.toLowerCase()] || null;
    },
    
    get readyState() {
      return readyState;
    },
    
    get status() {
      if (!isUnsentOpenedAndError()) {
        return 0;
      }
      return statusCode;
    },
    
    get statusText() {
      if (!isUnsentOpenedAndError()) {
        return "";
      }
      return statusText;
    },
    
    get responseType() {
      return responseType;
    },
    
    set responseType(type) {
      type = String(type || "").toLowerCase();
      
      if (type in responseTypes) {
        responseType = type;
      }
    },
    
    get response() {
      switch (responseType) {
        case "":
        case "text":
          return ResponseBody.getText();
        case "json":
          return ResponseBody.getJSON();
        case "arraybuffer":
          return ResponseBody.getArrayBuffer();
      }
    },
    
    get responseText() {
      return ResponseBody.getText();
    },
    
    get responseXml() {
      
    },
    
    set onloadstart(handler) {
      handlers.loadstart = handler;
    },
    get onloadstart() {
      return handlers.loadstart;
    },
    
    set onprogress(handler) {
      handlers.progress = handler;
    },
    get onprogress() {
      return handlers.progress;
    },
    
    set onabort(handler) {
      handlers.abort = handler;
    },
    get onabort() {
      return handlers.abort;
    },
    
    set onerror(handler) {
      handlers.error = handler;
    },
    get onerror() {
      return handlers.error;
    },
    
    set onload(handler) {
      handlers.load = handler;
    },
    get onload() {
      return handlers.load;
    },
    
    set ontimeout(handler) {
      handlers.timeout = handler;
    },
    get ontimeout() {
      return handlers.timeout;
    },
    
    set onloadend(handler) {
      handlers.loadend = handler;
    },
    get onloadend() {
      return handlers.loadend;
    },
    
    set onreadystatechange(handler) {
      handlers.readystatechange = handler;
    },
    get onreadystatechange() {
      return handlers.readystatechange;
    }
  };
}

XMLHttpRequest2.UNSENT = UNSENT;
XMLHttpRequest2.OPENED = OPENED;
XMLHttpRequest2.HEADERS_RECEIVED = HEADERS_RECEIVED;
XMLHttpRequest2.LOADING = LOADING;
XMLHttpRequest2.DONE = DONE;

module.exports.XMLHttpRequest2 = XMLHttpRequest2;