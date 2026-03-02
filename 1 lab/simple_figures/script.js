// Получение контекста WebGL
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
const selectFigure = document.getElementById('figure');
const selectColor = document.getElementById('colorSelector');
const chooseColor = document.getElementById('chooseColor');
const quadranglePanel = document.getElementById('quadrangleChangePanel');
const checkboxLined = document.getElementById('lined');
const kRange = document.getElementById('kParam');
const pentagonPanel = document.getElementById('pentagonRadiusChangePanel');

if (!gl) { alert("WebGL не поддерживается!"); }

let color = [0, 1, 0, 1];

let k = 4.0;

// основной класс фигуры
class Figure{
    constructor(vertexShader, fragmentShader, positions, colors=null)
    {
        this.vertexShaderSource = vertexShader;
        this.fragmentShaderSource = fragmentShader;
        this.positions = positions;
        this.colors = colors;//для градиента
    }

    draw()
    {
        // Инициализация шейдера
        function createShader(gl, type, source) 
        {
            const shader = gl.createShader(type); //Создаём
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

        // Создание и компиляция шейдеров
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);

        // Инициализация шейдерной программы
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

        // Создание шейдерной программы
        const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
        gl.useProgram(shaderProgram);

        if (chooseColor.style.display === 'inline')
        {
            const uColorLocation = gl.getUniformLocation(shaderProgram, "uColor")
            gl.uniform4fv(uColorLocation, color);
        }
        
        if (isLined)
        {
            const uKLocation = gl.getUniformLocation(shaderProgram, 'uK');
            gl.uniform1f(uKLocation, k);
        }

        // Получение ID атрибута
        const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "aPosition");
        const colorAttributeLocation = gl.getAttribLocation(shaderProgram, 'aColor');
        if (positionAttributeLocation === -1) 
        {
            console.error("Атрибут aPosition не найден в шейдерной программе.");
        }
        
        if(colorAttributeLocation === -1){
            console.error("Аттрибут aColor не найден в шейдерной программе.");
        }

