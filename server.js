require('dotenv').config();
const { apiKeyMiddleware } = require('./utils/apiKeyMiddleware');
const express = require('express');
const solRoutes = require('./routes/solana');
const ethRoutes = require('./routes/ethereum');
const helmet = require('helmet');
const compression = require('compression');
const { dbConnect } = require("./utils/dbConnect");
const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(apiKeyMiddleware);

app.use('/solana', solRoutes);
app.use('/ethereum', ethRoutes);

app.route("/").get(function (req, res) {
    res.sendFile(process.cwd() + "/index.html");
});

app.route("/status").get(function (req, res) {
    res.status(200).json({"success": true, "app-name": "escu-api", "status": "running"});
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('App "escu-api" started and listening on port ' + listener.address().port)
})

dbConnect();