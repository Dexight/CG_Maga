const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
const selectFigure = document.getElementById('figure');
const selectShading = document.getElementById('shading');
const selectLighting = document.getElementById('lighting');

//---------[Шейдинг по Фонгу]----------

const vertexShaderSource = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aOffset;
in vec3 aNormal;

uniform mat4 uMVPMatrix;
uniform mat4 uModelMatrix;

out vec3 vPosition;
out vec3 vNormal;

void main() {
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0) + vec4(aOffset, 0.0);
    gl_Position = uMVPMatrix * worldPosition;
    vPosition = worldPosition.xyz;
    vNormal = mat3(uModelMatrix) * aNormal; // Transform normal to world space
}
`;

//фонг
const fragmentShaderSource = `#version 300 es
precision highp float;

in vec3 vPosition;
in vec3 vNormal;

uniform vec3 uViewPosition;

uniform vec3 uPointLightPosition;
uniform vec3 uPointLightColor;
uniform float uAmbientCoeff;

uniform float uK0;
uniform float uK1;
uniform float uK2;

out vec4 fragColor;


void main() {
    vec3 objectColor = vec3(1.0, 1.0, 1.0);

    // Нормализация нормали
    vec3 normal = normalize(vNormal);

    // Ambient light
    vec3 ambient = uAmbientCoeff * objectColor;

    // Point light
    vec3 pointLightDir = normalize(uPointLightPosition - vPosition);
    vec3 viewDir = normalize(uViewPosition - vPosition);
    vec3 reflectDirPoint = reflect(-pointLightDir, normal);

    float pointSpecularStrength = 0.5; // Интенсивность зеркального отражения
    float specPoint = pow(max(dot(viewDir, reflectDirPoint), 0.0), 16.0); // Зеркальный бликовый эффект
    vec3 pointLightSpecular = pointSpecularStrength * specPoint * uPointLightColor;

    float pointLightDistance = length(uPointLightPosition - vPosition);
    float attenuation = 1.0 / (uK0 + uK1 * pointLightDistance + uK2 * pointLightDistance * pointLightDistance); // затухание
    vec3 pointLight = uPointLightColor * max(dot(pointLightDir, normal), 0.0) + pointLightSpecular;

    vec3 lighting = ambient + attenuation * pointLight;
    fragColor = vec4(lighting * objectColor, 1.0);
}
`;

const lambertFragmentShaderSource = `#version 300 es
precision highp float;

in vec3 vPosition;
in vec3 vNormal;

uniform vec3 uViewPosition;

uniform vec3 uPointLightPosition;
uniform vec3 uPointLightColor;
uniform float uAmbientCoeff;

uniform float uK0;
uniform float uK1;
uniform float uK2;

out vec4 fragColor;

void main() {
    vec3 objectColor = vec3(1.0, 1.0, 1.0);

    // Нормализация нормали
    vec3 normal = normalize(vNormal);

    // Ambient light
    vec3 ambient = uAmbientCoeff * objectColor;

    // Point light
    vec3 pointLightDir = normalize(uPointLightPosition - vPosition);
    
    float pointLightDistance = length(uPointLightPosition - vPosition);
    float attenuation = 1.0 / (uK0 + uK1 * pointLightDistance + uK2 * pointLightDistance * pointLightDistance); // затухание
    vec3 pointLight = attenuation * uPointLightColor * max(dot(normal, pointLightDir), 0.0);

    vec3 lighting = ambient + pointLight;
    fragColor = vec4(lighting * objectColor, 1.0);
}
`;
//---------[Шейдинг по Гуро]----------

const vertexShaderGouraudPhong = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aOffset;
in vec3 aNormal;

uniform mat4 uMVPMatrix;
uniform mat4 uModelMatrix;
uniform vec3 uViewPosition;
uniform vec3 uPointLightPosition;
uniform vec3 uPointLightColor;
uniform float uAmbientCoeff;
uniform float uK0;
uniform float uK1;
uniform float uK2;

out vec3 vColor;

void main() {
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0) + vec4(aOffset, 0.0);
    gl_Position = uMVPMatrix * worldPosition;
    
    vec3 normal = normalize(mat3(uModelMatrix) * aNormal);
    vec3 position = worldPosition.xyz;
    vec3 objectColor = vec3(1.0);
    
    // Ambient light
    vec3 ambient = uAmbientCoeff * objectColor;
    
    // Point light
    vec3 pointLightDir = normalize(uPointLightPosition - position);
    vec3 viewDir = normalize(uViewPosition - position);
    vec3 reflectDirPoint = reflect(-pointLightDir, normal);
    
    float pointSpecularStrength = 0.5;
    float specPoint = pow(max(dot(viewDir, reflectDirPoint), 0.0), 16.0);
    vec3 pointLightSpecular = pointSpecularStrength * specPoint * uPointLightColor;
    
    float pointLightDistance = length(uPointLightPosition - position);
    float attenuation = 1.0 / (uK0 + uK1 * pointLightDistance + uK2 * pointLightDistance * pointLightDistance);
    vec3 pointLight = uPointLightColor * max(dot(pointLightDir, normal), 0.0) + pointLightSpecular;
    
    vec3 lighting = ambient + attenuation * pointLight;
    vColor = lighting * objectColor;
}
`;

