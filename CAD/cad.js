"use strict";

// const
var canvas;
var gl;
var bufferId;
var cBufferId;
var maxNumVertices = 20000;
var delay = 50;
var epsilon = 0.5 / 100;

var colors = [
  vec4(0.0, 0.0, 0.0, 1.0), // black
  vec4(1.0, 0.0, 0.0, 1.0), // red
  vec4(1.0, 1.0, 0.0, 1.0), // yellow
  vec4(0.0, 1.0, 0.0, 1.0), // green
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(1.0, 0.0, 1.0, 1.0), // magenta
  vec4(0.0, 1.0, 1.0, 1.0) // cyan
];

var typeMap;

// int
var index;
var numShapes;
var numDots;
var editedDotIdx;

// vec2
var startXY;

// array
var start;
var type;

// string
var mode = "draw"; // draw, edit, null
var typeValue = "line"; // line, square, polygon

var shapes = [];

var mouseClicked = false;

function clear() {
  index = 0;
  numShapes = 0;
  numDots = [0];
  start = [0];
  type = [];
  shapes = [];
  editedDotIdx = vec2(-1, -1);
  mode = "draw";
  console.log("Canvas cleared!");
}

// load and save
function readFile(inp) {
  readFileContent(inp.files[0]).then(jsonData => {
    shapes = JSON.parse(jsonData);
    loadToBuffer();
    numShapes = shapes.length;
    console.log("File loaded!");
    // TODO update HTML on All Shapes section
  }).catch(error => console.log(error));
}

function loadToBuffer() {
  var startIdxTmp = 0;
  shapes.forEach((shape, i) => {
    type[i] = shape.type;
    start[i] = startIdxTmp;
    numDots[i] = shape.dots.length;

    shape.dots.forEach((dot, i) => {
      insertDot(startIdxTmp, vec2(dot));
      insertColor(startIdxTmp, vec4(shape.color));
      startIdxTmp++;
    })
  })
  index = startIdxTmp;
}

function readFileContent(file) {
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = event => resolve(event.target.result)
    reader.onerror = error => reject(error)
    reader.readAsText(file)
  })
}

function download(content, fileName, contentType) {
  var a = document.createElement("a");
  var file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

// webgl buffer
function insertDot(index, mouseXY) {
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(mouseXY));
}

function insertColor(index, c) {
  gl.bindBuffer(gl.ARRAY_BUFFER, cBufferId);
  gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(c));
}

// math helper
function distance(u, v) {
  return length(subtract(u, v));
}

function closeEnough(u, v) {
  return distance(u, v) <= epsilon;
}

function convertToRgb(hex) {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  return [r, g, b];
}

