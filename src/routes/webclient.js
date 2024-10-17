// webClientRoutes.js

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const SteamStrategy = require('passport-steam').Strategy;
const url = require('url');
const defineCharacters = require('../models/Character');

const router = express.Router();

let SECRET_KEY;
let HOST;
let ALLOWED_REDIRECT_DOMAINS; // Add this to store allowed redirect domains

function initializeRouter(config) {
    SECRET_KEY = config.secretKey;
    HOST = config.host;
    ALLOWED_REDIRECT_DOMAINS = config.allowedRedirectDomains; // e.g., ['https://app1.com', 'https://app2.com']

    passport.use(new SteamStrategy({
        returnURL: `${HOST}/webclient/steam/return`,
        realm: HOST,
        apiKey: config.steamApiKey,
        passReqToCallback: true,
        stateless: false
    },
    function(req, identifier, profile, done) {
        // Store the return URL in the profile object
        profile.returnUrl = req.query.returnUrl || req.session.returnUrl;
        return done(null, profile);
    }));

    return router;
}

// Helper function to validate the return URL
function isValidReturnUrl(returnUrl) {
    if (!returnUrl) return false;
    const parsedUrl = url.parse(returnUrl);
    return ALLOWED_REDIRECT_DOMAINS.includes(`${parsedUrl.protocol}//${parsedUrl.host}`);
}

router.get('/login', (req, res, next) => {
    const returnUrl = req.query.returnUrl;
    console.log('Login returnUrl:', returnUrl);
    
    if (isValidReturnUrl(returnUrl)) {
        req.session.returnUrl = returnUrl;
    } else {
        console.log('Invalid return URL:', returnUrl);
        req.session.returnUrl = '/webclient/protected'; // Default return URL
    }
    
    passport.authenticate('steam', { 
        failureRedirect: '/login',
        returnURL: `${HOST}/webclient/steam/return?returnUrl=${encodeURIComponent(returnUrl)}`
    })(req, res, next);
});

router.get('/steam/return', 
    passport.authenticate('steam', { failureRedirect: '/login' }),
    async (req, res) => {
        const user = req.user;
        const returnUrl = user.returnUrl || req.session.returnUrl || '/webclient/protected';
        console.log('Steam return returnUrl:', returnUrl);

        // Save the user to the session
        req.login(user, function(err) {
            if (err) { return next(err); }
            res.redirect(`/webclient/select-character?returnUrl=${encodeURIComponent(returnUrl)}`);
        });
    }
);

router.get('/select-character', async (req, res) => {
    const Characters = await defineCharacters();
    const user = req.user;

    console.log(user);

    const steamid = user.id

    // If steamid 76561198072551027 doesnt have a character, create one:
    const character
    = await Characters.findOne({ where: { steamid: steamid } });
    
    if (!character) {
      await Characters.create({
        name: 'Test Character',
        steamid: steamid,
      })
    }

    if (!user) {
        // return res.redirect('/login');
        return res.json({ error: 'User not authenticated' });
    }

    const characters = await Characters.findAll({ where: { steamid: user.id } });
    const returnUrl = req.query.returnUrl || '/webclient/protected';
    console.log('Select character GET returnUrl:', returnUrl);
    
    res.render('select-character', { 
        user, 
        characters,
        returnUrl: returnUrl
    });
});

router.post('/select-character', async (req, res) => {
    console.log('Select character POST req.body:', req.body);

    const { characterId, returnUrl } = req.body;
    const user = req.user;

    if (!user || !characterId) {
        return res.redirect('/webclient/login');
    }

    const Characters = await defineCharacters();
    const character = await Characters.findOne({ 
        where: { 
            id: characterId,
            steamid: user.id 
        } 
    });

    if (!character) {
        return res.redirect('/webclient/select-character');
    }

    const token = jwt.sign({
        type: 'webclient',
        steamId: user.id,
        displayName: user.displayName,
        characterId: character.id,
        characterName: character.name,
        permissions: ['view_content', 'post_comments', 'like_posts']
    }, SECRET_KEY, { expiresIn: '1d' });

    res.cookie('auth_token', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 24 * 60 * 60 * 1000,
        domain: '.palominorp.com'
    });

    const finalReturnUrl = returnUrl || '/webclient/protected';
    console.log('Redirecting to:', finalReturnUrl);
    res.redirect(finalReturnUrl);
});

router.get('/protected', (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded.type !== 'webclient') {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({ message: 'Access granted', user: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Logged out successfully' });
});

module.exports = { initializeRouter };