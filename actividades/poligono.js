function calcularAreaPoligono(poligono) {
    switch (poligono.tipo.toLowerCase()) {
        case "triangulo":
            return (poligono.base * poligono.altura) / 2;
        case "cuadrado":
            return poligono.lado * poligono.lado;
        case "rectangulo":
            return poligono.base * poligono.altura;
        default:
            return "Polígono no soportado";
    }
}

const unTriangulo = { tipo: "Triangulo", base: 10, altura: 5 };
const unCuadrado = { tipo: "Cuadrado", lado: 4 };
const unRectangulo = { tipo: "Rectangulo", base: 8, altura: 3 };

console.log("Área del triángulo (base 10, altura 5): " + calcularAreaPoligono(unTriangulo));
console.log("Área del cuadrado (lado 4): " + calcularAreaPoligono(unCuadrado));
console.log("Área del rectángulo (base 8, altura 3): " + calcularAreaPoligono(unRectangulo));