window.onload = function init() {
  clear();
  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  typeMap = {
    "line": gl.LINES,
    "square": gl.TRIANGLE_FAN,
    "polygon": gl.TRIANGLE_FAN,
  }

  // Button listeners
  var typeSelect = document.getElementById("type");
  typeSelect.addEventListener("click", function () {
    typeValue = typeSelect.value;
    mode = "draw";
    console.log("Now on draw mode. Shape type: " + typeValue);
  });

  var clearButton = document.getElementById("clearButton")
  clearButton.addEventListener("click", clear);

  var editButton = document.getElementById("editButton");
  editButton.addEventListener("click", function () {
    mode = "edit";
    console.log("Now in edit mode");
  });

  var helpButton = document.getElementById("helpButton");
  helpButton.addEventListener("click", function () {
    let help = document.getElementById("help");
    let disp = help.style.display;
    help.style.display = disp == "none" ? "block" : "none";
  });

  var downloadButton = document.getElementById("downloadButton");
  downloadButton.addEventListener("click", function () {
    download(JSON.stringify(shapes, null, 2), document.getElementById("file-name").value + ".json", 'application/json');
  });

  function addShape(type, n) {
    // create a div like this:
    // <div id="shape-0">
    //   <div>Type: <span id="shape-type-0">line</span></div>
    //   <div>Dots: <span id="shape-dots-0">(0,0), (1,1)</span></div>
    //   <div>Length: <input type="text" id="shape-length-0" value="0.5"></div>
    //   <div>Color: <span id="shape-color-0">0,0,0,1</span></div>
    //   <br>
    // </div>

    var div = document.createElement("div");
    div.setAttribute("id", "shape-" + numShapes);
    div.innerHTML = numShapes;

    var typeSpan = document.createElement("span");
    typeSpan.setAttribute("id", "shape-type" + numShapes);
    var dotsSpan = document.createElement("span");
    dotsSpan.setAttribute("id", "shape-dots-" + numShapes);
    var lengthSpan = document.createElement("input");
    lengthSpan.setAttribute("id", "shape-length-" + numShapes);
    var colorSpan = document.createElement("input");
    colorSpan.setAttribute("type", "color");
    colorSpan.setAttribute("id", "shape-color-" + numShapes);
    colorSpan.onchange = editColor;

    let typeP = document.createElement("div");
    typeP.appendChild(document.createTextNode("Type: "));
    typeP.appendChild(typeSpan);

    let dotsP = document.createElement("div");
    dotsP.appendChild(document.createTextNode("Dots: "));
    dotsP.appendChild(dotsSpan);

    let lengthP = document.createElement("div");

    if(type != "polygon"){
      lengthP.appendChild(document.createTextNode("Length: "));
      lengthP.appendChild(lengthSpan);
    }
    

    let colorP = document.createElement("div");
    colorP.appendChild(document.createTextNode("Color: "));
    colorP.appendChild(colorSpan);

    if (type == "line") {
      typeSpan.innerHTML = type;
      dotsSpan.innerHTML = shapes[numShapes].dots;
      lengthSpan.value = length(subtract(shapes[numShapes].dots[0], shapes[numShapes].dots[1]));
      lengthSpan.onchange = editLineLength;
      // colorSpan.innerHTML = shapes[numShapes].color;

      div.appendChild(typeP);
      div.appendChild(dotsP);
      div.appendChild(lengthP);
      div.appendChild(colorP);
    } else if (type == "square") {
      typeSpan.innerHTML = type;
      dotsSpan.innerHTML = shapes[numShapes].dots;
      lengthSpan.value = length(subtract(shapes[numShapes].dots[0], shapes[numShapes].dots[1]));
      lengthSpan.onchange = editSquareLength;

      div.appendChild(typeP);
      div.appendChild(dotsP);
      div.appendChild(lengthP);
      div.appendChild(colorP);
    } else if (type == "polygon") {
      typeSpan.innerHTML = type;
      dotsSpan.innerHTML = shapes[numShapes].dots;

      div.appendChild(typeP);
      div.appendChild(dotsP);
      div.appendChild(lengthP);
      div.appendChild(colorP);
    } else {
      return;
    }
    div.appendChild(document.createElement("br"));
    document.getElementById("shapes").appendChild(div);
    numShapes++;
    index += 2;
  }

  function editLineLength(e) {
    // asumsi titik pertama selalu fixed, hanya memindahkan titik kedua
    var idx = e.target.id.split("-").slice(-1)[0];
    let k = e.target.value / length(subtract(shapes[idx].dots[1], shapes[idx].dots[0]));
    var lineLengthVec = subtract(shapes[idx].dots[1], shapes[idx].dots[0]);
    shapes[idx].dots[1] = add(shapes[idx].dots[0], vec2(lineLengthVec[0] * k, lineLengthVec[1] * k));
  }

  function editSquareLength(e) {
    // asumsi titik pertama selalu fixed, hanya memindahkan titik kedua
    console.log(e.target.value);
    console.log(shapes[idx]);
    var idx = e.target.id.split("-").slice(-1)[0];
    let k = e.target.value / length(subtract(shapes[idx].dots[1], shapes[idx].dots[0]));
    var lineLengthVec = subtract(shapes[idx].dots[1], shapes[idx].dots[0]);
    var lineLengthVec2 = subtract(shapes[idx].dots[2], shapes[idx].dots[0]);
    var lineLengthVec3 = subtract(shapes[idx].dots[3], shapes[idx].dots[0]);

    shapes[idx].dots[1] = add(shapes[idx].dots[0], vec2(lineLengthVec[0] * k, lineLengthVec[1] * k));
    shapes[idx].dots[2] = add(shapes[idx].dots[0], vec2(lineLengthVec2[0] * k, lineLengthVec2[1] * k));
    shapes[idx].dots[3] = add(shapes[idx].dots[0], vec2(lineLengthVec3[0] * k, lineLengthVec3[1] * k));
  }

  function editColor(e) {
    let rgbColor = convertToRgb(e.target.value);

    var idx = e.target.id.split("-").slice(-1)[0];
    var newColor = vec4(rgbColor[0] / 255, rgbColor[1] / 255, rgbColor[2] / 255, 1);

    shapes[idx].color = newColor;
  }

  // Canvas listeners
  canvas.addEventListener("mousedown", function (event) {
    mouseClicked = true;
    var mouseX = 2 * event.clientX / canvas.width - 1;
    var mouseY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
    let mouse = vec2(mouseX, mouseY);


    if (mode == "draw") {
      if (typeValue == "line") {
        console.log("Now drawing line");

        startXY = mouse;
        shapes[numShapes] = {
          "type": "line",
          "dots": [startXY, startXY],
          "color": vec4(colors[0]),
        }
      } else if (typeValue == "square") {
        console.log("Now drawing Square");

        startXY = mouse;
        shapes[numShapes] = {
          "type": "square",
          "dots": [startXY, startXY, startXY, startXY],
          "color": vec4(colors[0]),
        }
      } else if (typeValue == "polygon") {
        // do nothing, harus di klik klik
      }
    } else if (mode == "edit") {
      editedDotIdx = vec2(-1, -1);
      shapes.forEach((shape, i) => {
        shape.dots.forEach((dot, j) => {
          var dist = distance(mouse, vec2(dot));
          if (dist < epsilon * 10) {
            editedDotIdx = vec2(i, j);
          }
        })
      })
    }
  });

  canvas.addEventListener("click", function (event) {
    var mouseX = 2 * event.clientX / canvas.width - 1;
    var mouseY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
    var mouse = vec2(mouseX, mouseY);
    var XY = mouse

    if (mode == "draw") {
      if (typeValue == "polygon") {
        if (!shapes[numShapes]) {
          shapes[numShapes] = {
            "type": "polygon",
            "dots": [XY],
            "color": vec4(colors[0]),
          }
          startXY = XY;
        }

        else {
          if (distance(XY, shapes[numShapes].dots[0]) <= epsilon * 10) {
            // if (inside(XY, shapes[numShapes].dots)) {
            addShape("polygon", shapes[numShapes].dots.length);
            console.log("Berhasil menambah polygon");
          } else {
            shapes[numShapes].dots.push(XY);
          }
        }
      }
    } else if (mode == "edit") {
      // TODO if item clicked = sisi, bisa ubah panjang sisinya
    }
  });

  canvas.addEventListener("mouseup", function (event) {
    mouseClicked = false;
    var mouseX = 2 * event.clientX / canvas.width - 1;
    var mouseY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
    var mouse = vec2(mouseX, mouseY);

    if (mode == "draw") {
      if (typeValue == "line") {
        if (!closeEnough(mouse, startXY)) {
          addShape("line", 2);
        }
      } else if (typeValue == "square") {
        if (!closeEnough(mouse, startXY)) {
          addShape("square", 4);
        }
      } else if (typeValue == "polygon") {
        // do nothing, harus di klik klik
      }
    }
  });

  canvas.addEventListener("mousemove", function (event) {
    var mouseX = 2 * event.clientX / canvas.width - 1;
    var mouseY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
    var mouse = vec2(mouseX, mouseY);

    if (mouseClicked) {
      if (mode == "draw") {
        if (typeValue == "line") {
          if (!closeEnough(mouse, startXY)) {
            shapes[numShapes] = {
              "type": "line",
              "dots": [startXY, mouse],
              "color": vec4(colors[0]),
            }
          }
        } else if (typeValue == "square") {
          if (!closeEnough(mouse, startXY)) {
            var panjang = mouse[0] - startXY[0];
            var lebar = mouse[1] - startXY[1];
            var garisMin = Math.min(Math.abs(panjang), Math.abs(lebar));
            if ((panjang > 0) && (lebar < 0)) {
              shapes[numShapes] = {
                "type": "square",
                "dots": [startXY, vec2(startXY[0] + garisMin, startXY[1]), vec2(startXY[0] + garisMin, startXY[1] - garisMin), vec2(startXY[0], startXY[1] - garisMin)],
                "color": vec4(colors[0]),
              }
            } else if ((panjang > 0) && (lebar > 0)) {
              shapes[numShapes] = {
                "type": "square",
                "dots": [startXY, vec2(startXY[0] + garisMin, startXY[1]), vec2(startXY[0] + garisMin, startXY[1] + garisMin), vec2(startXY[0], startXY[1] + garisMin)],
                "color": vec4(colors[0]),
              }
            } else if ((panjang < 0) && (lebar > 0)) {
              shapes[numShapes] = {
                "type": "square",
                "dots": [startXY, vec2(startXY[0] - garisMin, startXY[1]), vec2(startXY[0] - garisMin, startXY[1] + garisMin), vec2(startXY[0], startXY[1] + garisMin)],
                "color": vec4(colors[0]),
              }
            } else if ((panjang < 0) && (lebar < 0)) {
              shapes[numShapes] = {
                "type": "square",
                "dots": [startXY, vec2(startXY[0] - garisMin, startXY[1]), vec2(startXY[0] - garisMin, startXY[1] - garisMin), vec2(startXY[0], startXY[1] - garisMin)],
                "color": vec4(colors[0]),
              }
            }
          }
        } else if (typeValue == "polygon") {
          // do nothing, polygon gabisa didrag
        }

      } else if (mode == "edit") {
        console.log(shapes[editedDotIdx[0]].type);
        if ((shapes[editedDotIdx[0]].type == "line") || (shapes[editedDotIdx[0]].type == "polygon")) {
          if (!(equal(editedDotIdx, vec2(-1, -1)))) {
            shapes[editedDotIdx[0]].dots[editedDotIdx[1]] = mouse;
          }
        } else if(shapes[editedDotIdx[0]].type == "square"){
          //SQUARE
          
          console.log("MASUK SINI")
          if (!(equal(editedDotIdx, vec2(-1, -1)))) {
            var titikMana = shapes[editedDotIdx[0]].dots[editedDotIdx[1]];
            if (titikMana == shapes[editedDotIdx[0]].dots[0]){             
              var panjang = mouse[0] - titikMana[0];
              var lebar = mouse[1] - titikMana[1];
              var garisMin = Math.min(Math.abs(panjang), Math.abs(lebar));
              if((mouse[0]>titikMana[0]) && (mouse[1]<titikMana[1])){
                shapes[editedDotIdx[0]].dots[0] = vec2(shapes[editedDotIdx[0]].dots[0][0]+garisMin, shapes[editedDotIdx[0]].dots[0][1]-garisMin);
                shapes[editedDotIdx[0]].dots[1] = vec2(shapes[editedDotIdx[0]].dots[1][0], shapes[editedDotIdx[0]].dots[1][1]-garisMin);
                shapes[editedDotIdx[0]].dots[3] = vec2(shapes[editedDotIdx[0]].dots[3][0]+garisMin, shapes[editedDotIdx[0]].dots[3][1]);
              }  
              else if((mouse[0]<titikMana[0]) && (mouse[1]>titikMana[1])){
                shapes[editedDotIdx[0]].dots[0] = vec2(shapes[editedDotIdx[0]].dots[0][0]-garisMin, shapes[editedDotIdx[0]].dots[0][1]+garisMin);
                shapes[editedDotIdx[0]].dots[1] = vec2(shapes[editedDotIdx[0]].dots[1][0], shapes[editedDotIdx[0]].dots[1][1]+garisMin);
                shapes[editedDotIdx[0]].dots[3] = vec2(shapes[editedDotIdx[0]].dots[3][0]-garisMin, shapes[editedDotIdx[0]].dots[3][1]);
              }           
            }
            else if (titikMana == shapes[editedDotIdx[0]].dots[1]){             
              var panjang = mouse[0] - titikMana[0];
              var lebar = mouse[1] - titikMana[1];
              var garisMin = Math.min(Math.abs(panjang), Math.abs(lebar));
              if((mouse[0]>titikMana[0]) && (mouse[1]>titikMana[1])){
                shapes[editedDotIdx[0]].dots[0] = vec2(shapes[editedDotIdx[0]].dots[0][0], shapes[editedDotIdx[0]].dots[0][1]+garisMin);
                shapes[editedDotIdx[0]].dots[1] = vec2(shapes[editedDotIdx[0]].dots[1][0]+garisMin, shapes[editedDotIdx[0]].dots[1][1]+garisMin);
                shapes[editedDotIdx[0]].dots[2] = vec2(shapes[editedDotIdx[0]].dots[2][0]+garisMin, shapes[editedDotIdx[0]].dots[2][1]);
              }  
              else if((mouse[0]<titikMana[0]) && (mouse[1]<titikMana[1])){
                shapes[editedDotIdx[0]].dots[0] = vec2(shapes[editedDotIdx[0]].dots[0][0], shapes[editedDotIdx[0]].dots[0][1]-garisMin);
                shapes[editedDotIdx[0]].dots[1] = vec2(shapes[editedDotIdx[0]].dots[1][0]-garisMin, shapes[editedDotIdx[0]].dots[1][1]-garisMin);
                shapes[editedDotIdx[0]].dots[2] = vec2(shapes[editedDotIdx[0]].dots[2][0]-garisMin, shapes[editedDotIdx[0]].dots[2][1]);
              }           
            }
            else if (titikMana == shapes[editedDotIdx[0]].dots[2]){             
              var panjang = mouse[0] - titikMana[0];
              var lebar = mouse[1] - titikMana[1];
              var garisMin = Math.min(Math.abs(panjang), Math.abs(lebar));
              if((mouse[0]>titikMana[0]) && (mouse[1]<titikMana[1])){               
                shapes[editedDotIdx[0]].dots[1] = vec2(shapes[editedDotIdx[0]].dots[1][0]+garisMin, shapes[editedDotIdx[0]].dots[1][1]);
                shapes[editedDotIdx[0]].dots[2] = vec2(shapes[editedDotIdx[0]].dots[2][0]+garisMin, shapes[editedDotIdx[0]].dots[2][1]-garisMin);
                shapes[editedDotIdx[0]].dots[3] = vec2(shapes[editedDotIdx[0]].dots[3][0], shapes[editedDotIdx[0]].dots[3][1]-garisMin);
              }  
              else if((mouse[0]<titikMana[0]) && (mouse[1]>titikMana[1])){
                shapes[editedDotIdx[0]].dots[1] = vec2(shapes[editedDotIdx[0]].dots[1][0]-garisMin, shapes[editedDotIdx[0]].dots[1][1]);
                shapes[editedDotIdx[0]].dots[2] = vec2(shapes[editedDotIdx[0]].dots[2][0]-garisMin, shapes[editedDotIdx[0]].dots[2][1]+garisMin);
                shapes[editedDotIdx[0]].dots[3] = vec2(shapes[editedDotIdx[0]].dots[3][0], shapes[editedDotIdx[0]].dots[3][1]+garisMin);
              }           
            }
            else if (titikMana == shapes[editedDotIdx[0]].dots[3]){             
              var panjang = mouse[0] - titikMana[0];
              var lebar = mouse[1] - titikMana[1];
              var garisMin = Math.min(Math.abs(panjang), Math.abs(lebar));
              if((mouse[0]<titikMana[0]) && (mouse[1]<titikMana[1])){               
                shapes[editedDotIdx[0]].dots[0] = vec2(shapes[editedDotIdx[0]].dots[0][0]-garisMin, shapes[editedDotIdx[0]].dots[0][1]);
                shapes[editedDotIdx[0]].dots[2] = vec2(shapes[editedDotIdx[0]].dots[2][0], shapes[editedDotIdx[0]].dots[2][1]-garisMin);
                shapes[editedDotIdx[0]].dots[3] = vec2(shapes[editedDotIdx[0]].dots[3][0]-garisMin, shapes[editedDotIdx[0]].dots[3][1]-garisMin);
              }  
              else if((mouse[0]>titikMana[0]) && (mouse[1]>titikMana[1])){
                shapes[editedDotIdx[0]].dots[0] = vec2(shapes[editedDotIdx[0]].dots[0][0]+garisMin, shapes[editedDotIdx[0]].dots[0][1]);
                shapes[editedDotIdx[0]].dots[2] = vec2(shapes[editedDotIdx[0]].dots[2][0], shapes[editedDotIdx[0]].dots[2][1]+garisMin);
                shapes[editedDotIdx[0]].dots[3] = vec2(shapes[editedDotIdx[0]].dots[3][0]+garisMin, shapes[editedDotIdx[0]].dots[3][1]+garisMin);
              }           
            }
          }
        }
      }
    }
  });

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  //
  //  Load shaders and initialize attribute buffers
  //
  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // create buffer for drawings
  bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumVertices, gl.STATIC_DRAW);
  var vPos = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPos, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPos);

  // create buffer for colors
  cBufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBufferId);
  gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.STATIC_DRAW);
  var vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);

  render();
}

