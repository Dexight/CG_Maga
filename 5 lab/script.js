const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

// Класс для работы с объектами
class GLObject 
{
    constructor(gl, program, objUrl, textureUrl, lighting, scale = [1.0, 1.0, 1.0]) 
    {
        this.gl = gl;
        this.program = program;
        this.objUrl = objUrl;
        this.textureUrl = textureUrl;
        this.lighting = lighting;
        this.scale = scale;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.normalBuffer = null; // Добавляем буфер для нормалей
        this.texture = null;
        this.offsets = new Float32Array([0.0, 0.0, 0.0]);
        this.objData = null;
        this.programPhong = program;
    }

    async changeLightingModel() 
    {
        if (this.lighting === "phong") 
        {
            this.program = this.programPhong;
        } 
        else if (this.lighting === "toonshading") 
        {
            this.program = this.programToon;
        }
        else if (this.lighting === "other")
        {
            this.program = this.programOther;
        }
    }

    async init() 
    {
        // Загрузка OBJ-файла
        this.objData = await this.loadOBJ(this.objUrl);

        // Создание и привязка буферов
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.objData.positions), this.gl.STATIC_DRAW);

        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.objData.texCoords), this.gl.STATIC_DRAW);

        this.normalBuffer = this.gl.createBuffer(); // Создаем буфер для нормалей
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.objData.normals), this.gl.STATIC_DRAW);

        // Создание текстуры
        this.texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        const image = new Image();
        image.src = this.textureUrl;
        await new Promise((resolve) => {
            image.onload = () => {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                this.gl.generateMipmap(this.gl.TEXTURE_2D);
                resolve();
            };
        });
    }

    async loadOBJ(url) 
    {
        const response = await fetch(url);
        const text = await response.text();

        const positions = []; // Вершины (v)
        const texCoords = []; // Текстурные координаты (vt)
        const normals = [];   // Нормали (vn)
        const finalPositions = []; // Итоговые вершины
        const finalTexCoords = []; // Итоговые текстурные координаты
        const finalNormals = [];   // Итоговые нормали

        text.split("\n").forEach((line) => {
            const parts = line.trim().split(/\s+/);
            if (parts[0] === "v") {
                // Загрузка вершин
                positions.push(parts.slice(1).map(Number));
            } else if (parts[0] === "vt") {
                // Загрузка текстурных координат
                texCoords.push(parts.slice(1).map(Number));
            } else if (parts[0] === "vn") {
                // Загрузка нормалей
                normals.push(parts.slice(1).map(Number));
            } else if (parts[0] === "f") {
                // Загрузка граней
                const faceIndices = parts.slice(1).map((part) => {
                    const [posIdx, texIdx, normIdx] = part.split("/").map((n) => parseInt(n) - 1);
                    return { posIdx, texIdx, normIdx };
                });

                // Преобразование граней в треугольники
                for (let i = 1; i < faceIndices.length - 1; i++) {
                    const tri = [faceIndices[0], faceIndices[i], faceIndices[i + 1]];
                    tri.forEach(({ posIdx, texIdx, normIdx }) => {
                        // Добавление вершин
                        finalPositions.push(...positions[posIdx]);

                        // Добавление текстурных координат (если они есть)
                        if (texIdx !== undefined && texIdx >= 0) {
                            finalTexCoords.push(...texCoords[texIdx]);
                        }

                        // Добавление нормалей (если они есть)
                        if (normIdx !== undefined && normIdx >= 0) {
                            finalNormals.push(...normals[normIdx]);
                        }
                    });
                }
            }
        });

        return {
            positions: finalPositions,
            texCoords: finalTexCoords,
            normals: finalNormals,
        };
    }

    setOffsets(offsets) { this.offsets = new Float32Array(offsets); }

    render(modelMatrix, mvpMatrix, aPosition, aTexCoord, aOffsetLocation, uTextureLocation, uModelMatrix, uMVPMatrix, cameraPosition, cameraTarget, cameraUp) 
    {
        updateModelViewMatrix(modelMatrix, cameraPosition, cameraTarget, cameraUp);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.vertexAttribPointer(aPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aPosition);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.vertexAttribPointer(aTexCoord, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aTexCoord);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer); // Привязываем буфер нормалей
        const aNormal = this.gl.getAttribLocation(this.program, "aNormal");
        this.gl.vertexAttribPointer(aNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aNormal);

        const offsetBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, offsetBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.offsets, this.gl.STATIC_DRAW);

        this.gl.enableVertexAttribArray(aOffsetLocation);
        this.gl.vertexAttribPointer(aOffsetLocation, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(aOffsetLocation, 1);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(uTextureLocation, 0);

        mat4.scale(modelMatrix, modelMatrix, this.scale);
        this.gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
        this.gl.uniformMatrix4fv(uMVPMatrix, false, mvpMatrix);

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, this.objData.positions.length / 3, this.offsets.length / 3);
    }
}

// GLSL шейдеры
const vertexShaderSource = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec2 aTexCoord;
in vec3 aOffset;
in vec3 aNormal;

uniform mat4 uMVPMatrix;
uniform mat4 uModelMatrix;

out vec2 vTexCoord;
out vec3 vPosition;
out vec3 vNormal;

