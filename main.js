'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let texture0;
let cameraText;
let video;
let BG;
let orient = null;


function deg2rad(angle) {
  return angle * Math.PI / 180;
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, textureList) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureList), gl.STREAM_DRAW);
  
      gl.enableVertexAttribArray(shProgram.itextureCoords);
      gl.vertexAttribPointer(shProgram.itextureCoords, 2, gl.FLOAT, false, 0, 0);
  
      this.count = vertices.length / 3;
    }

    this.Draw = function() {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
      gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shProgram.iAttribVertex);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
      gl.vertexAttribPointer(shProgram.itextureCoords, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shProgram.itextureCoords);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.itextureCoords = -1;
    this.iTextUnit = -1;

    this.Use = function() {
      gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const eyeSeparation = parseFloat(document.getElementById('eyeSeparation').value);
  const convergence = parseFloat(document.getElementById('convergence').value);
  const fieldOfView = parseFloat(document.getElementById('fieldOfView').value);
  const near = parseFloat(document.getElementById('near').value);

  let top = near * Math.tan(fieldOfView / 2.0);
  let bottom = -top;

  let a = Math.tan(fieldOfView / 2.0) * convergence;
  let b = a - eyeSeparation / 2;
  let c = a + eyeSeparation / 2;

  let left = -b * near / convergence;
  let right = c * near / convergence;

  let leftP = m4.orthographic(left, right, bottom, top, near, far);

  left = -c * near / convergence;
  right = b * near / convergence;

  let rightP = m4.orthographic(left, right, bottom, top, near, far);

  /* Get the view matrix from the SimpleRotator object. */
  let modelView = spaceball.getViewMatrix();

  if (orientationEvent.alpha && orientationEvent.beta && orientationEvent.gamma) {
    let alpha = orientationEvent.alpha * (Math.PI / 180);
    let beta = orientationEvent.beta * (Math.PI / 180);
    let gamma = orientationEvent.gamma * (Math.PI / 180);

    let rotationMatZ = m4.axisRotation([0, 0, 1], alpha);
    let rotationMatX = m4.axisRotation([1, 0, 0], -beta);
    let rotationMayY = m4.axisRotation([0, 1, 0], gamma);

    let rotationMatrix = m4.multiply(m4.multiply(rotationMatX, rotationMayY), rotationMatZ);
    let translationMatrix = m4.translation(0, 0, -2);

    modelView = m4.multiply(rotationMatrix, translationMatrix);
  }

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);

  let leftTrans = m4.translation(-0.01, 0, -20);
  let rightTrans = m4.translation(0.01, 0, -20);

  let matrixMult = m4.multiply(rotateToPointZero, modelView);

  if (document.getElementById('camera').checked) {
    const projection = m4.orthographic(0, 1, 0, 1, -1, 1);
    const noRot = m4.multiply(rotateToPointZero, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    gl.uniformMatrix4fv(shProgram.iModelViewMat, false, noRot);
    gl.uniformMatrix4fv(shProgram.iProjectionMat, false, projection);

    gl.bindTexture(gl.TEXTURE_2D, cameraText);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    BG?.Draw();
  }

  gl.bindTexture(gl.TEXTURE_2D, texture0);

  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(shProgram.iModelViewMat, false, m4.multiply(leftTrans, matrixMult));
  gl.uniformMatrix4fv(shProgram.iProjectionMat, false, leftP);

  gl.colorMask(true, false, false, false);

  surface.Draw();

  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(shProgram.iModelViewMat, false, m4.multiply(rightTrans, matrixMult));
  gl.uniformMatrix4fv(shProgram.iProjectionMat, false, rightP);

  gl.colorMask(false, true, true, false);

  surface.Draw();

  gl.colorMask(true, true, true, true);
}

let a = 0.5;
let b = 10;
let c = 0.5;

const mS = 1.0 / 1000.0;

const step = (max, splines = 20) => {
  return max / (splines - 1);
};

const cos = (x) => {
  return Math.cos(x);
};

const sin = (x) => {
  return Math.sin(x);
};

