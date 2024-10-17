const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const defineCharacters = require('../models/Character');

let SECRET_KEY;
let HOST;
const challenges = new Map(); // Store challenges in memory (consider using Redis for production)

function initializeRouter(config) {
    SECRET_KEY = config.secretKey;
    HOST = config.host;
    return router;
}

// @TODO: we're still not validating a lot of things. we should double check:
// - the steamId is valid
// - characterId belongs to the steamId
// and more, across other routes too.

// Create a challenge
router.post('/create-challenge', (req, res) => {
    // const token = req.headers.authorization.split(' ')[1];
    // const decoded = jwt.verify(token, SECRET_KEY);
    // if (decoded.type !== 'server') {
    //     return res.status(403).json({ error: 'Invalid token type' });
    // }

    const { steamId, characterId } = req.body;
    if (!steamId || !characterId) {
        return res.status(400).json({ error: 'SteamID and Character ID is required' });
    }

    const challenge = crypto.randomBytes(32).toString('hex');
    const expirationTime = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    challenges.set(steamId, { challenge, expirationTime });

    const authUrl = `${HOST}/player/auth/${steamId}/${characterId}/${challenge}`;
    res.json({ authUrl });

    console.log(`Challenge created for ${steamId}: ${challenge}`);
});

// Handle the authentication
router.post('/auth/:steamId/:characterId/:challenge', async (req, res) => {
    console.log('Player is requesting authentication');

    const { steamId, characterId, challenge } = req.params;
    const storedChallenge = challenges.get(steamId);

    if (!storedChallenge || storedChallenge.challenge !== challenge || Date.now() > storedChallenge.expirationTime) {
        return res.status(400).json({ error: 'Invalid or expired challenge' });
    }

    // Remove the used challenge
    challenges.delete(steamId);

    // Here, you would typically verify the Steam authentication
    // For this example, we'll assume it's successful
    // TODO: Ensure client is on the server, validate the IP address, etc.

    const Characters = await defineCharacters();
    const character = await Characters.findOne({ where: { id: characterId, steamid: steamId } });

    if (!character) {
        return res.status(404).json({ error: 'Character not found' });
    }

    const token = jwt.sign({
        type: 'player',
        steamId: steamId,
        characterId: character.id,
        characterName: character.name,
        permissions: ['connect_server', 'use_chat']
    }, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.json({ token });
});

// Verify token (for the game server to use)
router.post('/verify-token', (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded.type !== 'gmod') {
            return res.status(403).json({ error: 'Invalid token type' });
        }
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = { initializeRouter };