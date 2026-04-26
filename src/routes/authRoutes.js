const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");


// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      walletId: "SGT" + Date.now(),
      gemBalance: 5000,
      verificationToken
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json("User not found");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json("Invalid credentials");

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// EMAIL VERIFICATION
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token
    });

    if (!user) {
      return res.status(400).json("Invalid token");
    }

    user.verified = true;
    user.verificationToken = null;

    await user.save();

    res.json("Email verified");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// REQUEST PASSWORD RESET
router.post("/request-reset", async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString("hex");

    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json("User not found");
    }

    user.resetToken = token;
    await user.save();

    res.json({
      message: "Reset token created",
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// RESET PASSWORD
router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token
    });

    if (!user) {
      return res.status(400).json("Invalid reset token");
    }

    const hashed = await bcrypt.hash(req.body.password, 10);

    user.password = hashed;
    user.resetToken = null;

    await user.save();

    res.json("Password reset successful");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;