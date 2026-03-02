console.log(mat4);// Проверяем, загрузилась ли библиотека gl-matrix

const canvas = document.getElementById("canvas");
canvas.width = 600;
canvas.height = 400;
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl2");

if (!gl) {
    alert("WebGL2 not supported");
}

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

const positionBufferRGB = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRGB);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// Получение ссылок на атрибуты из программы
const aPositionRGB = gl.getAttribLocation(programRGB, "aPosition");
const aColorRGB = gl.getAttribLocation(programRGB, "aColor");

// Включение атрибутов
gl.enableVertexAttribArray(aPositionRGB);
gl.enableVertexAttribArray(aColorRGB);

// Шаг между вершинами¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯⬇
gl.vertexAttribPointer(aPositionRGB, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);

const uModelViewMatrixRGB = gl.getUniformLocation(programRGB, "uModelViewMatrix");
const uProjectionMatrixRGB = gl.getUniformLocation(programRGB, "uProjectionMatrix");

// Матрица проекции
const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);

let globalAngle = 0; // Вся сцена по Y
let pedestalAngle = 0; // Пьедестал
let cubeAngles = [0, 0, 0, 0, 0, 0]; // Кубики

function cubeRenderer(modelViewMatrix, position = [0, 0, -10], cubeAngle, program, positionBuffer, colorBuffer, aPosition, aColor, indexBuffer, projectionMatrix, uProjectionMatrix, uModelViewMatrix)
{
    mat4.identity(modelViewMatrix);
    
    mat4.rotateY(modelViewMatrix, modelViewMatrix, globalAngle);

    const pedestalCenter = cubePositions[2];
    mat4.translate(modelViewMatrix, modelViewMatrix, pedestalCenter);// смещаемся к центру пьедестала
    mat4.rotateY(modelViewMatrix, modelViewMatrix, pedestalAngle);
    mat4.translate(modelViewMatrix, modelViewMatrix, [-pedestalCenter[0], -pedestalCenter[1], -pedestalCenter[2]]);// возвращаемся
    
    
    mat4.translate(modelViewMatrix, modelViewMatrix, position);// смещаемся к позиции нужного куба
    mat4.rotateY(modelViewMatrix, modelViewMatrix, cubeAngle);
    
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
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}

const z = -30;

const cubePositions = [
    [4, -2, z],

    [2,  2, z],
    [2,  0, z],
    [2, -2, z],

    [0, -2, z],
    [0,  0, z]
];

const cubeColors = [
    [0.44, 0.28, 0.09], // Бронза

    [0.6, 0.7, 0.0], // Золото
    [0.6, 0.7, 0.0],
    [0.6, 0.7, 0.0],

    [0.75, 0.75, 0.75], // Серебро
    [0.75, 0.75, 0.75]
];

// Буфер по цвету
function createColorBuffer(color) {
    const colors = new Array(24 * 3); // вершины * каналы
    for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color[0];     // R
        colors[i + 1] = color[1]; // G
        colors[i + 2] = color[2]; // B
    }
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    return buffer;
}

const colorBuffers = cubeColors.map(color => createColorBuffer(color));

function renderObjects()
{
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);      
    gl.enable(gl.DEPTH_TEST);
    
    for (let i = 0; i < cubePositions.length; i++) 
    {
        const modelViewMatrix = mat4.create();
        const position = cubePositions[i];
        
        cubeRenderer(
            modelViewMatrix,
            position,
            cubeAngles[i],
            programRGB,
            positionBufferRGB,
            colorBuffers[i],
            aPositionRGB,
            aColorRGB,
            indexBuffer,
            projectionMatrix,
            uProjectionMatrixRGB,
            uModelViewMatrixRGB
        );
    }
}

renderObjects();

// клава
document.addEventListener('keydown', (event) => {
    const step = 0.1;
    
    switch(event.key) {
        case 'c': // Бронзовый
            cubeAngles[0] += step;
            break;
        case 'w': // золотой верхний
            cubeAngles[1] += step;
            break;
        case 's': // золотой средний
            cubeAngles[2] += step;
            break
        case 'x': //золотой нижний
            cubeAngles[3] += step;
            break;
        case 'a': // серебряный верхний
            cubeAngles[5] += step;
            break;
        case 'z': // серебряный нижний
            cubeAngles[4] += step;
            break;
        case 'r': // весь пьедестал
            pedestalAngle += step;
            break;
        case 't': // сцена по центру
            globalAngle += step;
            break;
        case '\`': // Сброс
            globalAngle = 0;
            pedestalAngle = 0;
            cubeAngles = [0, 0, 0, 0, 0, 0];
            break;
    }

    renderObjects();
});