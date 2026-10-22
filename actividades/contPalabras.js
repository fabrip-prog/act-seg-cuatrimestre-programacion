function contarPalabras(texto) {
    const conteo = {};
    let palabraActual = "";
    
    function esCaracterValido(char) {
        const codigo = char.charCodeAt(0);
        return (codigo >= 97 && codigo <= 122) ||
               (codigo >= 65 && codigo <= 90) || 
               (codigo >= 48 && codigo <= 57) || 
               char === 'á' || char === 'é' || char === 'í' || char === 'ó' || char === 'ú' ||
               char === 'Á' || char === 'É' || char === 'Í' || char === 'Ó' || char === 'Ú' ||
               char === 'ñ' || char === 'Ñ';
    }

    const textoMin = texto.toLowerCase();

    for (let i = 0; i < textoMin.length; i++) {
        const char = textoMin[i];
        
        if (esCaracterValido(char)) {
            palabraActual += char;
        } else {
           if (palabraActual !== "") {
                if (conteo[palabraActual] === undefined) {
                    conteo[palabraActual] = 1;
                } else {
                    conteo[palabraActual]++; 
                }
                palabraActual = ""; 
            }
        }
    }
    
    if (palabraActual !== "") {
        if (conteo[palabraActual] === undefined) {
            conteo[palabraActual] = 1;
        } else {
            conteo[palabraActual]++;
        }
    }

    return conteo;
}

const textoDePrueba = "Hola, hola mundo. ¿Qué tal el mundo? El mundo es genial, muy genial.";
const recuento = contarPalabras(textoDePrueba);

console.log("Recuento de palabras:");
for (const palabra in recuento) {
    console.log(`"${palabra}": ${recuento[palabra]}`);
}
