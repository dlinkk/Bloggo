require('dotenv').config();
const { app } = require('./app');

function start() {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

// Chỉ export hàm start; việc gọi start() được thực hiện tại index.js
module.exports = { start };
