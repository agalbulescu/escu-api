require('dotenv').config();

const API_KEY = process.env.API_KEY;

const EXCLUDED_PATHS = ["/", "/status"];

const apiKeyMiddleware = (req, res, next) => {
    if (EXCLUDED_PATHS.includes(req.path)) {
        return next();
    }
    const apiKey = req.header("x-api-key");

    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ message: "Unauthorized" });
    }

  next();
};

module.exports = {apiKeyMiddleware};