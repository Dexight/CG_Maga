console.log(mat4);// Проверяем, загрузилась ли библиотека gl-matrix

const canvas = document.getElementById("glCanvas");
canvas.width = 800;
canvas.height = 400;
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl2");

if (!gl) { alert("WebGL2 not supported"); }

let angle = 0; //0.5

// RGB куб
const vertexShaderCube = `
    attribute vec3 aPosition;
    attribute vec4 aColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying vec4 vColor;
    varying vec3 vPosition;

    void main(){
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
        vColor = aColor;
        vPosition = aPosition.xyz; // Передаем во фрагментный шейдер
    }
`;

const fragmentShaderCubeDiagonal = `precision mediump float; //точность для float чисел
                                    varying vec3 vPosition;
                                    uniform vec4 uColor; // передаём цвет

                                    void main() {
                                            float K = 2.0;
                                            
                                            float diag_interpolated_xy = floor((vPosition.x + vPosition.y) * K); 
                                            float diag_interpolated_xz = floor((vPosition.x + vPosition.z) * K); 
                                            float diag_interpolated_yz = floor((vPosition.y + vPosition.z) * K); 

                                            if (vPosition.z == -1.0 || vPosition.z == 1.0)
                                            {
                                                if (mod(float(diag_interpolated_xy), 2.0) == 0.0) {  
                                                    gl_FragColor = vec4(1, 1, 1, 1);
                                                } else {  
                                                    gl_FragColor = uColor;
                                                }
                                            }
                                            else
                                            {
                                                if (vPosition.y == -1.0 || vPosition.y == 1.0)
                                                {
                                                    if (mod(float(diag_interpolated_xz), 2.0) == 0.0) {  
                                                        gl_FragColor = vec4(1, 1, 1, 1);
                                                    } else {  
                                                        gl_FragColor = uColor;
                                                    }
                                                }
                                                else
                                                {
                                                    if (mod(float(diag_interpolated_yz), 2.0) == 0.0) {  
                                                        gl_FragColor = vec4(1, 1, 1, 1);
                                                    } else {  
                                                        gl_FragColor = uColor;
                                                    }
                                                }
                                            }
                                    }`;

const fragmentShaderCubeKletka = `precision mediump float; //точность для float чисел
                                varying vec3 vPosition;
                                uniform vec4 uColor; // передаём цвет

                                void main() {
                                        float k = 2.5;
                                        int sum = int(vPosition.x * k) + int(vPosition.y * k) + int(vPosition.z * k);
                                        if (mod(float(sum), 2.0) == 0.0) {
                                            gl_FragColor = vec4(1, 1, 1, 1);
                                        }
                                        else {
                                            gl_FragColor = uColor;
                                        }
                               }`

const fragmentShaderCubeLines = `precision mediump float; //точность для float чисел
                               varying vec3 vPosition;
                               uniform vec4 uColor; // передаём цвет

                               void main() {
                                    float K = 5.0;
                                    
                                    float x_interpolated = floor(vPosition.x * K); 
                                    float y_interpolated = floor(vPosition.y * K); 
                                    float z_interpolated = floor(vPosition.z * K);

                                    if ( vPosition.y == -1.0 || vPosition.y == 1.0)
                                    { 
                                       if (mod(float(z_interpolated), 2.0) == 0.0) {  
                                            gl_FragColor = vec4(1, 1, 1, 1);
                                        } else {  
                                            gl_FragColor = uColor;
                                        }
                                    }
                                    else 
                                    {
                                        if (mod(float(y_interpolated), 2.0) == 0.0) {  
                                            gl_FragColor = vec4(1, 1, 1, 1);
                                        } else {  
                                            gl_FragColor = uColor;
                                        }
                                    }
                               }`

// основной класс фигуры
class Figure{
    constructor(vertexShader, fragmentShader, positions, indices)
    {
        this.vertexShaderSource = vertexShader;
        this.fragmentShaderSource = fragmentShader;
        this.positions = positions;
        this.indices = indices; // для куба

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
        
        this.uColorLocation = gl.getUniformLocation(this.shaderProgram, "uColor");

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);

        // если куб
        if (this.indices) {
            // Буфер для цветов
            this.colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

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
        gl.uniform4fv(this.uColorLocation, color);

        // Привязка буфера позиций
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionAttributeLocation);
        
        if (this.indices) { gl.vertexAttribPointer(this.positionAttributeLocation, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0); } 
        else              { gl.vertexAttribPointer(this.positionAttributeLocation, 2, gl.FLOAT, false, 0, 0); }

        if (this.indices) 
        {
            // Матрица проекции
            const projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, Math.PI / 4, (canvas.width/3) / canvas.height, 0.1, 100.0);
            
            // Матрица вида
            const modelViewMatrix = mat4.create();
            
            mat4.identity(modelViewMatrix);
            mat4.translate(modelViewMatrix, modelViewMatrix, position);
            mat4.rotateX(modelViewMatrix, modelViewMatrix, angle);
            mat4.rotateZ(modelViewMatrix, modelViewMatrix, angle);
    
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

const colors = new Array(24 * 4); // вершины * каналы
for (let i = 0; i < colors.length; i += 4) {
    colors[i] = 0.5;     // R
    colors[i + 1] = 0.5; // G
    colors[i + 2] = 0.0; // B
    colors[i + 3] = 1.0; // A
}

let cube1 = new Figure(vertexShaderCube,
                    fragmentShaderCubeDiagonal,
                    vertices,
                    indices 
                    )

let cube2 = new Figure(vertexShaderCube,
                    fragmentShaderCubeKletka,
                    vertices,
                    indices 
                    )

let cube3 = new Figure(vertexShaderCube,
                    fragmentShaderCubeLines,
                    vertices,
                    indices 
                    )

// gl.clearColor(0.0, 0.0, 0.0, 1.0);
// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
// gl.enable(gl.DEPTH_TEST);

// gl.viewport(0, 0, canvas.width/3, canvas.height);
// color = [1, 0, 0, 1]
// cube1.draw([0, 0, -7]);

// gl.viewport(canvas.width/3, 0, canvas.width/3, canvas.height);
// color = [0, 1, 0, 1]
// cube2.draw([0, 0, -7]);

// gl.viewport(canvas.width/3 * 2, 0, canvas.width/3, canvas.height);
// color = [0, 0, 1, 1]
// cube3.draw([0, 0, -7]);

function animate() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    angle += 0.01;
    
    gl.viewport(0, 0, canvas.width/3, canvas.height);
    color = [1, 0, 0, 1]
    cube1.draw([0, 0, -7]);
    
    gl.viewport(canvas.width/3, 0, canvas.width/3, canvas.height);
    color = [0, 1, 0, 1]
    cube2.draw([0, 0, -7]);
    
    gl.viewport(canvas.width/3 * 2, 0, canvas.width/3, canvas.height);
    color = [0, 0, 1, 1]
    cube3.draw([0, 0, -7]);
    
    requestAnimationFrame(animate);
}

// Запускаем анимацию
animate();