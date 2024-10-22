import jwt from 'jsonwebtoken'

function authenticateToken(req, res, next){
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        console.log("Authorization header not found");
        return res.sendStatus(401); // Unauthorized
    }
    const token = authHeader && authHeader.split(' ')[1];

    if(!token){ 
        console.log("no token");
        
        return res.sendStatus(401)
    };

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err) {
            console.log("verification failed", err);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    })
}

export  { authenticateToken }