// Vertex shader для Gouraud шейдинга (Lambert модель)
const vertexShaderGouraudLambert = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aOffset;
in vec3 aNormal;

uniform mat4 uMVPMatrix;
uniform mat4 uModelMatrix;
uniform vec3 uPointLightPosition;
uniform vec3 uPointLightColor;
uniform float uAmbientCoeff;
uniform float uK0;
uniform float uK1;
uniform float uK2;

out vec3 vColor;

void main() {
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0) + vec4(aOffset, 0.0);
    gl_Position = uMVPMatrix * worldPosition;
    
    vec3 normal = normalize(mat3(uModelMatrix) * aNormal);
    vec3 position = worldPosition.xyz;
    vec3 objectColor = vec3(1.0);
    
    vec3 ambient = uAmbientCoeff * objectColor;
    vec3 pointLightDir = normalize(uPointLightPosition - position);
    
    float pointLightDistance = length(uPointLightPosition - position);
    float attenuation = 1.0 / (uK0 + uK1 * pointLightDistance + uK2 * pointLightDistance * pointLightDistance);
    vec3 pointLight = attenuation * uPointLightColor * max(dot(normal, pointLightDir), 0.0);
    
    vec3 lighting = ambient + pointLight;
    vColor = lighting * objectColor;
}
`;

const fragmentShaderGouraud = `#version 300 es
    precision highp float;

    in vec3 vColor;
    out vec4 fragColor;

    void main() {
        fragColor = vec4(vColor, 1.0);
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

// Класс для работы с объектами
class GLObject 
{
    constructor(gl, program, objUrl, shading, lighting, scale = [1.0, 1.0, 1.0]) 
    {
        this.gl = gl;
        this.program = program;
        this.objUrl = objUrl;
        this.shading = shading;
        this.lighting = lighting;
        this.scale = scale;
        this.positionBuffer = null;
        this.normalBuffer = null; // Добавляем буфер для нормалей
        this.offsets = new Float32Array([0.0, 0.0, 0.0]);
        this.objData = null;
        this.programPhongPhong = program;
        this.programPhongLambert = createProgram(gl, vertexShaderSource, lambertFragmentShaderSource);
        this.programGouraudPhong = createProgram(gl, vertexShaderGouraudPhong, fragmentShaderGouraud);
        this.programGouraudLambert = createProgram(gl, vertexShaderGouraudLambert, fragmentShaderGouraud);
    }

    async changeLightingModel() 
    {
        if (this.shading === "phong") 
        {
            if (this.lighting === "phong")
                this.program = this.programPhongPhong;
            else
                this.program = this.programPhongLambert;
        }
        else
        {
            if (this.lighting === "phong")
                this.program = this.programGouraudPhong;
            else
                this.program = this.programGouraudLambert;       
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

        this.normalBuffer = this.gl.createBuffer(); // Создаем буфер для нормалей
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.objData.normals), this.gl.STATIC_DRAW);
    }

    async loadOBJ(url) 
    {
        const response = await fetch(url);
        const text = await response.text();

        const positions = []; // Вершины (v)
        const texCoords = []; // Текстурные координаты (vt)
        const normals = [];   // Нормали (vn)
        const finalPositions = []; // Итоговые вершины
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
            normals: finalNormals,
        };
    }

    setOffsets(offsets) { this.offsets = new Float32Array(offsets); }

    render(modelMatrix, mvpMatrix, aPosition, aOffsetLocation, uModelMatrix, uMVPMatrix, cameraPosition, cameraTarget, cameraUp) 
    {
        updateModelViewMatrix(modelMatrix, cameraPosition, cameraTarget, cameraUp);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.vertexAttribPointer(aPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aPosition);

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

        mat4.scale(modelMatrix, modelMatrix, this.scale);
        this.gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
        this.gl.uniformMatrix4fv(uMVPMatrix, false, mvpMatrix);

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, this.objData.positions.length / 3, this.offsets.length / 3);
    }
}

let aPosition
let aOffsetLocation
let uMVPMatrix
let uModelMatrix
let uPointLightPosition
let uPointLightColor
let uViewPosition
let uAmbientCoeff
let uK0
let uK1
let uK2

let ambientCoeff = 0.01;
let k0 = 1;
let k1 = 0;
let k2 = 0;

