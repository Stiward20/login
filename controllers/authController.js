const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')
const conexion = require('../database/db')
const {promisify} = require('util')
const { error, log } = require('console')

//procedimiento para registranos

exports.register = async (req, res)=>{
    try {
        const name = req.body.name
        const user = req.body.user
        const pass = req.body.pass
        let passHash = await bcryptjs.hash(pass,8)
        //console.log(passHash);
        conexion.query('INSERT INTO user SET ?',{user:user, name:name,pass:passHash}, (error,results)=>{
            if(error){console.log(error);}
            res.redirect('/login')
        })
    } catch (error) {
        console.log(error);
    }

}



exports.login = async (req, res) => {
    try {
        const user = req.body.user;
        const pass = req.body.pass;

        if (!user || !pass) {
            // Manejar caso en que usuario o contraseña estén vacíos
            return res.render('login', {
                alert: true,
                alertTitle: "Advertencia",
                alertMessage: "Ingrese un usuario y contraseña",
                alertIcon: 'info',
                showConfirmButton: true,
                timer: false,
                ruta: 'login'
            });
        }

        // Consultar el usuario en la base de datos
        conexion.query('SELECT * FROM user WHERE user = ?', [user], async (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).send("Error en el servidor");
            }

            if (results.length === 0 || !(await bcryptjs.compare(pass, results[0].pass))) {
                // Manejar caso en que el usuario o contraseña sean incorrectos
                return res.render('login', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "Usuario y/o contraseña incorrectos",
                    alertIcon: 'error',
                    showConfirmButton: true,
                    timer: false,
                    ruta: 'login'
                });
            }

            // Generar token JWT y establecer cookie
            const id = results[0].id;
            const token = jwt.sign({ id }, process.env.JWT_SECRETO, {
                expiresIn: process.env.JWT_TIEMPO_EXPIRA
            });

            // Verificar que el token se ha generado correctamente
            console.log("TOKEN: " + token + " para el USUARIO: " + user);

            const cookieOptions = {
                expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
                httpOnly: true
            }

            res.cookie('jwt', token, cookieOptions);
            res.render('login', {
                alert: true,
                alertTitle: "Conexión exitosa",
                alertMessage: "¡LOGIN CORRECTO!",
                alertIcon: 'success',
                showConfirmButton: false,
                timer: 800,
                ruta: ''
            });
        });

    } catch (error) {
        console.log(error);
        return res.status(500).send("Error en el servidor");
    }
}



exports.isAuthenticated = async (req, res, next)=>{
    if (req.cookies.jwt) {
        try {
            const decodificada = await promisify(jwt.verify,) (req.cookies.jwt  ,process.env.JWT_SECRETO)
            conexion.query('SELECT * FROM user WHERE id = ?', [decodificada.id], (error, results)=>{
                if (!results) {return next()}
                req.user = results[0]
                return next()
            })
        } catch (error) {
            console.log(error);
        }
    }
}


exports.logout = (req, res)=>{
    res.clearCookie('jwt')
    return res.redirect('/login')
}