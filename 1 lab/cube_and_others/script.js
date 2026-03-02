console.log(mat4);// Проверяем, загрузилась ли библиотека gl-matrix

const canvas = document.getElementById("canvas");
canvas.width = 600;
canvas.height = 400;
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl2");

if (!gl) {
    alert("WebGL2 not supported");
}

const selectType = document.getElementById('typeSelector');
let type = gl.TRIANGLES;
// RGB куб
const vertexShaderSourceRGB = `
    attribute vec3 aPosition;
    attribute vec3 aColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying vec3 vColor;
    
    void main(){
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
        gl_PointSize = 20.0; 
        vColor = aColor;
    }
`;

const fragmentShaderSourceRGB = `
    precision mediump float;
    varying vec3 vColor;
    
    void main() {
        gl_FragColor = vec4(vColor, 1.0);
    }
`;

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Ошибка компиляции шейдера:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShaderRGB = compileShader(gl.VERTEX_SHADER, vertexShaderSourceRGB);
const fragmentShaderRGB = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSourceRGB);

// Программа шейдеров RGB куба
const programRGB = gl.createProgram();
gl.attachShader(programRGB, vertexShaderRGB);
gl.attachShader(programRGB, fragmentShaderRGB);
gl.linkProgram(programRGB);
if (!gl.getProgramParameter(programRGB, gl.LINK_STATUS)) {
    console.error('Ошибка линковки программы:', gl.getProgramInfoLog(programRGB));
    gl.deleteProgram(programRGB);
}

// [x, y, z]
const vertices = [
    -1, -1, 1,
    1, -1, 1,
    1, 1, 1,
    -1, 1, 1,

    -1, -1, -1,
    1, -1, -1,
    1, 1, -1,
    -1, 1, -1,

    -1, 1, 1,
    1, 1, 1,
    1, 1, -1,
    -1, 1, -1,

    -1, -1, 1,
    1, -1, 1,
    1, -1, -1,
    -1, -1, -1,

    -1, -1, 1,
    -1, 1, 1,
    -1, 1, -1,
    -1, -1, -1,

    1, -1, 1,
    1, 1, 1,
    1, 1, -1,
    1, -1, -1,
];

const indices = [
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23
];

const colors = new Array(24 * 3); // вершины * каналы
for (let i = 0; i < colors.length; i += 3) {
    colors[i] = 0.5;     // R
    colors[i + 1] = 0.5; // G
    colors[i + 2] = 0.0; // B
}

// Буфер для позиций
const positionBufferRGB = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRGB);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

// Буфер для индексов
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// Буфер для цветов RGB куба
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

// Получаем ссылки на атрибуты из программы
const aPositionRGB = gl.getAttribLocation(programRGB, "aPosition");
const aColorRGB = gl.getAttribLocation(programRGB, "aColor");

// Включаем использование атрибутов
gl.enableVertexAttribArray(aPositionRGB);
gl.enableVertexAttribArray(aColorRGB);

// Общий шаг между вершинами: 3 * Float32Array.BYTES_PER_ELEMENT
gl.vertexAttribPointer(aPositionRGB, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);

const uModelViewMatrixRGB = gl.getUniformLocation(programRGB, "uModelViewMatrix");
const uProjectionMatrixRGB = gl.getUniformLocation(programRGB, "uProjectionMatrix");

// Матрица проекции
const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);

// Параметры анимации
let angle = 90; // Угол поворота

function cubeRenderer(modelViewMatrix, position = [0, 0, -10], program, positionBuffer, colorBuffer, aPosition, aColor, indexBuffer, projectionMatrix, uProjectionMatrix, uModelViewMatrix)
{
    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, position);
    mat4.rotateX(modelViewMatrix, modelViewMatrix, angle);
    mat4.rotateY(modelViewMatrix, modelViewMatrix, angle);
    
    gl.useProgram(program);
    
    // Настройка атрибутов
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);

    if (aColor && colorBuffer)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.enableVertexAttribArray(aColor);
        gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
    gl.drawElements(type, indices.length, gl.UNSIGNED_SHORT, 0);
}

function renderObject(){
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);      
    gl.enable(gl.DEPTH_TEST);
    
    // Матрицы вида
    const modelViewMatrixRGB = mat4.create();

    // RGB куб
    cubeRenderer(modelViewMatrixRGB, [0, 0, -10], programRGB, positionBufferRGB, colorBuffer,
    aPositionRGB, aColorRGB,
    indexBuffer, projectionMatrix, 
    uProjectionMatrixRGB, uModelViewMatrixRGB);
}

renderObject();

// Обработчик выпадающего списка
selectType.addEventListener('change', (e) => {
    type = gl[e.target.value.split('.')[1]];
    if (e.target.value === "gl_quad_strip" || e.target.value === "gl_quads" || e.target.value === "gl_polygon")
    {
        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
    }
    else renderObject();
});