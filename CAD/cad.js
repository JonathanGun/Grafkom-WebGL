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
var typeValue;
var numShapes;
var numDots;
var startX;
var startY;

// array
var start;
var type;

// string
var mode; // draw, edit, delete, null

var mouseClicked = false;

function clear(){
  index = 0;
  numShapes = 0;
  numDots = [0];
  start = [0];
  type = [];
  mode = "draw";
  console.log("Canvas cleared!");
}

function readFile(){
  // TODO
  // baca dari file: warna, titik, dll
}

function insertDot(index, mouseXY){
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(mouseXY));
}

function insertColor(index, c){
  gl.bindBuffer(gl.ARRAY_BUFFER, cBufferId);
  gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(c));
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

  // Canvas listeners
  canvas.addEventListener("mousedown", function(event){
    mouseClicked = true;
    var mouseX = 2 * event.clientX / canvas.width - 1;
    var mouseY = 2 * (canvas.height - event.clientY) / canvas.height - 1;

    if(mode == "draw"){
      if(typeValue == "line"){
        console.log("Now drawing line");

        type[numShapes] = typeValue;
        numDots[numShapes] = 2;
        start[numShapes] = index;
        startX = mouseX;
        startY = mouseY;
        
        // init line
        insertDot(index, vec2(startX, startY));
        insertDot(index+1, vec2(startX, startY));
      } else if(typeValue == "square"){
        console.log("Now drawing line");
        
        type[numShapes] = typeValue;
        numDots[numShapes] = 4;
        start[numShapes] = index;
        startX = mouseX;
        startY = mouseY;

        // init square
        insertDot(index, vec2(startX, startY));
        insertDot(index+1, vec2(startX, startY));
        insertDot(index+2, vec2(startX, startY));
        insertDot(index+3, vec2(startX, startY));
      } else if(typeValue == "polygon"){
        // do nothing, harus di klik klik
      }
    } else if (mode == "edit"){
      // TODO
      // if item held = dot, masukin ke variabel
      // else (misal sisi nya) do nothing -> karena bukan di drag tapi di klik
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

    if(mode == "draw"){
      if(typeValue == "line"){
        numShapes++;
        index+=2;
      } else if(typeValue == "square"){
        // TODO kalo uda jadi diuncomment:
        // numShapes++;
      } else if(typeValue == "polygon"){
        // do nothing, harus di klik klik
      }
    }
  });
  
  canvas.addEventListener("mousemove", function(event) {
    if(mouseClicked){
      if(mode == "draw"){
        var mouseX = 2 * event.clientX / canvas.width - 1;
        var mouseY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
        if(typeValue == "line"){
          if(Math.abs(mouseX-startX) > epsilon){
            insertDot(index, vec2(startX, startY));
            insertDot(index+1, vec2(mouseX, mouseY));
            
            // default black line
            insertColor(index, vec4(colors[0]));
            insertColor(index+1, vec4(colors[0]));
          }
        } else if(typeValue == "square"){
          if(Math.abs(mouseX-startX) > epsilon){
            insertDot(index, vec2(startX, startY));
            // TODO hitung 3 node lainnya, insert ke index+1, index+2, sama index+3
            insertColor(index, vec4(colors[0]));
            // TODO jangan lupa insert colornya
          }
        } else if(typeValue == "polygon"){
          // do nothing, polygon gabisa didrag
        }
        
      } else if (mode == "edit") {
        // TODO pindahin dot nya
      } else if (mode == "delete"){
        // TODO do nothing
      }
    }
  });

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.8, 0.8, 0.8, 1.0);
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

  for (var i = 0; i <= numShapes; i++) {
    gl.drawArrays(gl.POINTS, start[i], numDots[i]);
  }
  for (var i = 0; i <= numShapes; i++) {
    gl.drawArrays(typeMap[type[i]], start[i], numDots[i]);
  }

  setTimeout(
    function() {
      requestAnimFrame(render);
    }, delay
  );
}