function changeLocations(gl, program)
{
    gl.useProgram(program);

    // Получение местоположений атрибутов и uniform-переменных
    aPosition = gl.getAttribLocation(program, "aPosition");
    aOffsetLocation = gl.getAttribLocation(program, "aOffset");
    uMVPMatrix = gl.getUniformLocation(program, "uMVPMatrix");
    uModelMatrix = gl.getUniformLocation(program, "uModelMatrix");

    uAmbientCoeff = gl.getUniformLocation(program, "uAmbientCoeff");
    uK0 = gl.getUniformLocation(program, "uK0");
    uK1 = gl.getUniformLocation(program, "uK1");
    uK2 = gl.getUniformLocation(program, "uK2");
    
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

(async function main() 
{
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    // Создание объектов
    const snowman = new GLObject(gl, program, "snowman.obj", "phong", "phong", [4, 4, 4]);
    const balloon = new GLObject(gl, program, "balloon.obj", "phong", "phong", [1.0, 1.0, 1.0]);
    const gun = new GLObject(gl, program, "Gun.obj", "phong", "phong", [15.0, 15.0, 15.0]);
    const carpet = new GLObject(gl, program, "cube.obj", "phong", "phong", [1000.0,7.0,1000.0]);

    // Инициализация объектов
    await snowman.init();
    await balloon.init();
    await gun.init();
    await carpet.init();

    // Установка смещений
    snowman.setOffsets([0.0, -20.0, -40.0]);
    balloon.setOffsets([-10.0, 0.0, -30.0]);
    gun.setOffsets([13.0, -15.0, -30.0]);
    carpet.setOffsets([0.0, -30.0, -70.0]);

    // Матрица проекций
    let mvpMatrix = mat4.create();
    let modelMatrix = mat4.create();
    mat4.perspective(mvpMatrix, Math.PI / 2, canvas.width / canvas.height, 0.1, Infinity);
    
    // Камера
    let cameraPosition = vec3.fromValues(0, 0, -5);
    let cameraTarget = vec3.fromValues(0, 0, 0);
    let cameraUp = vec3.fromValues(0, 1, 0);

    // Параметры источников света
    let pointLightPosition = [0.0, 0.0, 0.0];

    // Обработчики для ползунков
    document.getElementById('pointLightX').addEventListener('input', (event) => {
        pointLightPosition[0] = parseFloat(event.target.value);
    });
    document.getElementById('pointLightY').addEventListener('input', (event) => {
        pointLightPosition[1] = parseFloat(event.target.value);
    });
    document.getElementById('pointLightZ').addEventListener('input', (event) => {
        pointLightPosition[2] = parseFloat(event.target.value);
    });
    document.getElementById('ambientCoeff').addEventListener('input', (event) => {
        ambientCoeff = parseFloat(event.target.value);
    });
    document.getElementById('k0').addEventListener('input', (event) => {
        k0 = parseFloat(event.target.value);
    });
    document.getElementById('k1').addEventListener('input', (event) => {
        k1 = parseFloat(event.target.value);
    });
    document.getElementById('k2').addEventListener('input', (event) => {
        k2 = parseFloat(event.target.value);
    });
    
    // Обработчик выпадающего списка фигур
    let currentFigure = snowman;
    selectFigure.addEventListener('change', (e) => {
        const selectedValue = e.target.value;

        switch (selectedValue)
        {
            case "snowman": currentFigure = snowman;
                            break;
            case "balloon": currentFigure = balloon;
                            break;
            case "gun":     currentFigure = gun;
                            break;
            case "carpet":  currentFigure = carpet;
            break;
        }

        selectLighting.value = currentFigure.lighting;
    });

    // Обработчик шейдинга для выбранной фигуры
    selectShading.addEventListener('change', (e) => {
        currentFigure.shading = e.target.value;
        currentFigure.changeLightingModel();
    });

    // Обработчик света для выбранной фигуры
    selectLighting.addEventListener('change', (e) => {
        currentFigure.lighting = e.target.value;
        currentFigure.changeLightingModel();
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
            gl.uniform1f(uAmbientCoeff, ambientCoeff);
            gl.uniform1f(uK0, k0);
            gl.uniform1f(uK1, k1);
            gl.uniform1f(uK2, k2);
        }

        // Отрисовка snowman
        changeLocations(snowman.gl, snowman.program);
        setParameters(snowman.gl);
        snowman.render(modelMatrix, mvpMatrix, aPosition, aOffsetLocation, uModelMatrix, uMVPMatrix, cameraPosition, cameraTarget, cameraUp);

        // Отрисовка gun
        changeLocations(gun.gl, gun.program);
        setParameters(gun.gl);
        gun.render(modelMatrix, mvpMatrix, aPosition, aOffsetLocation, uModelMatrix, uMVPMatrix, cameraPosition, cameraTarget, cameraUp);

        //Отрисовка balloon
        changeLocations(balloon.gl, balloon.program);
        setParameters(balloon.gl);
        balloon.render(modelMatrix, mvpMatrix, aPosition, aOffsetLocation, uModelMatrix, uMVPMatrix, cameraPosition, cameraTarget, cameraUp)
    
        //Отрисовка carpet
        changeLocations(carpet.gl, carpet.program);
        setParameters(carpet.gl);
        carpet.render(modelMatrix, mvpMatrix, aPosition, aOffsetLocation, uModelMatrix, uMVPMatrix, cameraPosition, cameraTarget, cameraUp)

        requestAnimationFrame(render);
    }

    gl.clearColor(0, 0.8, 0.8, 1);
    gl.enable(gl.DEPTH_TEST);
    render()
    //обработчики
})();