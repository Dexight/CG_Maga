const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

// Класс для работы с объектами
class GLObject 
{
    constructor(gl, program, objUrl, textureUrl, bumpUrl, lighting, scale = [1.0, 1.0, 1.0]) 
    {
        this.gl = gl;
        this.program = program;
        this.objUrl = objUrl;
        this.textureUrl = textureUrl;
        this.bumpUrl = bumpUrl;
        this.lighting = lighting;
        this.scale = scale;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.normalBuffer = null;
        this.tangentBuffer = null; // Буфер для касательных
        this.texture = null;
        this.bumpMap = null;
        this.offsets = new Float32Array([0.0, 0.0, 0.0]);
        this.objData = null;
        this.programPhong = program;
    }

    async init() 
    {
        // Загрузка OBJ-файла
        this.objData = await this.loadOBJ(this.objUrl);

        // BUMP
        this.computeTangents();

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

        this.tangentBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.tangentBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.objData.tangents), this.gl.STATIC_DRAW);

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

        this.bumpMap = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bumpMap);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        const bumpImage = new Image();
        bumpImage.src = this.bumpUrl;
        await new Promise((resolve) => {
            bumpImage.onload = () => {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.bumpMap);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, bumpImage);
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

    // Вычисление касательных для каждой вершины
    computeTangents() {
        const positions = this.objData.positions;
        const texCoords = this.objData.texCoords;
        
        if (positions.length === 0 || texCoords.length === 0) {
            return;
        }

        const vertexCount = positions.length / 3;
        const tangents = new Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) {
            tangents[i] = [0, 0, 0];
        }

        // Проходим по треугольникам
        for (let i = 0; i < positions.length; i += 9) {
            // Вершины треугольника
            const v1 = [positions[i], positions[i+1], positions[i+2]];
            const v2 = [positions[i+3], positions[i+4], positions[i+5]];
            const v3 = [positions[i+6], positions[i+7], positions[i+8]];
            
            // Текстурные координаты
            const uv1 = [texCoords[i/3 * 2], texCoords[i/3 * 2 + 1]];
            const uv2 = [texCoords[(i/3 + 1) * 2], texCoords[(i/3 + 1) * 2 + 1]];
            const uv3 = [texCoords[(i/3 + 2) * 2], texCoords[(i/3 + 2) * 2 + 1]];
            
            // Вычисление векторов ребер
            const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
            const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
            
            // Вычисление дельт текстурных координат
            const deltaUV1 = [uv2[0] - uv1[0], uv2[1] - uv1[1]];
            const deltaUV2 = [uv3[0] - uv1[0], uv3[1] - uv1[1]];
            
            // Вычисление касательной
            const f = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV2[0] * deltaUV1[1]);
            
            const tangent = [
                f * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
                f * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
                f * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2])
            ];
            
            // Добавляем касательную к каждой вершине треугольника
            for (let j = 0; j < 3; j++) {
                const idx = i/3 + j;
                tangents[idx][0] += tangent[0];
                tangents[idx][1] += tangent[1];
                tangents[idx][2] += tangent[2];
            }
        }
        
        // Нормализация касательных
        const finalTangents = [];
        for (let i = 0; i < vertexCount; i++) {
            const t = tangents[i];
            const len = Math.sqrt(t[0]*t[0] + t[1]*t[1] + t[2]*t[2]);
            if (len > 0) {
                finalTangents.push(t[0]/len, t[1]/len, t[2]/len);
            } else {
                finalTangents.push(1, 0, 0);
            }
        }
        
        this.objData.tangents = finalTangents;
    }

    setOffsets(offsets) { this.offsets = new Float32Array(offsets); }

    render(modelMatrix, mvpMatrix, aPosition, aTexCoord, aOffsetLocation, uTextureLocation, uModelMatrix, uMVPMatrix, cameraPosition, cameraTarget, cameraUp, uBumpMapLocation) 
    {
        updateModelViewMatrix(modelMatrix, cameraPosition, cameraTarget, cameraUp);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.vertexAttribPointer(aPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aPosition);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.vertexAttribPointer(aTexCoord, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aTexCoord);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer); 
        const aNormal = this.gl.getAttribLocation(this.program, "aNormal");
        this.gl.vertexAttribPointer(aNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aNormal);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.tangentBuffer); // Привязываем BUMP буфер
        const aTangent = this.gl.getAttribLocation(this.program, "aTangent");
        this.gl.vertexAttribPointer(aTangent, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(aTangent);

        const offsetBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, offsetBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.offsets, this.gl.STATIC_DRAW);

        this.gl.enableVertexAttribArray(aOffsetLocation);
        this.gl.vertexAttribPointer(aOffsetLocation, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(aOffsetLocation, 1);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(uTextureLocation, 0);

        // Bump map
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bumpMap);
        this.gl.uniform1i(uBumpMapLocation, 1);

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
in vec3 aTangent;

