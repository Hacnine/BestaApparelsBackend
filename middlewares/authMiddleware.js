import jwt from "jsonwebtoken";

export const requireAuth = async (req, res, next) => {
  try {
    const db = req.db;
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies.access_token;
    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [
      decoded.id,
    ]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};