        // Инициализация VBO
        const positionBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        const positions = this.positions;

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        // Привязка атрибута
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        if(colorAttributeLocation !== -1 && this.colors){
            const colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,  colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(colorAttributeLocation);
            gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0)
        }

        // Очистка и отрисовка
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Чёрный фон
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.positions.length/2);

        // Очистка ресурсов
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteProgram(shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

const vertexShader = `attribute vec4 aPosition; //позиция вершины
                      attribute vec4 aColor; 
                      varying vec4 vColor;

                      void main() { 
                        gl_Position = aPosition; 
                        vColor = aColor;
                      }`;
                             
const uniformFragmentShader = `precision mediump float; //точность для float чисел
                               uniform vec4 uColor; // передаём цвет

                               void main() { gl_FragColor = uColor; }`


const linedVertexShader =  `attribute vec4 aPosition; //позиция вершины
                            attribute vec4 aColor; 
                            varying vec4 vColor;
                            varying vec3 vPosition; // Для передачи позиции

                            void main() { 
                                gl_Position = aPosition; 
                                vColor = aColor;
                                vPosition = aPosition.xyz; // Передаем во фрагментный шейдер
                            }`

const linedFragmentShader =    `precision mediump float;
                                uniform float uK;
                                varying vec3 vPosition;
                                varying vec4 vColor;

                                void main() {    
                                    float K = uK;
                                    
                                    float x_interpolated = floor(vPosition.x * K); 
                                    
                                    if (mod(float(x_interpolated), 2.0) == 0.0) {  
                                        gl_FragColor = vec4(1, 1, 1, 1);
                                    } else {  
                                        gl_FragColor = vec4(0, 1, 1, 1);
                                    }
                                }`

const gradientFragmentShader = `precision mediump float; //точность для float чисел
                               varying vec4 vColor; // Цвет

                               void main(){ gl_FragColor = vColor; }
`;


let usedFragmentShader = uniformFragmentShader;
// квадрат
let quadrangle_x1 = -0.5;
let quadrangle_y1 = 0.5;
let quadrangle_x2 = 0.5;
let quadrangle_y2 = 0.5;
let quadrangle_x3 = 0.5;
let quadrangle_y3 = -0.5;
let quadrangle_x4 = -0.5;
let quadrangle_y4 = -0.5;

let isLined = false;

let quadrangle;
function initQuadrangle()
{
    if (isLined)
    {
        chooseColor.style.display = "none";
        kRange.style.display = "inline";
        quadrangle = new Figure(linedVertexShader,
                                linedFragmentShader,
                                [quadrangle_x1, quadrangle_y1,
                                quadrangle_x2, quadrangle_y2,
                                quadrangle_x3, quadrangle_y3,
                                quadrangle_x4, quadrangle_y4] 
                                )
    }
    else
    {
        chooseColor.style.display = "inline";
        kRange.style.display = "none";
        quadrangle = new Figure(vertexShader,
                                usedFragmentShader,
                                [quadrangle_x1, quadrangle_y1,
                                quadrangle_x2, quadrangle_y2,
                                quadrangle_x3, quadrangle_y3,
                                quadrangle_x4, quadrangle_y4] 
                                )
    }
}

checkboxLined.addEventListener('change', function() {
            isLined = this.checked;
            selectFigure.dispatchEvent(new Event("change"));
        });

// пятиугольник

let pentagon_x1 = 0;
let pentagon_y1 = 1;

let pentagon;
function initPentagon()
{ 
    let pentagon_x2 = Math.sin(72 * Math.PI / 180)*pentagon_y1;
    let pentagon_y2 = Math.cos(72 * Math.PI / 180)*pentagon_y1;
    let pentagon_x3 = Math.sin(36 * Math.PI / 180)*pentagon_y1;
    let pentagon_y3 = -Math.cos(36 * Math.PI / 180)*pentagon_y1;
    let pentagon_x4 = -pentagon_x3;
    let pentagon_y4 = pentagon_y3;
    let pentagon_x5 = -pentagon_x2;
    let pentagon_y5 = pentagon_y2;
    pentagon = new Figure(vertexShader,
                          usedFragmentShader,
                          [pentagon_x1, pentagon_y1,
                          pentagon_x2, pentagon_y2,
                          pentagon_x3, pentagon_y3,
                          pentagon_x4, pentagon_y4,
                          pentagon_x5, pentagon_y5]
                        )
}

// треугольник
let triangle;

let triangle_x1 = 0;
let triangle_y1 = 1;
let triangle_x2 = 1;
let triangle_y2 = -1;
let triangle_x3 = -1;
let triangle_y3 = -1;

function initTriangle()
{
    triangle_points = [
                        triangle_x1, triangle_y1,
                        triangle_x2, triangle_y2,
                        triangle_x3, triangle_y3
                      ]
    triangle = new Figure(vertexShader,
                      usedFragmentShader,
                      triangle_points,
                      [[0, 1, 0, 1], [0, 0, 1, 1], [1, 0, 0, 1]].flat()
                    )
}

initQuadrangle();
initTriangle();
initPentagon();
quadrangle.draw();
//================================| Остальное |========================================

// Обработчик выпадающего списка фигур
selectFigure.addEventListener('change', (e) => {
    const selectedValue = e.target.value;

    switch (selectedValue)
    {
        case "4angle": usedFragmentShader = uniformFragmentShader;
                       initQuadrangle();
                       quadrangle.draw(); 
                       quadranglePanel.style.display = 'flex';
                       pentagonPanel.style.display = 'none';

                       break;
        case "triangle":usedFragmentShader = gradientFragmentShader;
                        chooseColor.style.display = "none";

                        initTriangle()
                        triangle.draw();
                        quadranglePanel.style.display = 'none';
                        pentagonPanel.style.display = 'none';
                        break;
        case "5angle": usedFragmentShader = uniformFragmentShader;
                       chooseColor.style.display = "inline";
                       
                       initPentagon();
                       pentagon.draw();
                       quadranglePanel.style.display = 'none';
                       pentagonPanel.style.display = 'flex';
                       break;
    }
});

document.getElementById('R').addEventListener('input', (e) => {
    pentagon_y1 = parseFloat(e.target.value);
    initPentagon();
    pentagon.draw();
});

document.getElementById('K').addEventListener('input', (e) => {
    k = parseFloat(e.target.value);
    initQuadrangle();
    quadrangle.draw();
});

document.getElementById('chooseColor').addEventListener('input', (e) => {
    function hexToRgbWebGL(hex)
    {
        let bigint = parseInt(hex.slice(1), 16);
        let r = (bigint >> 16) & 255;
        let g = (bigint >> 8) & 255;
        let b = bigint & 255;
        return [r/255, g/255, b/255, 1];
    }
    
    color = hexToRgbWebGL(e.target.value);
    selectFigure.dispatchEvent(new Event("change"));
});