// function inside(point, vs) {
//   var x = point[0], y = point[1];

//   var inside = false;
//   for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
//     var xi = vs[i][0], yi = vs[i][1];
//     var xj = vs[j][0], yj = vs[j][1];

//     var intersect = ((yi > y) != (yj > y))
//       && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
//     if (intersect) inside = !inside;
//   }

//   return inside;
// };

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  loadToBuffer();

  // if lagi ngegambar, show gambar saat ini
  var tmp = mouseClicked ? (numShapes + 1) : (numShapes);
  tmp = type[tmp] == "polygon" ? (tmp + 1) : (tmp);
  for (var i = 0; i < tmp; i++) {
    if (shapes[i]) {
      gl.drawArrays(gl.POINTS, start[i], numDots[i]);
    }
  }
  for (var i = 0; i < tmp; i++) {
    if (type[i] == "polygon" && numShapes == i && closeEnough(startXY, shapes[i].dots[0])) {
      gl.drawArrays(gl.LINE_STRIP, start[i], numDots[i]);
    } else {
      gl.drawArrays(typeMap[type[i]], start[i], numDots[i]);
    }
  }


  if (mouseClicked && !equal(editedDotIdx, vec2(-1, -1))) {
    document.getElementById("selected-shape").innerHTML = shapes[editedDotIdx[0]].type;
    document.getElementById("selected-idx").innerHTML = editedDotIdx[1] + 1;
  } else {
    document.getElementById("selected-shape").innerHTML = "";
    document.getElementById("selected-idx").innerHTML = "";
  }

  setTimeout(
    function () {
      requestAnimFrame(render);
    }, delay
  );
}