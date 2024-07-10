const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

let SECRET_KEY;
let SERVER_CREDENTIALS;

function initializeRouter(config) {
    SECRET_KEY = config.secretKey;
    SERVER_CREDENTIALS = config.serverCredentials; // This should be a secure object storing server IDs and their corresponding secrets
    return router;
}

// Game Server Authentication
router.post('/server-auth', (req, res) => {
    const { serverId, serverSecret } = req.body;

    if (!serverId || !serverSecret) {
        return res.status(400).json({ error: 'Server ID and secret are required' });
    }

    // Verify server credentials
    if (!SERVER_CREDENTIALS[serverId] || SERVER_CREDENTIALS[serverId] !== serverSecret) {
        return res.status(401).json({ error: 'Invalid server credentials' });
    }

    // Generate a unique server token
    const serverToken = jwt.sign({
        type: 'server',
        serverId: serverId,
        permissions: ['create_challenge', 'verify_player_token']
    }, SECRET_KEY, { expiresIn: '1d' }); // Token valid for 1 day

    res.json({ serverToken });
});

// Verify Server Token (for API routes to use)
router.post('/verify-server-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded.type !== 'server') {
            return res.status(403).json({ error: 'Invalid token type' });
        }
        res.json({ valid: true, server: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = { initializeRouter };