uniform mat4 uMVPMatrix;
uniform mat4 uModelMatrix;

out vec2 vTexCoord;
out vec3 vPosition;
out vec3 vNormal;
out vec3 vTangent;

void main() {
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0) + vec4(aOffset, 0.0);
    gl_Position = uMVPMatrix * worldPosition;
    vTexCoord = vec2(aTexCoord.x, 1.0 - aTexCoord.y);
    vPosition = worldPosition.xyz;
    vNormal = mat3(uModelMatrix) * aNormal;
    vTangent = mat3(uModelMatrix) * aTangent;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec3 vPosition;
in vec3 vNormal;
in vec3 vTangent;

uniform sampler2D uTexture;
uniform sampler2D uBumpMap;

uniform vec3 uViewPosition;
uniform vec3 uPointLightPosition;
uniform vec3 uPointLightColor;

out vec4 fragColor;

// Функция для получения возмущенной нормали из bump map
vec3 getBumpedNormal() {
    float height = texture(uBumpMap, vTexCoord).r;// Высота
    
    // Градиент высоты по текстурным координатам + размеру изображения
    vec2 texelSize = 1.0 / vec2(textureSize(uBumpMap, 0));
    float h1 = texture(uBumpMap, vTexCoord + vec2(texelSize.x, 0.0)).r;
    float h2 = texture(uBumpMap, vTexCoord + vec2(0.0, texelSize.y)).r;
    
    // производные по uv
    float du = (h1 - height);
    float dv = (h2 - height);
    
    // TBN матрица
    vec3 N = normalize(vNormal);
    vec3 T = normalize(vTangent);
    vec3 B = cross(N, T);
    
    // Вектор возмущения
    float strength = 1.0;
    vec3 perturbedNormalTS = normalize(vec3(-du * strength, dv*strength, 1.0));
    
    // Возмущенная нормаль в мировое пространство
    return normalize(T * perturbedNormalTS.x + B * perturbedNormalTS.y + N * perturbedNormalTS.z);
}

void main() {
    vec4 texColor = texture(uTexture, vTexCoord);

    // Возмущенная нормаль из bump map
    vec3 normal = getBumpedNormal();

    // Ambient light
    vec3 ambient = 0.1 * texColor.rgb;

    // Point light
    vec3 pointLightDir = normalize(uPointLightPosition - vPosition);
    vec3 viewDir = normalize(uViewPosition - vPosition);
    vec3 reflectDirPoint = reflect(-pointLightDir, normal);

    float pointSpecularStrength = 0.5;
    float specPoint = pow(max(dot(viewDir, reflectDirPoint), 0.0), 16.0);
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
let uBumpMapLocation

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

    //Bump
    uBumpMapLocation = gl.getUniformLocation(program, "uBumpMap");
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
    const sphere = new GLObject(gl, program, "sphere.obj","color.jpg", "bump.jpg", "phong", [20.0, 20.0, 20.0] )
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
        sphere.render(modelMatrix, mvpMatrix, aPosition, aTexCoord, aOffsetLocation, uTextureLocation, uModelMatrix, uMVPMatrix, cameraPosition, cameraTarget, cameraUp, uBumpMapLocation)
        
        requestAnimationFrame(render);
    }

    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);
    render();
})();