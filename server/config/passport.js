const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { addUser, findUserByEmail, findUserById } = require('../state');


passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {

                let user = await findUserByEmail(profile.emails[0].value);

                if (!user) {

                    user = await addUser({
                        email: profile.emails[0].value,
                        name: profile.displayName,
                        avatar: profile.photos[0]?.value || 'https://i.pravatar.cc/150?img=5',
                        googleId: profile.id,
                        password: null,
                    });
                }

                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);


passport.serializeUser((user, done) => {
    done(null, user.id);
});


passport.deserializeUser(async (id, done) => {
    try {
        const user = await findUserById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
