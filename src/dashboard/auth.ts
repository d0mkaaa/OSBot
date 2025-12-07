import passport from 'passport';
import { Strategy as DiscordStrategy, Profile } from 'passport-discord';
import { env } from '../config/environment.js';

export function setupAuth(client: any) {
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  passport.use(new DiscordStrategy({
    clientID: env.clientId!,
    clientSecret: env.oauth2ClientSecret!,
    callbackURL: `${env.dashboardUrl}/auth/callback`,
    scope: ['identify', 'guilds']
  }, (accessToken: string, refreshToken: string, profile: Profile, done: any) => {
    const userData = {
      id: profile.id,
      username: profile.username,
      discriminator: profile.discriminator,
      avatar: profile.avatar,
      guilds: profile.guilds || [],
      accessToken
    };
    return done(null, userData);
  }));

  return passport;
}
