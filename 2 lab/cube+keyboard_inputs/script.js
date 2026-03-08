console.log(mat4);// Проверяем, загрузилась ли библиотека gl-matrix

const canvas = document.getElementById("glCanvas");
canvas.width = 800;
canvas.height = 400;
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl2");

if (!gl) { alert("WebGL2 not supported"); }

let angleX = 0;
let angleY = 0;
let angleZ = 0;

let translateX = 0;
let translateY = 0;
let translateZ = -7;

let scaleX = 1.0;
let scaleY = 1.0;
let scaleZ = 1.0;

// RGB куб
const vertexShaderCube = `
    attribute vec3 aPosition;
    attribute vec4 aColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying vec4 vColor;

    void main(){
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
        vColor = aColor;
    }
`;

const fragmentShaderCube = `
    precision mediump float;
    varying vec4 vColor;
    
    void main() {
        gl_FragColor = vColor;
    }
`;

// основной класс фигуры
class Figure{
    constructor(vertexShader, fragmentShader, positions, indices, colors)
    {
        this.vertexShaderSource = vertexShader;
        this.fragmentShaderSource = fragmentShader;
        this.positions = positions;
        // для куба
        this.indices = indices;
        this.colors = colors;

        // Инициализация шейдеров и программы
        function createShader(gl, type, source) 
        {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) 
            {
                console.error("Ошибка компиляции шейдера:", gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }

        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);

        function createShaderProgram(gl, vertexShader, fragmentShader) 
        {
            const p = gl.createProgram();
            gl.attachShader(p, vertexShader);
            gl.attachShader(p, fragmentShader);
            gl.linkProgram(p);

            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) 
            {
                console.error("Ошибка линковки шейдерной программы:", gl.getProgramInfoLog(p));
                gl.deleteProgram(p);
                return null;
            }

            return p;
        }

        this.shaderProgram = createShaderProgram(gl, this.vertexShader, this.fragmentShader);

        // Получение атрибутов
        this.positionAttributeLocation = gl.getAttribLocation(this.shaderProgram, "aPosition");
        this.colorAttributeLocation = gl.getAttribLocation(this.shaderProgram, 'aColor');
        
        if (this.positionAttributeLocation === -1){
            console.error("Атрибут aPosition не найден в шейдерной программе.");
        }
        
        if(this.colorAttributeLocation === -1){
            console.error("Атрибут aColor не найден в шейдерной программе.");
        }

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);

        // если куб
        if (this.indices) {
            this.colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);

            gl.enableVertexAttribArray(this.colorAttributeLocation);
            gl.vertexAttribPointer(this.colorAttributeLocation, 4, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);

            this.uModelViewMatrix = gl.getUniformLocation(this.shaderProgram, "uModelViewMatrix");
            this.uProjectionMatrix = gl.getUniformLocation(this.shaderProgram, "uProjectionMatrix");
            this.indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        }
    }

    draw(position = null)
    {
        gl.useProgram(this.shaderProgram);

        // Привязка буфера позиций
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionAttributeLocation);
        
        if (this.indices) { 
            gl.vertexAttribPointer(this.positionAttributeLocation, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0); 
            // Привязка буфера цветов
            
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.enableVertexAttribArray(this.colorAttributeLocation);
            gl.vertexAttribPointer(this.colorAttributeLocation, 4, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
        }
        else              { gl.vertexAttribPointer(this.positionAttributeLocation, 2, gl.FLOAT, false, 0, 0); }

        if (this.indices) 
        {
            // Матрица проекции
            const projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, Math.PI / 4, (canvas.width) / canvas.height, 0.1, 100.0);
            
            // Матрица вида
            const modelViewMatrix = mat4.create();
            
            mat4.identity(modelViewMatrix);
            mat4.translate(modelViewMatrix, modelViewMatrix, position);
            mat4.rotateX(modelViewMatrix, modelViewMatrix, angleX);
            mat4.rotateY(modelViewMatrix, modelViewMatrix, angleY);
            mat4.rotateZ(modelViewMatrix, modelViewMatrix, angleZ);
            mat4.scale(modelViewMatrix, modelViewMatrix, [scaleX, scaleY, scaleZ]);

            gl.uniformMatrix4fv(this.uProjectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(this.uModelViewMatrix, false, modelViewMatrix);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        }
        else 
        { 
            gl.drawArrays(gl.TRIANGLE_FAN, 0, this.positions.length / 2);
        }
    }
}

// куб
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

const colors = new Float32Array(24 * 4);
for (let i = 0; i < colors.length; i += 4) {
    colors[i] = Math.random();     // R
    colors[i + 1] = Math.random(); // G
    colors[i + 2] = Math.random(); // B
    colors[i + 3] = 1.0; // A
}

let cube = new Figure(vertexShaderCube,
                    fragmentShaderCube,
                    vertices,
                    indices,
                    colors
                    )

gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
gl.enable(gl.DEPTH_TEST);

cube.draw([translateX, translateY, translateZ]);

function redraw()
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    cube.draw([translateX, translateY, translateZ]);
}

document.addEventListener('keydown', (e) => {
    const rotateStep = 0.1;
    const moveStep = 0.1;
    const scaleStep = 0.1;

    switch(e.key) {
        case 'ц':
        case 'w':
            angleX -= rotateStep;
            break;
        case 'ы':
        case 's':
            angleX += rotateStep;
            break;
        case 'ф':
        case 'a':
            angleY -= rotateStep;
            break;
        case 'в':
        case 'd':
            angleY += rotateStep;
            break;
        case 'й':
        case 'q':
            angleZ -= rotateStep;
            break;
        case 'у':
        case 'e':
            angleZ += rotateStep;
            break;


        case 'ArrowUp':
            translateY += moveStep;
            break;
        case 'ArrowDown':
            translateY -= moveStep;
            break;
        case 'ArrowLeft':
            translateX -= moveStep;
            break;
        case 'ArrowRight':
            translateX += moveStep;
            break;
        case ',':
            translateZ += moveStep;
            break;
        case '.':
            translateZ -= moveStep;
            break;

        case '1':
            scaleX += scaleStep;
            break;
        case '2':
            scaleY += scaleStep;
            break;
        case '3':
            scaleZ += scaleStep;
            break;
        case '4':
            scaleX = Math.max(0.1, scaleX - scaleStep);
            break;
        case '5':
            scaleY = Math.max(0.1, scaleY - scaleStep);
            break;
        case '6':
            scaleZ = Math.max(0.1, scaleZ - scaleStep);
            break;

        case 'к':
        case 'r':
            // Сброс
            angleX = 0;
            angleY = 0;
            angleZ = 0;
            
            translateX = 0;
            translateY = 0;
            translateZ = -7;

            scaleX = 1.0;
            scaleY = 1.0;
            scaleZ = 1.0;
            break;
    }
    redraw()
})