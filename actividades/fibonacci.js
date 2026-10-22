let a = 0;
let b = 1;

for (let i = 0; i < 50; i++) {
    console.log(a);
    let nextNumber = a + b;
    a = b;
    b = nextNumber;
}
