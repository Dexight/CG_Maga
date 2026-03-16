console.log(mat4);// Проверяем, загрузилась ли библиотека gl-matrix

const canvas = document.getElementById("canvas");
canvas.width = 600;
canvas.height = 400;
const gl = canvas.getContext("webgl2");

if (!gl) {
    alert("WebGL2 not supported");
}

const vertexShaderSourceCube = `
    attribute vec3 aPosition;
    attribute vec3 aColor;
    attribute vec2 aTexCoord;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying vec3 vColor;
    varying vec2 vTexCoord;
    
    void main(){
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
        vColor = aColor;
        vTexCoord = aTexCoord;
    }
`;

const fragmentShaderSourceCube = `
    precision mediump float;
    varying vec3 vColor;
    varying vec2 vTexCoord;
    uniform sampler2D uTextureNumb;         // текстура цифры
    uniform sampler2D uTextureCube;       // общая cubeTexture
    uniform float uMixFactorNumb;          // коэффициент смешивания (1)
    uniform float uMixFactorCube;           // коэффициент смешивания (2)
    
    void main() {
        vec4 texColorNumb = texture2D(uTextureNumb, vTexCoord);
        vec4 texColorCube = texture2D(uTextureCube, vTexCoord);

        // Если основная текстура прозрачная
        if (texColorNumb.a == 0.0) 
        {
            // Только общая текстура и цвет
            vec3 mixedColor = mix(vColor, texColorCube.rgb, uMixFactorCube);
            gl_FragColor = vec4(mixedColor, 1.0);
        } 
        else 
        {
            // Смешиваем всё
            vec3 colorWithNumb = mix(vColor, vColor * texColorNumb.rgb, uMixFactorNumb);
            vec3 mixedColor = mix(colorWithNumb, texColorCube.rgb, uMixFactorCube);
            
            gl_FragColor = vec4(mixedColor, 1.0);
        }
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

const vertexShaderCube = compileShader(gl.VERTEX_SHADER, vertexShaderSourceCube);
const fragmentShaderCube = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSourceCube);

// Программа шейдеров
const cubeProgram = gl.createProgram();
gl.attachShader(cubeProgram, vertexShaderCube);
gl.attachShader(cubeProgram, fragmentShaderCube);
gl.linkProgram(cubeProgram);
if (!gl.getProgramParameter(cubeProgram, gl.LINK_STATUS)) {
    console.error('Ошибка линковки программы:', gl.getProgramInfoLog(cubeProgram));
    gl.deleteProgram(cubeProgram);
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

const textureCoordinates = [
    // Front
    0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 
    // Back
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // Top
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, // не суть важно ибо не видно
    // Bottom
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, // тоже
    // Left
    1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
    // Right
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,
];

const positionBufferCube = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferCube);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

// Буфер текстурных координат
const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

// Получение ссылок на атрибуты из программы
const aPositionCube = gl.getAttribLocation(cubeProgram, "aPosition");
const aColorCube = gl.getAttribLocation(cubeProgram, "aColor");
const aTexCoordCube = gl.getAttribLocation(cubeProgram, "aTexCoord");
const uTextureNumbCube = gl.getUniformLocation(cubeProgram, "uTextureNumb");
const uTextureCubeCube = gl.getUniformLocation(cubeProgram, "uTextureCube");
const uMixFactorNumbCube = gl.getUniformLocation(cubeProgram, "uMixFactorNumb");
const uMixFactorCubeCube = gl.getUniformLocation(cubeProgram, "uMixFactorCube");

// Включение атрибутов
gl.enableVertexAttribArray(aPositionCube);
gl.enableVertexAttribArray(aColorCube);
gl.enableVertexAttribArray(aTexCoordCube);

// Шаг между вершинами¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯⬇
gl.vertexAttribPointer(aPositionCube, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);

const uModelViewMatrixCube = gl.getUniformLocation(cubeProgram, "uModelViewMatrix");
const uProjectionMatrixCube = gl.getUniformLocation(cubeProgram, "uProjectionMatrix");

// Матрица проекции
const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);

let globalAngle = 0; // Вся сцена по Y
let pedestalAngle = 0; // Пьедестал
let cubeAngles = [0, 0, 0, 0, 0, 0]; // Кубики

function cubeRenderer(modelViewMatrix, position = [0, 0, -10], cubeAngle, program, 
                      positionBuffer, colorBuffer, indexBuffer, texCoordBuffer,
                      aPosition, aColor, aTexCoord,
                      projectionMatrix, uProjectionMatrix, uModelViewMatrix, 
                      textureNumb, textureCube,
                      uTextureNumb, uTextureCube, uMixFactorNumb, uMixFactorCube, mixValueNumb, mixValueCube)
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

    // Цвет
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);

    // Индексы
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    
    // Текстурки
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

    // Текстура номера (юнит 0)
    if (textureNumb) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureNumb);
        gl.uniform1i(uTextureNumb, 0);
    }

    // Cube текстура (юнит 1)
    if (textureCube) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textureCube);
        gl.uniform1i(uTextureCube, 1);
    }

    // Кэффы смешивания
    gl.uniform1f(uMixFactorNumb, mixValueNumb);
    gl.uniform1f(uMixFactorCube, mixValueCube);

    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}

const z = -20;

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

        // Выбираем текстуру в зависимости от куба
        let texture;
        if (i === 0) texture = bronzeTex;
        else if (i >= 1 && i <= 3) texture = goldTex;
        else texture = silverTex;

        cubeRenderer(
            modelViewMatrix,
            position,
            cubeAngles[i],
            cubeProgram,

            positionBufferCube,
            colorBuffers[i],
            indexBuffer,
            texCoordBuffer,

            aPositionCube,
            aColorCube,
            aTexCoordCube,

            projectionMatrix,
            uProjectionMatrixCube,
            uModelViewMatrixCube,

            texture,
            cubeTex,

            uTextureNumbCube,
            uTextureCubeCube,
            uMixFactorNumbCube,
            uMixFactorCubeCube,
            coefNumb,
            coefCubeTexture
        );
    }
}

// Подгрузка текстурок
let bronzeTex, goldTex, silverTex, cubeTex;
let loadedTextureCounter = 0;

function loadTexture(url, callback) {
    const texture = gl.createTexture();
    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_2D, null);
        callback(texture);
    };
    image.src = url;
}

let coefNumb = 0.7
let coefCubeTexture = 0.3

loadTexture('1.png', tex => { 
    goldTex = tex; 
    loadedTextureCounter++;
    if (loadedTextureCounter == 4) { renderObjects(); }
});
loadTexture('2.png', tex => { 
    silverTex = tex; 
    loadedTextureCounter++;
    if (loadedTextureCounter == 4) { renderObjects(); } 
});
loadTexture('3.png', tex => { 
    bronzeTex = tex;     
    loadedTextureCounter++;
    if (loadedTextureCounter == 4) { renderObjects(); } 
});
loadTexture('cubeTexture.png', tex => { 
    cubeTex = tex;     
    loadedTextureCounter++;
    if (loadedTextureCounter == 4) { renderObjects(); } 
});

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

document.getElementById('numbCoef').addEventListener('input', (event) => {
    coefNumb = parseFloat(event.target.value);
    renderObjects();
});

document.getElementById('cubeTextureCoef').addEventListener('input', (event) => {
    coefCubeTexture = parseFloat(event.target.value);
    renderObjects();
});