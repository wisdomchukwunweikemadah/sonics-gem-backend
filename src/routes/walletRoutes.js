const router = require("express").Router();
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const authMiddleware = require("../middleware/authMiddleware");
router.post("/transfer", authMiddleware, async (req, res) => {
  try {
    const { senderId, receiverWalletId, amount } = req.body;

    const sender = await User.findById(senderId);
    const receiver = await User.findOne({ walletId: receiverWalletId });

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    if (sender.gemBalance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    sender.gemBalance -= amount;
    receiver.gemBalance += amount;

    await sender.save();
    await receiver.save();

    await Transaction.create({
      sender: sender._id,
      receiver: receiver._id,
      amount,
      type: "transfer"
    });

    res.json({ message: "Transfer successful" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/transactions/:userId", authMiddleware, async (req, res) => {
  const transactions = await Transaction.find({
    $or: [
      { sender: req.params.userId },
      { receiver: req.params.userId }
    ]
  })
    .populate("sender receiver")
    .sort({ createdAt: -1 });

  res.json(transactions);
});

module.exports = router;