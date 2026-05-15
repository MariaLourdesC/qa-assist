const express = require('express');
const router = express.Router();
const { classifyStory } = require('../services/functional-classifier.service');

// POST /api/classifier-test
// Body: { texto: string }
router.post('/', (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto) {
      return res.status(400).json({ error: 'El texto es obligatorio' });
    }
    const resultado = classifyStory(texto);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
