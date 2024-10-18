const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// If process.env.NODE_ENV is not defined, check .env file
if (!process.env.NODE_ENV) {
    console.log('NODE_ENV not defined, checking .env file');
    require('dotenv').config();
}

const app = express();

// Configuration
const SECRET_KEY = 'aABA7q9lloZR331FtT9q8jWbJQWXQt7F';
const STEAM_API_KEY = 'C1FE80472F4FA401E9BF38E195EB8677';
const HOST = 'https://auth.palominorp.com';

app.set('view engine', 'pug');
app.set('views', './src/views');
// json parser
const corsOptions = {
    origin: [
        'http://loopback.gmod:3000',
        'http://loopback.gmod:3030',
        'http://loopback.gmod:8080',
        'http://localhost:3000',
        'http://localhost:3030',
        'http://localhost:8080',
        'https://papi-staging.palominorp.com',
        'https://papi.palominorp.com',
        'https://pal-os.palominorp.com',
        'https://auth.palominorp.com',
    ],
    credentials: true,
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// Set up session
app.use(session({
    secret: 'zZdaAFVFMbqC32Q01P16L9Fr',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        // sameSite: 'None' // important for cross-site cookies
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// const sequelize = require('./src/services/db');

// Initialize and use web client routes
const { initializeRouter: initializeWebClientRouter } = require('./src/routes/webclient');
const webClientRouter = initializeWebClientRouter({
    secretKey: SECRET_KEY,
    host: HOST,
    steamApiKey: STEAM_API_KEY,
    allowedRedirectDomains: [
        'http://localhost:3000',
        'http://localhost:3030',
        'https://papi.palominorp.com',
        'https://pal-os.palomino.gg',
        'https://auth.palominorp.com',
    ]
});
app.use('/webclient', webClientRouter);

const { initializeRouter: initializePlayerRouter } = require('./src/routes/player');
const playerRouter = initializePlayerRouter({
    secretKey: SECRET_KEY,
    host: HOST
});
app.use('/player', playerRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));