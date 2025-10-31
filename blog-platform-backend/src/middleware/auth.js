const { admin } = require('../config/firebase');

async function checkAuth(req, res, next) {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(403).send('Unauthorized');
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        req.user = await admin.auth().verifyIdToken(idToken);
        next();
    } catch (error) {
        return res.status(403).send('Unauthorized');
    }
}

module.exports = { checkAuth };
