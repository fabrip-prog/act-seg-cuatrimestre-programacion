function toLower(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code >= 65 && code <= 90) {
            result += String.fromCharCode(code + 32);
        } else {
            result += str[i];
        }
    }
    return result;
}

function isAnagram(word1, word2) {
    let w1 = toLower(word1);
    let w2 = toLower(word2);

    // Dos palabras exactamente iguales NO son un anagrama
    if (w1 === w2) {
        return false;
    }
    
    // Medir longitud sin usar str.length
    let len1 = 0;
    while(w1[len1] !== undefined) len1++;
    
    let len2 = 0;
    while(w2[len2] !== undefined) len2++;

    if (len1 !== len2) {
        return false;
    }

    // Contar las frecuencias de los caracteres manualmente
    let charCount = {};
    for (let i = 0; i < len1; i++) {
        let char = w1[i];
        if (charCount[char] === undefined) {
            charCount[char] = 1;
        } else {
            charCount[char]++;
        }
    }

    // Verificar las frecuencias con la segunda palabra
    for (let i = 0; i < len2; i++) {
        let char = w2[i];
        if (charCount[char] === undefined) {
            return false;
        }
        charCount[char]--;
        if (charCount[char] < 0) {
            return false;
        }
    }

    // Comprobar que todas las frecuencias llegaron a 0
    // (no es estrictamente necesario ya que ambas palabras tienen misma longitud)
    return true;
}

// Ejemplos de prueba
console.log("¿Son 'roma' y 'amor' anagramas? " + isAnagram("roma", "amor")); // true
console.log("¿Son 'hola' y 'hola' anagramas? " + isAnagram("hola", "hola")); // false
console.log("¿Son 'Listen' y 'Silent' anagramas? " + isAnagram("Listen", "Silent")); // true
console.log("¿Son 'perro' y 'gatos' anagramas? " + isAnagram("perro", "gatos")); // false
