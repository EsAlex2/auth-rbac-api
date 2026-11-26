
    //clase para manejar errores en la API

class AppError extends Error {
    // ! constructor de mensajes, codigo de estatus y el codigo como tal 
    constructor(mensaje, codigo_estatus = 400, codigo = null) {
        super(mensaje);
        this.codigo_estatus = codigo_estatus;
        this.codigo = codigo;
    }
}   

// lo exportamos a los demas archivos
module.exports = {
    AppError,
};