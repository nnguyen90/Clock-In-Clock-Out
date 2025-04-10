const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    console.log("Middleware running for:", req.method, req.path);
    console.log("Headers received:", req.headers);
    const token = req.header("Authorization");

    if (!token) {
        console.error("No token provided");
        return res.status(401).json({ error: "Access denied, no token provided" });
    }

    console.log("JWT_SECRET from .env:", process.env.JWT_SECRET); // Log the secret key

    try {
        // Remove "Bearer " prefix if present
        const tokenWithoutBearer = token.replace("Bearer ", "").trim();

    
        console.log("Received token:", tokenWithoutBearer);

        // Decode token without verification
        const decodedWithoutVerification = jwt.decode(tokenWithoutBearer);
        console.log("Decoded token (no verification):", decodedWithoutVerification);

        // Verify token signature
        const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
        console.log("Verified token:", decoded);

        req.user = decoded;
        next();
    } catch (error) {
        console.error("JWT verification failed:", error.message);
        return res.status(400).json({ error: "Invalid token" });
    }
};