function CreateSurfaceData() {
  let vertexList = [];
  let textureList = [];
  let splines = 100;

  let zStep = 0.1;
  let BStep = 0.1;
  let h = 1;
  let p = 0.5;
  let b = 360

  const step = (max, splines = 30) => {
      return max / (splines - 1);
  };

  let stepI = step(b, splines);
  let stepJ = step(h, splines);

   let getb = (i) => {
      return i / b;
  };

  let geth = (j) => {
      return j / h;
  };

  for  (let B = 0; B <= b; B += BStep) {
      for (let z = -h; z <= h; z += zStep) {
      vertexList.push(
          (((Math.pow(Math.abs(z) - h, 2))/(2*p))*Math.cos(deg2rad(B))),
          (((Math.pow(Math.abs(z) - h, 2))/(2*p))*Math.sin(deg2rad(B))), 
          z
      );
      textureList.push(getb(B), geth(z));

      vertexList.push(
          (((Math.pow(Math.abs(z + stepJ) - h, 2))/(2*p))*Math.cos(deg2rad(B + stepI))),
          (((Math.pow(Math.abs(z + stepJ) - h, 2))/(2*p))*Math.sin(deg2rad(B + stepI))),
          z
      );
      textureList.push(getb(B + stepI), geth(z + stepJ))
  }
  }
  return {vertexList,textureList};
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex             = gl.getAttribLocation(prog, 'vertex');
    shProgram.iModelViewMat             = gl.getUniformLocation(prog, 'ModelViewMatrix');
    shProgram.iProjectionMat            = gl.getUniformLocation(prog, 'ProjectionMatrix');
  
    shProgram.itextureCoords               = gl.getAttribLocation(prog, 'textureCoords');
    shProgram.iTextUnit                 = gl.getUniformLocation(prog, 'textureU');

    surface = new Model('Surface');
    BG = new Model('Background');
    const { vertexList, textureList } = CreateSurfaceData();
    surface.BufferData(vertexList, textureList);
    BG.BufferData(
      [ 0.0, 0.0, 0.0, 1.0,  0.0, 0.0, 1.0, 1.0,  0.0, 1.0, 1.0, 0.0,  0.0, 1.0, 0.0, 0.0, 0.0, 0.0],
      [ 1, 1, 0, 1,  0, 0, 0, 0,  1, 0, 1, 1],
    );

    LoadTexture();
    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

const rerender = () => {
  draw();
  window.requestAnimationFrame(rerender);
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");

        video = document.createElement('video');
        video.setAttribute('autoplay', 'true');
        cameraText = getCameraText(gl);

        document.getElementById('camera').addEventListener('change', async (e) => {
          if (document.getElementById('camera').checked) {
            getCamera().then((stream)=> video.srcObject = stream)
          } else {
            video.srcObject = null;
          }
        });

        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
  
    document.getElementById('eyeSeparation').addEventListener('input', draw);
    document.getElementById('convergence').addEventListener('input', draw);
    document.getElementById('fieldOfViev').addEventListener('input', draw);
    document.getElementById('near').addEventListener('input', draw);

  document.getElementById('orientation').addEventListener('change', async () => {
    if (document.getElementById('orientation').checked) {
      startGyroscope();
    }
  });

  rerender();
}

const LoadTexture = () => {
  const image = new Image();
  image.src =
    'https://www.the3rdsequence.com/texturedb/download/235/texture/jpg/1024/dark+rough+tree+bark-1024x1024.jpg';
  image.crossOrigin = 'anonymous';


  image.addEventListener('load', () => {
    texture0 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
}

const getCamera = () =>
  new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        resolve(stream);
      })
      .catch((error) => {
        reject(error);
      });
  });

function handleOrientation(event) {
  const alpha = event.alpha; 
  const beta = event.beta; 
  const gamma = event.gamma; 

  const alphaRad = alpha * (Math.PI / 180);
  const betaRad = beta * (Math.PI / 180);
  const gammaRad = gamma * (Math.PI / 180);

  mat4.identity(rotationMatrix);
  mat4.rotateZ(rotationMatrix, rotationMatrix, alphaRad);
  mat4.rotateX(rotationMatrix, rotationMatrix, betaRad);
  mat4.rotateY(rotationMatrix, rotationMatrix, gammaRad);

  let deltaRotationVector = new Array();
  deltaRotationVector.push(alphaRad, betaRad, gammaRad);

  rotationMatrix = getRotationMatrixFromVector(deltaRotationVector);

  rerender();
}

function getRotationMatrixFromVector(rotationVector) {
  const x = rotationVector[0];
  const y = rotationVector[1];
  const z = rotationVector[2];
  let w;

  if (rotationVector.length >= 4) {
    w = rotationVector[3];
  } else {
    w = 1 - x * x - y * y - z * z;
    if(w > 0){
       w = Math.sqrt(w);
    }else{
      w = 0;
    }
  }
  const sq_x = 2 * x * x;
  const sq_y = 2 * y * y;
  const sq_z = 2 * z * z;
  const xy = 2 * x * y;
  const zw = 2 * z * w;
  const xz = 2 * x * z;
  const yw = 2 * y * w;
  const yz = 2 * y * z;
  const xw = 2 * x * w;
  let R = [];
  R.push(1 - sq_y - sq_z);
  R.push(xy - zw);
  R.push(xz + yw);
  R.push(0.0);
  R.push(xy + zw);
  R.push(1 - sq_x - sq_z);
  R.push(yz - xw);
  R.push(0.0);
  R.push(xz - yw);
  R.push(yz + xw);
  R.push(1 - sq_x - sq_y);
  R.push(0.0);
  R.push(0.0);
  R.push(0.0);
  R.push(0.0);
  R.push(1.0);
  return R;
}

const createCameraTexture = (gl) => {
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
};


function startGyroscope(){
  if (window.DeviceOrientationEvent) {
    let gyr = new Gyroscope({
      freq: 30
    })
    gyr.addEventListener('deviceorientation', handleOrientation, true);
  } else {
    console.log("Device orientation events not supported");
  }
}
