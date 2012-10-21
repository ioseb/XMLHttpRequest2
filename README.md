#Introduction to XMLHttpRequest2 

XMLHttpRequest2 is a node.js module targeting [XMLHttpRequest Level 2][1] specification. 

[1]: http://www.w3.org/TR/XMLHttpRequest

##Usage Example

```
var XMLHttpRequest = require("./xmlhttprequest2").XMLHttpRequest2;

var xhr = new XMLHttpRequest();
var url = "https://api.github.com/users/ioseb/gists";

xhr.open("GET", url);

xhr.onload = function() {
  console.log(this.response);
};

xhr.send(null);

// or alternatively
xhr.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    console.log("this");
  }
};

xhr.send(null);
```

##API Details

For methods and supported events see [XMLHttpRequest Level 2 Specification][1].

##Implementation Details and Missing Features

Although module supports a most of the functionality described in [specification][1] significant number of features are not supported yet. 

