function reverseString(texto) {
    let reversed = "";
    for (let i = texto.length - 1; i >= 0; i--) {
        reversed += texto[i];
    }
    return reversed;
}

console.log(reverseString("Hola mundo"));
