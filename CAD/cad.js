"use strict";

// const
var canvas;
var gl;
var bufferId;
var cBufferId;
var maxNumVertices = 20000;
var delay = 50;
var epsilon = 0.5/100;

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
var mode = "draw"; // draw, edit, delete, null
var typeValue = "line"; // line, square, polygon

var shapes = [];

var mouseClicked = false;

function clear(){
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
function readFile(inp){
  readFileContent(inp.files[0]).then(jsonData => {
    shapes = JSON.parse(jsonData);
    loadToBuffer();
    numShapes = shapes.length;
    console.log("File loaded!");
  }).catch(error => console.log(error));
}

function loadToBuffer(){
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
  var file = new Blob([content], {type: contentType});
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

// webgl buffer
function insertDot(index, mouseXY){
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(mouseXY));
}

function insertColor(index, c){
  gl.bindBuffer(gl.ARRAY_BUFFER, cBufferId);
  gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(c));
}

// math helper
function distance(u, v){
  return length(subtract(u, v));
}

function closeEnough(u, v){
  return distance(u, v) <= epsilon;
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
    "square": gl.QUADS,
    "polygon": gl.POLYGON,
  }

  // Button listeners
  var typeSelect = document.getElementById("type");
  typeSelect.addEventListener("click", function() {
    typeValue = typeSelect.value;
    mode = "draw";
    console.log("Now on draw mode. Shape type: " + typeValue);
  });

  var clearButton = document.getElementById("clearButton")
  clearButton.addEventListener("click", clear);

  var editButton = document.getElementById("editButton");
  editButton.addEventListener("click", function() {
    mode = "edit";
    console.log("Now in edit mode");
  });

  var deleteButton = document.getElementById("deleteButton");
  deleteButton.addEventListener("click", function() {
    mode = "delete";
    console.log("Now in delete mode");
  });

  var downloadButton = document.getElementById("downloadButton");
  downloadButton.addEventListener("click", function() {
    download(JSON.stringify(shapes), document.getElementById("file-name").value + ".txt", 'text/plain');
  });

  // Canvas listeners
  canvas.addEventListener("mousedown", function(event){
    mouseClicked = true;
    var mouseX = 2 * event.clientX / canvas.width - 1;
    var mouseY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
    let mouse = vec2(mouseX, mouseY);


    if(mode == "draw"){
      if(typeValue == "line"){
        console.log("Now drawing line");

        startXY = mouse;
        shapes[numShapes] = {
          "type": "line",
          "dots": [startXY, startXY],
          "color": vec4(colors[0]),
        }
      } else if(typeValue == "square"){
        console.log("Now drawing line");
        
        startXY = mouse;
        shapes[numShapes] = {
          "type": "square",
          "dots": [startXY, startXY, startXY, startXY],
          "color": vec4(colors[0]),
        }
      } else if(typeValue == "polygon"){
        // do nothing, harus di klik klik
      }
    } else if (mode == "edit"){
      editedDotIdx = vec2(-1, -1);
      shapes.forEach((shape, i) => {
        shape.dots.forEach((dot, j) => {
          var dist = distance(mouse, vec2(dot));
          if(dist < epsilon * 10){
            editedDotIdx = vec2(i, j);
          }
        })
      })
    } else if (mode == "delete"){
      // TODO do nothing kalau di drag
    }
  });

  canvas.addEventListener("click", function(event){
    if(mode == "draw"){
      if(typeValue == "polygon"){
        // TODO save titik2nya
      }
    } else if(mode == "edit"){
      // TODO if item clicked = sisi, bisa ubah panjang sisinya
    } else if(mode == "delete"){
      // TODO delete barangnya
    }
  });
  
  canvas.addEventListener("mouseup", function(event){
    mouseClicked = false;
    var mouseX = 2 * event.clientX / canvas.width - 1;
    var mouseY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
    var mouse = vec2(mouseX, mouseY);

    if(mode == "draw"){
      if(typeValue == "line"){
        if(!closeEnough(mouse, startXY)){
          numShapes++;
          index += 2;
        }
      } else if(typeValue == "square"){
        // TODO kalo uda jadi diuncomment:
        // numShapes++;
        // index += 4;
      } else if(typeValue == "polygon"){
        // do nothing, harus di klik klik
      }
    }
  });
  
  canvas.addEventListener("mousemove", function(event) {
    var mouseX = 2 * event.clientX / canvas.width - 1;
    var mouseY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
    var mouse = vec2(mouseX, mouseY);
    
    if(mouseClicked){
      if(mode == "draw"){
        if(typeValue == "line"){
          if(!closeEnough(mouse, startXY)){
            shapes[numShapes] = {
              "type": "line",
              "dots": [startXY, mouse],
              "color": vec4(colors[0]),
            }
          }
        } else if(typeValue == "square"){
          if(Math.abs(mouseX-startX) > epsilon){
            // TODO hitung 3 titik lainnya, masukin ke array shapes[numShapes], jangan lupa colornya
          }
        } else if(typeValue == "polygon"){
          // do nothing, polygon gabisa didrag
        }
        
      } else if (mode == "edit") {
        if(!(equal(editedDotIdx, vec2(-1, -1)))){
          shapes[editedDotIdx[0]].dots[editedDotIdx[1]] = mouse;
        }
      } else if (mode == "delete"){
        // do nothing
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

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  loadToBuffer();
  
  // if lagi ngegambar, show gambar saat ini
  var tmp = mouseClicked?(numShapes+1):(numShapes);
  for (var i = 0; i < tmp; i++) {
    gl.drawArrays(gl.POINTS, start[i], numDots[i]);
  }
  for (var i = 0; i < tmp; i++) {
    // if currently drawing polygon and not finished, show as line strip
    if(mouseClicked && i == tmp-1 && type[i] == "polygon"){
      gl.drawArrays(gl.LINE_STRIP, start[i], numDots[i]);
    } else {
      gl.drawArrays(typeMap[type[i]], start[i], numDots[i]);
    }
  }

  if(mouseClicked && !equal(editedDotIdx, vec2(-1, -1))){
    document.getElementById("selected-shape").innerHTML = shapes[editedDotIdx[0]].type;
    document.getElementById("selected-idx").innerHTML = editedDotIdx[1] + 1;
  } else {
    document.getElementById("selected-shape").innerHTML = "";
    document.getElementById("selected-idx").innerHTML = "";
  }

  setTimeout(
    function() {
      requestAnimFrame(render);
    }, delay
  );
}