void main() {
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0) + vec4(aOffset, 0.0);
    gl_Position = uMVPMatrix * worldPosition;
    vTexCoord = vec2(aTexCoord.x, 1.0 - aTexCoord.y); // Invert Y coordinate
    vPosition = worldPosition.xyz;
    vNormal = mat3(uModelMatrix) * aNormal; // Transform normal to world space
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec3 vPosition;
in vec3 vNormal;

uniform sampler2D uTexture;

uniform vec3 uViewPosition;

uniform vec3 uPointLightPosition;
uniform vec3 uPointLightColor;

out vec4 fragColor;

void main() {
    vec4 texColor = texture(uTexture, vTexCoord);

    // Нормализация нормали
    vec3 normal = normalize(vNormal);

    // Ambient light
    vec3 ambient = 0.1 * texColor.rgb;

    // Point light
    vec3 pointLightDir = normalize(uPointLightPosition - vPosition);
    vec3 viewDir = normalize(uViewPosition - vPosition);
    vec3 reflectDirPoint = reflect(-pointLightDir, normal);

    float pointSpecularStrength = 0.5; // Интенсивность зеркального отражения
    float specPoint = pow(max(dot(viewDir, reflectDirPoint), 0.0), 16.0); // Зеркальный бликовый эффект
    vec3 pointLightSpecular = pointSpecularStrength * specPoint * uPointLightColor;

    float pointLightDistance = length(uPointLightPosition - vPosition);
    vec3 pointLight = uPointLightColor * max(dot(pointLightDir, normal), 0.0) + pointLightSpecular;

    vec3 lighting = ambient + pointLight;
    fragColor = vec4(lighting * texColor.rgb, texColor.a);
}
`;

// Компиляция шейдеров
function compileShader(gl, source, type) 
{
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) 
    {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw new Error("Ошибка компиляции шейдера");
    }

    return shader;
}

// Создание программы
function createProgram(gl, vertexSource, fragmentSource) 
{
    const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) 
    {
        console.error(gl.getProgramInfoLog(program));
        throw new Error("Ошибка линковки программы");
    }

    return program;
}

let aPosition
let aTexCoord
let aOffsetLocation
let uTextureLocation
let uMVPMatrix
let uModelMatrix
let uPointLightPosition
let uPointLightColor
let uViewPosition

function changeLocations(gl, program)
{
    gl.useProgram(program);

    // Получение местоположений атрибутов и uniform-переменных
    aPosition = gl.getAttribLocation(program, "aPosition");
    aTexCoord = gl.getAttribLocation(program, "aTexCoord");
    aOffsetLocation = gl.getAttribLocation(program, "aOffset");
    uTextureLocation = gl.getUniformLocation(program, "uTexture");
    uMVPMatrix = gl.getUniformLocation(program, "uMVPMatrix");
    uModelMatrix = gl.getUniformLocation(program, "uModelMatrix");

    // Источник света
    uPointLightPosition = gl.getUniformLocation(program, "uPointLightPosition");
    uPointLightColor = gl.getUniformLocation(program, "uPointLightColor");

    // Камера
    uViewPosition = gl.getUniformLocation(program, "uViewPosition");
}

function updateModelViewMatrix(modelMatrix, cameraPosition, cameraTarget, cameraUp) 
{
    mat4.identity(modelMatrix);
    mat4.lookAt(modelMatrix, cameraPosition, cameraTarget, cameraUp);
}

// Основной код
(async function main() 
{
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    // Создание объектов
    const sphere = new GLObject(gl, program, "sphere.obj","color.jpg", "phong", [20.0, 20.0, 20.0] )
    // Инициализация объектов
    await sphere.init();
    //Установка смещений для sphere
    sphere.setOffsets([0.0, -10.0, -40.0]);

    // Матрица проекций
    let mvpMatrix = mat4.create();
    let modelMatrix = mat4.create();
    mat4.perspective(mvpMatrix, Math.PI / 2, canvas.width / canvas.height, 0.1, Infinity);

    let cameraPosition = vec3.fromValues(0, 0, -5);
    let cameraTarget = vec3.fromValues(0, 0, 0);
    let cameraUp = vec3.fromValues(0, 1, 0);

    // Параметры источников света + обработчики ползунков позиции
    let pointLightPosition = [10.0, 10.0, 10.0];
    document.getElementById('pointLightX').addEventListener('input', (event) => {
        pointLightPosition[0] = parseFloat(event.target.value);
    });
    document.getElementById('pointLightY').addEventListener('input', (event) => {
        pointLightPosition[1] = parseFloat(event.target.value);
    });
    document.getElementById('pointLightZ').addEventListener('input', (event) => {
        pointLightPosition[2] = parseFloat(event.target.value);
    });

    // Рендеринг
    function render() 
    {
        gl.uniform3fv(uViewPosition, cameraPosition);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        function setParameters(gl)
        {    
            // Установка параметров источников света
            gl.uniform3fv(uPointLightPosition, pointLightPosition);
            gl.uniform3fv(uPointLightColor, [1.0, 1.0, 1.0]);
        }

        //отрисовка sphere
        changeLocations(sphere.gl, sphere.program);
        setParameters(sphere.gl);
        sphere.render(modelMatrix, mvpMatrix, aPosition, aTexCoord, aOffsetLocation, uTextureLocation, uModelMatrix, uMVPMatrix, cameraPosition, cameraTarget, cameraUp)
        
        requestAnimationFrame(render);
    }

    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);
    render();
})();