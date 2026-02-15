const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { addUser, findUserByEmail, findUserById } = require('../state');

// Configure Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists
                let user = await findUserByEmail(profile.emails[0].value);

                if (!user) {
                    // Create new user from Google profile
                    user = await addUser({
                        email: profile.emails[0].value,
                        name: profile.displayName,
                        avatar: profile.photos[0]?.value || 'https://i.pravatar.cc/150?img=5',
                        googleId: profile.id,
                        password: null, // OAuth users don't have passwords
                    });
                }

                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await findUserById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
